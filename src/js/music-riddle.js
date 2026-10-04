"use strict";
(function () {
    const root = document.querySelector('[data-echo-game]');
    const payload = document.getElementById('echo-data');
    if (!root || !payload)
        return;
    const data = JSON.parse(payload.textContent), songs = new Map(data.nodes.map(n => [n.id, n]));
    const flowers = ['poppy', 'blue', 'ivory', 'dahlia'];
    const flowerFamily = (song) => flowers.indexOf(song.presentation.flower);
    const key = 'simoncos-' + data.id + '-v1';
    // The tip that a computer shows the clue and the map side by side. CSS decides where it shows (a phone or a narrow screen) and it is
    // in the first paint, so for a first-time visitor nothing below it moves when script runs. Script hides it for a player who closed it
    // before (the one case where the page shifts, once) and arms the close button, which stays invisible until then rather than being a
    // dead control. Reading and writing storage may both fail.
    const tip = document.querySelector('[data-device-hint]');
    if (tip) {
        const tipKey = key + '-computer-tip';
        let closed = false;
        try {
            closed = localStorage.getItem(tipKey) === 'closed';
        }
        catch { }
        if (closed)
            tip.hidden = true;
        else {
            tip.classList.add('is-armed');
            tip.querySelector('[data-hint-dismiss]').addEventListener('click', () => {
                tip.hidden = true;
                try {
                    localStorage.setItem(tipKey, 'closed');
                }
                catch { }
                // The button that held focus is gone: hand focus to the clue instead of dropping it to the page.
                document.getElementById('echo-song')?.focus({ preventScroll: true });
            });
        }
    }
    const t = (en, zh) => window.SITE_SHELL?.lang === 'zh' ? zh : en;
    const norm = (value) => value.normalize('NFKC').toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g, '');
    const fresh = () => ({ current: data.start, found: [data.start], edges: [], history: [] });
    let trail = fresh(), storage = true, zoomed = false;
    try {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        if (saved && typeof saved === 'object' && Array.isArray(saved.found) && Array.isArray(saved.edges) && Array.isArray(saved.history)) {
            // Node discoveries survive author revisions to the routes. New songs stay undiscovered.
            const validEdges = saved.edges.filter((e) => typeof e === 'string' && data.nodes.some(n => n.next.some(id => e === n.id + ':' + id)));
            trail.found = [data.start, ...saved.found.filter((id) => typeof id === 'string' && id !== data.start && id !== data.bonus && songs.has(id))];
            trail.found = [...new Set(trail.found)];
            trail.edges = validEdges.filter((e) => e.split(':').every(id => trail.found.includes(id)));
            syncBonus();
            trail.current = trail.found.includes(saved.current) ? saved.current : data.start;
            trail.history = saved.history.filter((id) => typeof id === 'string' && trail.found.includes(id)).slice(-100);
        }
    }
    catch {
        try {
            localStorage.removeItem(key);
        }
        catch {
            storage = false;
        }
    }
    const input = document.querySelector('#echo-answer');
    input.setAttribute('aria-describedby', 'echo-feedback');
    const feedback = document.getElementById('echo-feedback');
    const announcer = document.getElementById('echo-announce');
    const form = document.getElementById('echo-form');
    const hint = document.getElementById('echo-hint');
    const reveal = document.getElementById('echo-reveal');
    const compact = window.matchMedia('(max-width: 900px)');
    const cluePanel = root.querySelector('.echo-clue-panel');
    const mapPanel = root.querySelector('.echo-map-panel');
    const mapDialog = document.getElementById('echo-map-dialog');
    const mapButton = root.querySelector('[data-open-map]');
    const neighborhood = root.querySelector('[data-neighborhood]');
    const pathButton = root.querySelector('[data-path-play]');
    const pathBeads = root.querySelector('[data-path-beads]');
    const pathCaption = root.querySelector('[data-path-caption]');
    const finaleButton = root.querySelector('[data-finale-play]');
    const finaleBar = root.querySelector('[data-finale-bar]');
    const finaleCaption = root.querySelector('[data-finale-caption]');
    const scoreStatus = document.getElementById('echo-score-status');
    let mapSelection = false;
    let playing = null;
    let screenLock = null;
    let finaleTimer;
    let misses = 0, feedbackSong = '';
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let mapPagePosition = null;
    function pagePosition() { return { x: window.scrollX, y: window.scrollY }; }
    function restorePage(position) {
        window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
        // Native dialog focus restoration and scroll anchoring can happen after layout.
        window.requestAnimationFrame(() => window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' }));
    }
    function closeMap() { if (mapDialog.open)
        mapDialog.close(); }
    mapDialog.addEventListener('close', () => {
        document.documentElement.classList.remove('echo-map-open');
        // The finale is a show for the map; leaving the map ends it.
        if (playing?.kind === 'finale')
            silence();
        if (compact.matches)
            (mapSelection ? document.getElementById('echo-song') : mapButton).focus({ preventScroll: true });
        if (compact.matches && mapPagePosition)
            restorePage(mapPagePosition);
        mapPagePosition = null;
        mapSelection = false;
    });
    root.querySelector('[data-close-map]').addEventListener('click', closeMap);
    function openMap() {
        zoomed = false;
        render();
        mapSelection = false;
        mapPagePosition = pagePosition();
        mapDialog.showModal();
        document.documentElement.classList.add('echo-map-open');
    }
    mapButton.addEventListener('click', openMap);
    function syncMapLayout() {
        closeMap();
        if (compact.matches)
            mapDialog.append(mapPanel);
        else
            cluePanel.after(mapPanel);
    }
    // Full screen: the clue and the map fill one screen (2026-10-04: the card is 914 px tall, more than a laptop's browser shows).
    // The class carries the layout, so it also works where the Fullscreen API is missing (iPhone Safari): there the card covers the
    // page and the browser bar stays. A phone already has the map dialog, so the button lives on the desktop map panel only.
    const fullscreenButton = root.querySelector('[data-fullscreen]');
    const isFullscreen = () => root.classList.contains('is-fullscreen');
    function setFullscreen(on) {
        if (on === isFullscreen())
            return;
        root.classList.toggle('is-fullscreen', on);
        document.documentElement.classList.toggle('echo-fullscreen-open', on);
        render();
        centerCurrentFlower();
    }
    fullscreenButton.addEventListener('click', () => {
        if (isFullscreen()) {
            if (document.fullscreenElement)
                void document.exitFullscreen().catch(() => { });
            setFullscreen(false);
            return;
        }
        setFullscreen(true);
        if (root.requestFullscreen)
            void root.requestFullscreen({ navigationUI: 'hide' }).catch(() => { });
    });
    // Esc in real full screen belongs to the browser: it leaves full screen, and the layout follows.
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement)
        setFullscreen(false); });
    compact.addEventListener('change', () => { if (compact.matches) {
        if (document.fullscreenElement)
            void document.exitFullscreen().catch(() => { });
        setFullscreen(false);
    } syncMapLayout(); render(); centerCurrentFlower(); });
    syncMapLayout();
    let notice = () => '';
    let feedbackKind = '';
    const soundKey = key + '-sound';
    let soundEnabled = true, soundStatus = 'ready';
    try {
        soundEnabled = localStorage.getItem(soundKey) !== 'off';
    }
    catch { }
    // echo-piano.js is a separate file. If it fails to load the riddle still runs, in silence, and the sound control says so.
    const piano = typeof EchoPiano === 'undefined' ? null : new EchoPiano.Player(status => { soundStatus = status; renderSound(); });
    if (!piano)
        soundStatus = 'unavailable';
    function preparePiano() { if (piano && soundEnabled && !document.hidden)
        void piano.prepare(); }
    function renderSound() {
        const button = root.querySelector('[data-sound]');
        button.disabled = soundStatus === 'unavailable';
        button.dataset.state = soundStatus === 'unavailable' ? 'unavailable' : !soundEnabled ? 'off' : soundStatus === 'loading' ? 'loading' : soundStatus === 'failed' ? 'failed' : 'on';
        button.setAttribute('aria-pressed', String(soundEnabled && soundStatus !== 'unavailable' && soundStatus !== 'failed'));
        button.setAttribute('aria-busy', String(soundStatus === 'loading'));
        root.querySelector('[data-sound-label]').textContent = soundStatus === 'unavailable' ? t('Sound unavailable', '音效不可用') : !soundEnabled ? t('Sound off', '音效：关') : soundStatus === 'loading' ? t('Loading piano…', '加载钢琴…') : soundStatus === 'failed' ? t('Retry sound', '重试音效') : t('Sound on', '音效：开');
        button.title = t('A piano chord when you discover or select a song', '发现或点击已点亮的歌曲时，播放钢琴和弦');
        const replay = root.querySelector('[data-replay]');
        replay.disabled = !soundEnabled || soundStatus === 'unavailable';
        renderScore();
    }
    function playChord(id) {
        if (!soundEnabled)
            return;
        const song = songs.get(id);
        if (!song || !piano)
            return;
        void piano.play(song.presentation.chord.midi);
        // A running score ends through its onEnd hook; one still loading has none yet.
        if (playing)
            finishScore(playing, false);
    }
    // When the keyboard opens the browser scrolls the field only just into view, under the song bar; set it right above the
    // keyboard instead, so the clue stays readable while typing. The keyboard opens in steps (680, 394, 330 px on a real phone),
    // so every shrink counts once the view is a keyboard shorter than its tallest (the toolbar alone is about 56 px); closing
    // the keyboard leaves the page where it is.
    let viewHeight = window.innerHeight, tallest = viewHeight;
    window.addEventListener('resize', () => {
        const shrank = window.innerHeight < viewHeight;
        viewHeight = window.innerHeight;
        tallest = Math.max(tallest, viewHeight);
        if (!shrank || tallest - viewHeight < 150 || !compact.matches || document.activeElement !== input)
            return;
        window.requestAnimationFrame(() => window.scrollBy({ top: input.getBoundingClientRect().bottom - (window.innerHeight - 12), behavior: 'instant' }));
    });
    function focusClue() {
        document.getElementById('echo-song').focus({ preventScroll: true });
    }
    // On a phone the field sits below the clue, so after an answer the new clue is above the fold (seen on a real phone: the
    // title in the sticky bar changed, the clue did not appear). Once the reward chip has been seen, glide up to it. A touch or
    // wheel before that means the player is already steering, so leave the page alone; one during the glide stops it on the
    // spot (on a real phone the running glide swallowed the swipe: 14 px of an intended 150).
    function bringClueIntoView() {
        let steered = false, gliding = false;
        const release = () => { window.removeEventListener('touchstart', steer); window.removeEventListener('wheel', steer); };
        function steer() {
            steered = true;
            if (gliding)
                window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
            release();
        }
        window.addEventListener('touchstart', steer, { passive: true });
        window.addEventListener('wheel', steer, { passive: true });
        window.setTimeout(() => {
            const heading = document.getElementById('echo-song'), top = heading.getBoundingClientRect().top;
            if (steered || (top >= (parseFloat(getComputedStyle(heading).scrollMarginTop) || 0) - 4 && top < window.innerHeight * .5)) {
                release();
                return;
            }
            gliding = true;
            heading.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
            window.setTimeout(release, 900);
        }, 500);
    }
    // After a correct answer a desktop player is mid-typing: stay in the field (an IME cannot be handed over from a heading).
    // A touch player should see the new clue, so the heading takes focus, the on-screen keyboard closes and the page glides up.
    function focusAfterAnswer() {
        if (finePointer.matches && !form.hidden) {
            input.focus({ preventScroll: true });
            return;
        }
        focusClue();
        bringClueIntoView();
    }
    // One ring of light per chord: the node on the map and the flower beside the clue answer the sound together.
    function ring(id, flower = true) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        const targets = [root.querySelector(`[data-node="${id}"]`), flower ? root.querySelector('[data-clue-flower]') : null, root.querySelector('[data-keys]')];
        for (const target of targets) {
            if (!target)
                continue;
            target.classList.remove('is-ringing');
            void target.getBoundingClientRect();
            target.classList.add('is-ringing');
        }
        window.clearTimeout(ringTimer);
        ringTimer = window.setTimeout(() => root.querySelectorAll('.is-ringing').forEach(node => node.classList.remove('is-ringing')), 1900);
    }
    let ringTimer;
    function centerCurrentFlower() {
        if (!zoomed || (compact.matches && !mapDialog.open))
            return;
        const stage = root.querySelector('.echo-map-stage');
        const current = root.querySelector('.echo-node.is-current .echo-hit').getBoundingClientRect(), box = stage.getBoundingClientRect();
        const visibleTop = Math.max(box.top, 0);
        const visibleBottom = Math.min(box.bottom, window.innerHeight);
        const centerY = visibleBottom - visibleTop > 100 ? (visibleTop + visibleBottom) / 2 : box.top + stage.clientHeight / 2;
        stage.scrollLeft += current.left + current.width / 2 - box.left - stage.clientWidth / 2;
        stage.scrollTop += current.top + current.height / 2 - centerY;
    }
    function syncBonus() {
        if (!data.bonus)
            return false;
        const complete = data.nodes.filter(n => n.id !== data.bonus).every(n => trail.found.includes(n.id));
        if (complete && !trail.found.includes(data.bonus)) {
            trail.found.push(data.bonus);
            return true;
        }
        return false;
    }
    function save() { try {
        localStorage.setItem(key, JSON.stringify(trail));
    }
    catch {
        storage = false;
    } }
    let arrivalTimer;
    function clearArrival() {
        window.clearTimeout(arrivalTimer);
        root.classList.remove('is-loop-arrival', 'is-ending-arrival', 'is-song-arrival');
        root.querySelectorAll('.is-new').forEach(node => node.classList.remove('is-new'));
        if (!playing)
            root.querySelector('[data-travel-glow]').removeAttribute('d');
    }
    function animateArrival(kind, previous, id, isNew, bonus) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        const path = Array.from(root.querySelectorAll('[data-from]')).find(edge => edge.dataset.from === previous && edge.dataset.to === id);
        if (path)
            root.querySelector('[data-travel-glow]').setAttribute('d', path.getAttribute('d'));
        root.querySelectorAll('[data-node]').forEach(node => {
            if ((isNew && node.dataset.node === id) || (bonus && node.dataset.node === data.bonus))
                node.classList.add('is-new');
        });
        // Restart the path sweep even when consecutive answers use the same arrival style.
        void root.offsetWidth;
        root.classList.add('is-' + kind + '-arrival');
        arrivalTimer = window.setTimeout(clearArrival, 2800);
    }
    function visit(id, remember = true, center = true, preservePage = true) {
        if (!trail.found.includes(id))
            return;
        const position = compact.matches && preservePage ? pagePosition() : null;
        window.clearTimeout(finaleTimer);
        playChord(id);
        clearArrival();
        misses = 0;
        if (remember && trail.current !== id)
            trail.history.push(trail.current);
        trail.history = trail.history.slice(-100);
        trail.current = id;
        input.value = '';
        notice = () => '';
        feedbackKind = '';
        hint.open = false;
        reveal.open = false;
        save();
        render();
        if (center)
            centerCurrentFlower();
        ring(id);
        if (position)
            restorePage(position);
    }
    function solve(id) {
        const previous = songs.get(trail.current);
        if (!previous.next.includes(id))
            return;
        const edge = previous.id + ':' + id;
        if (!trail.edges.includes(edge))
            trail.edges.push(edge);
        const isNew = !trail.found.includes(id);
        if (isNew)
            trail.found.push(id);
        const unlocked = syncBonus();
        visit(id);
        const arrival = id === data.ending ? 'ending' : id === data.start && previous.id !== data.start ? 'loop' : null;
        const lit = trail.found.filter(song => song !== data.bonus).length, total = data.nodes.length - (data.bonus ? 1 : 0);
        const finaleSoon = unlocked && soundEnabled && !!data.finale;
        notice = () => unlocked ? (finaleSoon ? t('Every song is lit. A hidden echo has appeared beside the ending, and the finale is about to begin.', '所有歌曲都已点亮。终点旁出现了一段隐藏的回响，终章即将奏响。') : t('Every song is lit. A hidden echo has appeared beside the ending.', '所有歌曲都已点亮。终点旁出现了一段隐藏的回响。')) : arrival === 'loop' ? t('Back to the beginning. Your trail remains.', '又回到最初。走过的路还在。') : t('Found: ', '找到了：') + songs.get(id).title + (id === data.ending ? t(' · The ending.', ' · 终点。') : isNew ? ` · ${lit} / ${total}` : '');
        feedbackKind = 'success';
        feedbackSong = id;
        render();
        animateArrival(arrival || 'song', previous.id, id, isNew, unlocked);
        // The last song's own chord rings out and the arrival settles (2.8 s); then the arranged piece begins, once, as the collection completes.
        if (finaleSoon)
            finaleTimer = window.setTimeout(() => startFinale(), 2900);
        focusAfterAnswer();
        // Focus stays in the field on a desktop, so say the new clue aloud; a touch player's focus lands on the heading instead.
        if (finePointer.matches && !form.hidden) {
            announcer.textContent = '';
            window.setTimeout(() => { announcer.textContent = t(songs.get(id).clue.en, songs.get(id).clue.zh); }, 60);
        }
    }
    function acknowledgeOpen(answer) {
        notice = () => t(`You found ${answer.title}. Its next clue is still blank; explore another branch for now.`, `接上了《${answer.title}》。后续谜面暂空，可以先探索其他分支。`);
        input.value = '';
        feedbackKind = 'success';
        render();
    }
    function renderNeighborhood(song) {
        const ns = 'http://www.w3.org/2000/svg';
        const element = (tag, attrs, text) => {
            const node = document.createElementNS(ns, tag);
            for (const [name, value] of Object.entries(attrs))
                node.setAttribute(name, value);
            if (text !== undefined)
                node.textContent = text;
            return node;
        };
        neighborhood.replaceChildren();
        const defs = element('defs', {});
        for (const side of ['in', 'out']) {
            const marker = element('marker', { id: 'echo-local-arrow-' + side, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto', markerUnits: 'userSpaceOnUse' });
            marker.append(element('path', { d: 'M0 0 L10 5 L0 10 L2 5 Z', class: 'echo-focus-arrow-' + side }));
            defs.append(marker);
        }
        neighborhood.append(defs);
        const incoming = data.nodes.filter(n => trail.edges.includes(n.id + ':' + song.id)).map(n => n.id);
        if (song.id === data.bonus)
            incoming.push(data.ending);
        const outgoing = [...song.next];
        if (song.id === data.ending && data.bonus && trail.found.includes(data.bonus))
            outgoing.push(data.bonus);
        for (const [side, ids] of [['in', incoming], ['out', outgoing]]) {
            const x = side === 'in' ? 42 : 318;
            if (ids.length)
                neighborhood.append(element('text', { x: String(x), y: String(Math.max(16, 115 - (ids.length - 1) * 32 - 50)), 'text-anchor': 'middle', class: 'echo-focus-caption' }, side === 'in' ? t('FROM', '来路') : t('ONWARD', '出路')));
            ids.forEach((id, i) => {
                const next = songs.get(id), found = trail.found.includes(id);
                const y = 115 + (i - (ids.length - 1) / 2) * 64;
                const path = side === 'in' ? `M72 ${y} C105 ${y} 107 115 124 115` : `M236 115 C253 115 254 ${y} 286 ${y}`;
                neighborhood.append(element('path', { d: path, class: 'echo-focus-edge echo-focus-edge-' + side + (!found ? ' is-pending' : ''), 'marker-end': 'url(#echo-local-arrow-' + side + ')' }));
                const group = element('g', { 'data-focus-node': id, 'data-focus-side': side, class: 'echo-focus-node bloom-' + flowerFamily(next) + (found ? ' is-found' : ''), transform: `translate(${x} ${y})` });
                group.append(element('circle', { r: '32', class: 'echo-focus-hit' }));
                if (found) {
                    group.setAttribute('role', 'button');
                    group.setAttribute('tabindex', '0');
                    group.setAttribute('aria-label', (side === 'in' ? t('Back to ', '回到') : t('Continue to ', '继续到')) + next.title);
                    group.append(element('image', { href: 'assets/echo-flower-' + next.presentation.flower + '.webp', x: '-20', y: '-20', width: '40', height: '40' }));
                }
                else {
                    group.setAttribute('aria-label', t('Song still to discover', '尚未接上的歌曲'));
                    group.append(element('circle', { r: '15', class: 'echo-focus-unknown' }), element('text', { 'text-anchor': 'middle', y: '6', class: 'echo-focus-question' }, '?'));
                }
                const foreign = element('foreignObject', { x: '-42', y: '22', width: '84', height: '42' });
                const label = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
                label.className = 'echo-focus-label';
                label.textContent = found ? next.title : t('Not found', '未接上');
                foreign.append(label);
                group.append(foreign);
                neighborhood.append(group);
            });
        }
        if (!outgoing.length)
            neighborhood.append(element('text', { x: '318', y: '120', 'text-anchor': 'middle', class: 'echo-focus-caption' }, song.id === data.ending ? t('ENDING', '终点') : t('END OF PATH', '支线尽头')));
    }
    // The keyboard spans the chord range (C3-C5). The current chord is lit in the song's colour; keys that other found songs
    // have used keep a faint warm trace, so the keyboard slowly fills with the harmony the player has gathered.
    function renderKeys(song) {
        const keys = root.querySelector('[data-keys]');
        const chord = new Set(song.presentation.chord.midi), heard = new Map();
        for (const id of trail.found)
            if (id !== song.id)
                for (const note of songs.get(id).presentation.chord.midi)
                    heard.set(note, (heard.get(note) || 0) + 1);
        keys.classList.remove(...flowers.map((_, i) => 'bloom-' + i));
        keys.classList.add('bloom-' + flowerFamily(song));
        keys.querySelectorAll('[data-midi]').forEach(key => {
            const note = Number(key.dataset.midi);
            key.classList.toggle('is-chord', chord.has(note));
            key.style.setProperty('--heat', String(Math.min(1, (heard.get(note) || 0) / 6).toFixed(2)));
        });
    }
    // Scores: the path the player has walked, and the finale. The audio is scheduled ahead by EchoPiano; the code below only dresses it.
    // Whatever is sounding lights up on the map, the keyboard and the path row, and everything returns to the current song when a
    // score ends or is cut short. Every way of stopping goes through silence(), so lighting is never left behind.
    const midiOf = (id) => songs.get(id).presentation.chord.midi;
    const songCount = data.nodes.length - (data.bonus ? 1 : 0);
    const finaleStatus = finaleBar.querySelector('[data-finale-status]');
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let beadsFor = '';
    // echo-score.js is a separate file too. Without it there is no path row and no finale; the riddle itself still runs.
    const scoring = typeof EchoScore !== 'undefined';
    function walkedRoute() { if (!scoring)
        return []; return EchoScore.route(trail.edges, data.start, trail.current, data.ending, data.bonus); }
    function finaleReady() { return scoring && !!data.finale && !!data.bonus && trail.found.includes(data.bonus); }
    // A fresh write each time, so a repeated message is announced again.
    function say(region, text) { region.textContent = ''; window.setTimeout(() => { region.textContent = text; }, 60); }
    function placeSpotlight(id) {
        const spot = root.querySelector('[data-spotlight]'), at = songs.get(id).position;
        spot.style.transform = `translate(${at[0]}px,${at[1]}px)`;
    }
    // The path the player solved between two songs answers the chord that arrives along it. A short phrase sends a pulse of light along
    // the path; the finale (a jump has no path, and is skipped) lights the thread itself and lets it fade, because forty-odd pulses with
    // glow filters over a 46-second piece cost frames on a slow phone.
    function travel(from, to, pulse) {
        const glow = root.querySelector('[data-travel-glow]');
        glow.classList.remove('is-traveling');
        root.querySelectorAll('.echo-route.is-lit').forEach(route => route.classList.remove('is-lit'));
        if (!from)
            return;
        const edge = Array.from(root.querySelectorAll('[data-from]')).find(path => path.dataset.from === from && path.dataset.to === to);
        if (!edge)
            return;
        if (!pulse) {
            edge.parentElement.classList.add('is-lit');
            return;
        }
        if (reducedMotion())
            return;
        glow.setAttribute('d', edge.getAttribute('d'));
        void glow.getBoundingClientRect();
        glow.classList.add('is-traveling');
    }
    // The finale is a show for the map: a phone opens the full-network dialog for it, a desktop brings the map into view.
    function showMap() {
        if (compact.matches) {
            if (!mapDialog.open)
                openMap();
            return;
        }
        if (zoomed) {
            zoomed = false;
            render();
        }
        const bar = finaleBar.getBoundingClientRect(), stage = root.querySelector('.echo-map-stage').getBoundingClientRect();
        const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h')) || 76;
        if (!isFullscreen() && (bar.top < header || stage.bottom > window.innerHeight))
            finaleBar.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
    function light(run, index) {
        const id = run.ids[index];
        run.lit = id;
        root.querySelectorAll('.is-sounding').forEach(element => element.classList.remove('is-sounding'));
        root.querySelector(`[data-node="${id}"]`)?.classList.add('is-sounding');
        root.querySelector(`[data-aura="${id}"]`)?.classList.add('is-sounding');
        placeSpotlight(id);
        renderKeys(songs.get(id));
        ring(id, false);
        travel(index ? run.ids[index - 1] : '', id, run.kind === 'path');
        const title = songs.get(id).title;
        if (run.kind === 'path') {
            pathBeads.querySelectorAll('li').forEach((bead, i) => { bead.classList.toggle('is-lit', i === index); bead.classList.toggle('is-played', i < index); });
            pathCaption.textContent = title;
        }
        else {
            finaleCaption.textContent = title;
            // The hidden echo closes the piece: it blooms as its soft chord sounds.
            if (index === run.ids.length - 1) {
                root.querySelector(`[data-node="${id}"]`)?.classList.add('is-new');
                root.classList.add('is-finale-bloom');
            }
        }
    }
    // Audio is scheduled; the first chord follows after the lead.
    function enter(run) {
        run.started = true;
        if (run.kind === 'finale') {
            showMap();
            root.classList.add('is-finale');
            finaleBar.style.setProperty('--run', run.seconds.toFixed(1) + 's');
            finaleBar.style.setProperty('--lead', (run.lead + .08).toFixed(2) + 's');
            say(finaleStatus, t('The finale begins. Press Escape to stop.', '终章开始。按 Esc 可停止。'));
        }
        else
            say(scoreStatus, t(`Playing the path: ${run.ids.length} songs.`, `播放这条路径：${run.ids.length} 首歌。`));
        renderScore();
    }
    function finishScore(run, finished) {
        if (playing !== run)
            return;
        playing = null;
        if (run.kind === 'finale')
            releaseScreen();
        root.classList.remove('is-finale', 'is-finale-bloom');
        root.querySelectorAll('.is-sounding').forEach(element => element.classList.remove('is-sounding'));
        root.querySelector('.echo-node.is-new')?.classList.remove('is-new');
        const glow = root.querySelector('[data-travel-glow]');
        glow.classList.remove('is-traveling');
        glow.removeAttribute('d');
        root.querySelectorAll('.echo-route.is-lit').forEach(route => route.classList.remove('is-lit'));
        pathBeads.querySelectorAll('li').forEach(bead => bead.classList.remove('is-lit', 'is-played'));
        // The map's lantern and the keyboard go back to the song the player is in.
        placeSpotlight(trail.current);
        renderKeys(songs.get(trail.current));
        renderScore();
        if (finished)
            say(run.kind === 'finale' ? finaleStatus : scoreStatus, run.kind === 'finale' ? t('The finale has ended.', '终章播放完毕。') : t('Path finished.', '路径播放完毕。'));
    }
    function silence() {
        const run = playing;
        piano?.stop();
        if (run)
            finishScore(run, false);
    }
    /**
     * The finale outlasts a phone's auto-lock, which would cut the sound mid-phrase, so the screen is kept awake while it plays.
     * Quietly does nothing where the browser lacks the API or refuses the request.
     */
    function holdScreen(run) {
        if (!navigator.wakeLock)
            return;
        navigator.wakeLock.request('screen').then(lock => {
            // The finale may have ended, or been replaced, while the request was pending.
            if (playing !== run || screenLock) {
                void lock.release().catch(() => { });
                return;
            }
            screenLock = lock;
            lock.addEventListener('release', () => { if (screenLock === lock)
                screenLock = null; });
        }).catch(() => { });
    }
    function releaseScreen() {
        const lock = screenLock;
        screenLock = null;
        if (lock)
            void lock.release().catch(() => { });
    }
    function begin(kind, ids, steps, lead) {
        window.clearTimeout(finaleTimer);
        if (!piano || !scoring)
            return;
        if (playing)
            finishScore(playing, false);
        const run = { kind, ids, started: false, lit: '', lead, seconds: EchoScore.length(steps) };
        playing = run;
        if (kind === 'finale')
            holdScreen(run);
        renderScore();
        void piano.playScore(steps, {
            onStart: () => { if (playing === run)
                enter(run); },
            onStep: index => { if (playing === run)
                light(run, index); },
            onEnd: finished => finishScore(run, finished)
        }, { lead }).then(() => finishScore(run, false));
    }
    function startFinale(lead = .7) {
        window.clearTimeout(finaleTimer);
        if (!finaleReady() || !soundEnabled || soundStatus === 'unavailable' || document.hidden)
            return;
        begin('finale', data.finale.steps.map(step => step.node), EchoScore.finaleSteps(data.finale, midiOf), lead);
    }
    function renderScore() {
        const canPlay = soundEnabled && soundStatus !== 'unavailable';
        const path = playing?.kind === 'path' ? playing : null, finale = playing?.kind === 'finale' ? playing : null;
        const route = path ? path.ids : walkedRoute(), row = pathBeads.parentElement;
        row.hidden = route.length < 2;
        if (route.length > 1) {
            const key = route.join('>');
            if (key !== beadsFor) {
                beadsFor = key;
                pathBeads.replaceChildren(...route.map(id => { const bead = document.createElement('li'); bead.className = 'bloom-' + flowerFamily(songs.get(id)); return bead; }));
            }
            const seconds = Math.max(1, Math.round(EchoScore.length(EchoScore.pathSteps(route, midiOf))));
            row.dataset.state = path ? 'playing' : 'idle';
            pathButton.disabled = !path && !canPlay;
            root.querySelector('[data-path-icon]').textContent = path ? '■' : '▶';
            root.querySelector('[data-path-label]').textContent = path ? t('Stop', '停止') : t('Play this path', '回响这条路');
            pathCaption.textContent = path ? (path.started ? songs.get(path.lit || route[0]).title : t('Loading piano…', '加载钢琴…')) : !canPlay ? t('Turn sound on to play', '打开音效后可播放') : t(`${route.length} songs · about ${seconds} s`, `${route.length} 首 · 约 ${seconds} 秒`);
        }
        finaleBar.hidden = !finaleReady();
        if (finaleReady()) {
            finaleBar.classList.toggle('is-playing', !!finale);
            finaleBar.classList.toggle('is-running', !!finale?.started);
            finaleButton.disabled = !finale && !canPlay;
            finaleBar.querySelector('[data-finale-icon]').textContent = finale ? '■' : '▶';
            finaleBar.querySelector('[data-finale-label]').textContent = finale ? t('Stop', '停止') : t('Play the finale', '播放终章');
            finaleCaption.textContent = finale ? (finale.started ? songs.get(finale.lit || finale.ids[0]).title : t('Loading piano…', '加载钢琴…')) : !canPlay ? t('Turn sound on to play the finale', '打开音效后可播放终章') : t(`Finale · all ${songCount} songs as one piece`, `终章 · ${songCount} 首歌，编成一段和弦曲`);
        }
    }
    pathButton.addEventListener('click', () => {
        if (playing?.kind === 'path') {
            silence();
            return;
        }
        const ids = walkedRoute();
        if (ids.length > 1 && soundEnabled)
            begin('path', ids, EchoScore.pathSteps(ids, midiOf), 0);
    });
    finaleButton.addEventListener('click', () => {
        if (playing?.kind === 'finale') {
            silence();
            return;
        }
        startFinale();
    });
    function followNeighbor(target) {
        const node = target.closest('[data-focus-node]');
        if (!node || !trail.found.includes(node.dataset.focusNode))
            return;
        const id = node.dataset.focusNode;
        if (node.dataset.focusSide === 'out' && songs.get(trail.current).next.includes(id))
            solve(id);
        else {
            visit(id);
            focusClue();
        }
    }
    neighborhood.addEventListener('click', event => followNeighbor(event.target));
    neighborhood.addEventListener('keydown', event => {
        if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            followNeighbor(event.target);
        }
    });
    function render() {
        const song = songs.get(trail.current), ending = song.id === data.ending, deadEnd = song.terminal === 'dead-end', epilogue = song.id === data.bonus;
        const heading = document.getElementById('echo-song');
        heading.textContent = song.title;
        heading.tabIndex = -1;
        root.querySelector('[data-now-label]').textContent = compact.matches ? song.title : t('NOW ECHOING', '正在回响');
        const family = flowerFamily(song);
        const emblem = root.querySelector('[data-clue-flower]');
        emblem.classList.remove(...flowers.map((_, i) => 'bloom-' + i));
        emblem.classList.add('bloom-' + family);
        // The song's own colour tints its page: the clue column, the answer chip and, below, the map's lantern.
        cluePanel.classList.remove(...flowers.map((_, i) => 'bloom-' + i));
        cluePanel.classList.add('bloom-' + family);
        root.querySelector('[data-clue-art]').src = 'assets/echo-flower-' + song.presentation.flower + '.webp';
        const quote = document.getElementById('echo-quote');
        const quotedClue = song.clue_format === 'quote';
        const quoteText = quotedClue ? t(song.clue.en, song.clue.zh) : song.quote;
        // Chinese lyric phrases get deliberate line breaks; translations wrap naturally.
        quote.replaceChildren(...(quoteText?.match(/[^，]+，?/g) || []).map(line => { const span = document.createElement('span'); span.textContent = line; return span; }));
        quote.hidden = !quoteText;
        quote.lang = quotedClue ? t('en', 'zh-Hans') : 'zh-Hans';
        const clue = document.getElementById('echo-clue');
        clue.textContent = t(song.clue.en, song.clue.zh);
        clue.hidden = quotedClue;
        renderNeighborhood(song);
        renderKeys(playing?.lit ? songs.get(playing.lit) : song);
        const remaining = song.next.filter(id => !trail.edges.includes(song.id + ':' + id)).length;
        const total = song.next.length, explored = total - remaining;
        let branch = epilogue ? t('A HIDDEN ECHO · THANK YOU FOR LISTENING', '隐藏回响 · 谢谢你听到这里') : deadEnd ? t('DEAD END · EXPLORE ANOTHER BRANCH', '死胡同 · 换一条路继续') : ending ? t('ENDING FOUND', '已抵达终点') : total ?
            (remaining ? t(`${total} outgoing ${total === 1 ? 'path' : 'paths'} · ${explored} explored`, `下一步 ${total} 条 · 已走通 ${explored} 条`) : t(`${total} outgoing ${total === 1 ? 'path' : 'paths'} · all explored`, `下一步 ${total} 条 · 已全部走通`)) :
            t('Guess this side branch, then return to another song.', '猜猜这条支线，再回到其他歌继续。');
        if (song.open_answers?.length)
            branch += '\n' + t(`${song.open_answers.length} answer has no next clue yet`, `另有 ${song.open_answers.length} 个答案，后续暂空`);
        document.getElementById('echo-branch').textContent = branch;
        // One pip per outgoing path, lit once walked: the exits of this song at a glance.
        document.getElementById('echo-pips').replaceChildren(...song.next.map(id => {
            const pip = document.createElement('i');
            pip.className = trail.edges.includes(song.id + ':' + id) ? 'is-walked' : '';
            return pip;
        }));
        form.hidden = ending || deadEnd || epilogue;
        document.getElementById('echo-dead-end').hidden = !(deadEnd || epilogue);
        document.getElementById('echo-ending').hidden = !ending;
        document.querySelector('.echo-help').hidden = ending || deadEnd || epilogue;
        document.querySelector('[data-back]').disabled = !trail.history.length;
        feedback.textContent = notice();
        feedback.dataset.kind = feedbackKind;
        feedback.classList.remove(...flowers.map((_, i) => 'bloom-' + i));
        if (feedbackKind === 'success' && songs.has(feedbackSong))
            feedback.classList.add('bloom-' + flowerFamily(songs.get(feedbackSong)));
        document.querySelector('#echo-hint summary').classList.toggle('is-nudged', misses >= 2 && !hint.open);
        input.setAttribute('aria-invalid', String(feedbackKind === 'error'));
        renderSound();
        document.getElementById('echo-hint-text').textContent = t(song.hint.en, song.hint.zh);
        const choices = document.getElementById('echo-reveal-choices');
        choices.replaceChildren();
        if (reveal.open) {
            if (song.next.length)
                for (const id of song.next) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = songs.get(id).title + ' →';
                    button.addEventListener('click', () => solve(id));
                    choices.append(button);
                }
            else if (song.dead_ends?.length) {
                const p = document.createElement('p');
                p.textContent = t('This side branch has no further clue here: ', '这条支线在这里没有后续谜面：') + song.dead_ends[0];
                choices.append(p);
            }
            for (const answer of song.open_answers || []) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = answer.title + t(' · next clue pending', ' · 后续待补');
                button.addEventListener('click', () => acknowledgeOpen(answer));
                choices.append(button);
            }
        }
        const list = document.getElementById('echo-song-list');
        list.replaceChildren(...trail.found.map(id => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = songs.get(id).title;
            button.setAttribute('aria-current', String(id === song.id));
            button.className = 'bloom-' + flowerFamily(songs.get(id));
            button.addEventListener('click', () => { visit(id, true, true, false); if (compact.matches)
                cluePanel.scrollIntoView({ block: 'start', behavior: 'instant' }); focusClue(); });
            return button;
        }));
        const foundCount = trail.found.filter(id => id !== data.bonus).length;
        root.querySelector('[data-focus-count]').textContent = t(`${foundCount} / ${data.nodes.length - (data.bonus ? 1 : 0)} songs found`, `${foundCount} / ${data.nodes.length - (data.bonus ? 1 : 0)} 首已点亮`);
        document.getElementById('echo-found-count').textContent = String(foundCount);
        document.getElementById('echo-progress-bar').value = foundCount;
        const bonusUnlocked = !!data.bonus && trail.found.includes(data.bonus);
        document.getElementById('echo-bonus').hidden = !bonusUnlocked;
        root.querySelector('[data-bonus-link]')?.classList.toggle('is-hidden', !bonusUnlocked);
        root.classList.toggle('is-map-zoomed', zoomed);
        const zoomButton = root.querySelector('[data-map-zoom]');
        zoomButton.textContent = zoomed ? t('See full map', '查看全图') : t('Enlarge map', '放大地图');
        zoomButton.setAttribute('aria-pressed', String(zoomed));
        fullscreenButton.setAttribute('aria-pressed', String(isFullscreen()));
        fullscreenButton.querySelector('[data-fullscreen-label]').textContent = isFullscreen() ? t('Exit full screen', '退出全屏') : t('Full screen', '全屏');
        root.querySelector('.echo-map-instruction').textContent = compact.matches ? (zoomed ? t('Scroll to explore · select a lit song to return to its clue', '滑动查看 · 选择已点亮的歌，回到它的线索') : t('Full network · enlarge to explore the details', '完整网络 · 放大查看细节')) : zoomed ? t('Scroll to explore · tap a lit song to select and replay', '滑动查看 · 点已点亮的歌曲，切换并回放') : t('Tap a lit song to select and replay', '点已点亮的歌曲，切换并回放');
        document.getElementById('echo-save-status').textContent = storage ? t('Saved in this browser', '进度已保存在此浏览器') : t('Saving unavailable · progress lasts while this page is open', '无法保存 · 进度仅在此页面打开时保留');
        root.querySelectorAll('[data-node]').forEach(node => {
            const id = node.dataset.node, found = trail.found.includes(id), active = id === song.id;
            node.classList.toggle('is-hidden', id === data.bonus && !bonusUnlocked);
            node.setAttribute('aria-hidden', String(id === data.bonus && !bonusUnlocked));
            const kind = node.querySelector('.echo-node-kind');
            if (kind)
                kind.textContent = id === data.start ? t('START', '起点') : t('ENDING', '终点');
            node.classList.toggle('is-found', found);
            node.classList.toggle('is-current', active);
            node.querySelector('text').textContent = found ? songs.get(id).title : String(data.nodes.findIndex(n => n.id === id) + 1).padStart(2, '0');
            if (found) {
                node.setAttribute('role', 'button');
                node.setAttribute('tabindex', '0');
                node.setAttribute('aria-label', t('Revisit ', '重新打开') + songs.get(id).title);
                node.setAttribute('aria-pressed', String(active));
            }
            else {
                node.removeAttribute('role');
                node.removeAttribute('tabindex');
                node.removeAttribute('aria-label');
                node.removeAttribute('aria-pressed');
            }
        });
        const relatedRoutes = [], walkedRoutes = [];
        root.querySelectorAll('[data-from]').forEach(edge => {
            const found = trail.edges.includes(edge.dataset.from + ':' + edge.dataset.to);
            const outgoing = edge.dataset.from === song.id, incoming = edge.dataset.to === song.id;
            edge.classList.toggle('is-found', found);
            edge.classList.toggle('is-current', found && outgoing);
            edge.classList.toggle('is-next', !found && outgoing);
            edge.classList.toggle('is-incoming', incoming);
            edge.setAttribute('marker-end', 'url(#echo-arrow' + (outgoing ? '-active' : incoming ? '-incoming' : found ? '-walked' : '') + ')');
            const route = edge.parentElement;
            route.querySelector('.echo-edge-glow').classList.toggle('is-found', found);
            const related = outgoing || incoming;
            route.classList.toggle('is-related', related);
            if (related)
                relatedRoutes.push(route);
            else if (found)
                walkedRoutes.push(route);
        });
        // Light gathers where the player has been; the lantern follows the current song.
        root.querySelectorAll('[data-aura]').forEach(aura => aura.classList.toggle('is-found', trail.found.includes(aura.dataset.aura) && (aura.dataset.aura !== data.bonus || bonusUnlocked)));
        // Four steps, not a slope: a new song then re-fades every older aura only when a tier changes.
        const lit = trail.found.length;
        root.style.setProperty('--echo-aura-k', lit <= 22 ? '1' : lit <= 27 ? '.85' : lit <= 32 ? '.72' : '.6');
        placeSpotlight(playing?.lit || trail.current);
        // Ghost routes keep their document order; walked threads rise above them and the current song's paths above both.
        // The aura layer sits over every route, so the haze softly lights the threads it covers.
        relatedRoutes.sort((a, b) => Number(a.querySelector('[data-from]').dataset.from === song.id) - Number(b.querySelector('[data-from]').dataset.from === song.id));
        const layer = root.querySelector('[data-aura-layer]');
        for (const route of [...walkedRoutes, ...relatedRoutes])
            layer.before(route);
    }
    document.getElementById('echo-form').addEventListener('submit', event => {
        event.preventDefault();
        const guess = norm(input.value), song = songs.get(trail.current);
        if (!guess)
            return;
        const answer = song.next.find(id => [songs.get(id).title, ...songs.get(id).aliases].some(answer => norm(answer) === guess));
        if (answer) {
            solve(answer);
            return;
        }
        const openAnswer = song.open_answers?.find(answer => [answer.title, ...answer.aliases].some(value => norm(value) === guess));
        if (openAnswer) {
            acknowledgeOpen(openAnswer);
            return;
        }
        // A near miss (a twin with other lyrics, a better-known song on the same theme) says so instead of the generic error;
        // it is not counted towards the hint nudge and does not shake the field.
        const decoy = song.decoys?.find(item => [item.title, ...item.aliases].some(value => norm(value) === guess));
        if (decoy) {
            notice = () => t(decoy.message.en, decoy.message.zh);
            feedbackKind = 'near';
            render();
            input.select();
            return;
        }
        if (song.dead_ends?.some(n => norm(n) === guess))
            notice = () => t('You found a side branch with no next clue here; revisit another song below.', '你接上了一条支线。这里没有下一条谜面，可以在下方回到其他歌。');
        else {
            misses++;
            notice = () => t('That song doesn’t follow this clue. Try another, or open a hint.', '这首歌没有接上当前线索。可以再试一首，或打开提示。');
        }
        feedbackKind = 'error';
        render();
        input.select();
        const row = input.parentElement;
        row.classList.remove('is-shaking');
        void row.offsetWidth;
        row.classList.add('is-shaking');
    });
    document.querySelector('[data-back]').addEventListener('click', () => { const id = trail.history.pop(); if (id)
        visit(id, false); });
    document.querySelector('[data-open-bonus]').addEventListener('click', () => { if (data.bonus) {
        visit(data.bonus);
        if (compact.matches && mapDialog.open) {
            mapSelection = true;
            closeMap();
        }
        focusClue();
    } });
    document.querySelector('[data-return-branch]').addEventListener('click', () => { const id = trail.history.pop() || data.nodes.find(n => n.next.includes(trail.current))?.id || data.start; visit(id, false); });
    document.querySelector('[data-go-start]').addEventListener('click', () => visit(data.start));
    document.querySelector('[data-reset]').addEventListener('click', () => { window.clearTimeout(finaleTimer); silence(); clearArrival(); trail = fresh(); misses = 0; notice = () => ''; feedbackKind = ''; hint.open = false; reveal.open = false; input.value = ''; document.querySelector('.echo-reset').open = false; save(); render(); });
    hint.addEventListener('toggle', () => { if (hint.open) {
        reveal.open = false;
        hint.querySelector('summary').classList.remove('is-nudged');
    } });
    reveal.addEventListener('toggle', () => { if (reveal.open)
        hint.open = false; render(); });
    root.querySelector('[data-sound]').addEventListener('click', () => {
        soundEnabled = soundStatus === 'failed' ? true : !soundEnabled;
        if (soundEnabled) {
            playChord(trail.current);
            preparePiano();
        }
        else
            silence();
        try {
            localStorage.setItem(soundKey, soundEnabled ? 'on' : 'off');
        }
        catch { }
        renderSound();
    });
    root.querySelector('[data-replay]').addEventListener('click', () => { playChord(trail.current); ring(trail.current); });
    document.addEventListener('visibilitychange', () => { if (document.hidden)
        silence();
    else
        preparePiano(); });
    // Escape stops a score first; with nothing playing it leaves the fallback full screen (the real one is the browser's).
    document.addEventListener('keydown', event => { if (event.key !== 'Escape')
        return; if (playing)
        silence();
    else if (isFullscreen() && !document.fullscreenElement && !mapDialog.open)
        setFullscreen(false); });
    root.querySelector('[data-map-zoom]').addEventListener('click', () => {
        zoomed = !zoomed;
        render();
        centerCurrentFlower();
    });
    root.querySelector('[data-map-locate]').addEventListener('click', () => { zoomed = true; render(); centerCurrentFlower(); });
    root.querySelectorAll('[data-node]').forEach(node => {
        // Selecting a map node never moves the page, the panned map or keyboard focus.
        const select = () => {
            if (!trail.found.includes(node.dataset.node))
                return;
            visit(node.dataset.node, true, false);
            if (compact.matches) {
                mapSelection = true;
                closeMap();
            }
        };
        node.addEventListener('click', select);
        node.addEventListener('keydown', event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            select();
        } });
    });
    window.SITE_SHELL?.onLang?.(render);
    syncBonus();
    save();
    render();
    centerCurrentFlower();
    preparePiano();
})();
