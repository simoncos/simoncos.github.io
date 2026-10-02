"use strict";
(function () {
    const root = document.querySelector('[data-echo-game]');
    const payload = document.getElementById('echo-data');
    if (!root || !payload)
        return;
    const data = JSON.parse(payload.textContent), songs = new Map(data.nodes.map(n => [n.id, n]));
    const key = 'simoncos-' + data.id + '-v1';
    const t = (en, zh) => window.SITE_SHELL?.lang === 'zh' ? zh : en;
    const norm = (value) => value.normalize('NFKC').toLowerCase().replace(/[\s《》「」『』·.,，。!?！？’'"-]/g, '');
    const fresh = () => ({ current: data.start, found: [data.start], edges: [], history: [] });
    let trail = fresh(), storage = true, zoomed = window.matchMedia('(max-width: 650px)').matches;
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
    const form = document.getElementById('echo-form');
    const hint = document.getElementById('echo-hint');
    const reveal = document.getElementById('echo-reveal');
    let notice = () => '';
    let feedbackKind = '';
    const soundKey = key + '-sound';
    let soundEnabled = true, soundStatus = 'ready';
    try {
        soundEnabled = localStorage.getItem(soundKey) !== 'off';
    }
    catch { }
    const piano = new EchoPiano.Player(status => { soundStatus = status; renderSound(); });
    function renderSound() {
        const button = root.querySelector('[data-sound]');
        button.disabled = soundStatus === 'unavailable';
        button.setAttribute('aria-pressed', String(soundEnabled && soundStatus !== 'unavailable' && soundStatus !== 'failed'));
        button.setAttribute('aria-busy', String(soundStatus === 'loading'));
        root.querySelector('[data-sound-label]').textContent = soundStatus === 'unavailable' ? t('Sound unavailable', '音效不可用') : !soundEnabled ? t('Sound off', '音效：关') : soundStatus === 'loading' ? t('Loading piano…', '加载钢琴…') : soundStatus === 'failed' ? t('Retry sound', '重试音效') : t('Sound on', '音效：开');
        button.title = t('A piano note when you discover or select a song', '发现或点击已点亮的歌曲时，播放钢琴音符');
    }
    function playNote(id) {
        if (!soundEnabled)
            return;
        // Keep every cue inside Vocal Coach's C3–C5 sample coverage.
        const notes = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72];
        const index = data.nodes.findIndex(n => n.id === id);
        if (index >= 0)
            void piano.play(notes[index % notes.length]);
    }
    function focusClue() {
        const heading = document.getElementById('echo-song');
        heading.focus({ preventScroll: true });
        if (window.matchMedia('(max-width: 900px)').matches && heading.getBoundingClientRect().top < 80) {
            heading.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
    }
    function centerCurrentFlower() {
        if (!zoomed)
            return;
        const stage = root.querySelector('.echo-map-stage');
        const current = root.querySelector('.echo-node.is-current .echo-hit').getBoundingClientRect(), box = stage.getBoundingClientRect();
        stage.scrollLeft += current.left + current.width / 2 - box.left - stage.clientWidth / 2;
        stage.scrollTop += current.top + current.height / 2 - box.top - stage.clientHeight / 2;
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
    function visit(id, remember = true) {
        if (!trail.found.includes(id))
            return;
        playNote(id);
        clearArrival();
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
        centerCurrentFlower();
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
        notice = () => unlocked ? t('Every song is lit. A hidden echo has appeared beside the ending.', '所有歌曲都已点亮。终点旁出现了一段隐藏的回响。') : arrival === 'loop' ? t('Back to the beginning. Your trail remains.', '又回到最初。走过的路还在。') : t('Found: ', '找到了：') + songs.get(id).title + (id === data.ending ? t(' · The ending.', ' · 终点。') : '');
        feedbackKind = 'success';
        render();
        animateArrival(arrival || 'song', previous.id, id, isNew, unlocked);
        focusClue();
    }
    function acknowledgeOpen(answer) {
        notice = () => t(`You found ${answer.title}. Its next clue is still blank; explore another branch for now.`, `接上了《${answer.title}》。后续谜面暂空，可以先探索其他分支。`);
        input.value = '';
        feedbackKind = 'success';
        render();
    }
    function render() {
        const song = songs.get(trail.current), ending = song.id === data.ending, deadEnd = song.terminal === 'dead-end', epilogue = song.id === data.bonus;
        const heading = document.getElementById('echo-song');
        heading.textContent = song.title;
        heading.tabIndex = -1;
        const songIndex = data.nodes.findIndex(n => n.id === song.id);
        const family = song.id === data.start ? 1 : ending ? 2 : songIndex % 4;
        const emblem = root.querySelector('[data-clue-flower]');
        emblem.className = 'echo-clue-flower bloom-' + family;
        root.querySelector('[data-clue-art]').src = 'assets/echo-flower-' + ['poppy', 'blue', 'ivory', 'dahlia'][family] + '.webp';
        root.querySelector('[data-song-number]').textContent = epilogue ? '✧' : String(songIndex + 1).padStart(2, '0');
        const quote = document.getElementById('echo-quote');
        quote.replaceChildren(...(song.quote?.match(/[^，]+，?/g) || []).map(line => { const span = document.createElement('span'); span.textContent = line; return span; }));
        quote.hidden = !song.quote;
        document.getElementById('echo-clue').textContent = t(song.clue.en, song.clue.zh);
        const remaining = song.next.filter(id => !trail.edges.includes(song.id + ':' + id)).length;
        const total = song.next.length, explored = total - remaining;
        let branch = epilogue ? t('A HIDDEN ECHO · THANK YOU FOR LISTENING', '隐藏回响 · 谢谢你听到这里') : deadEnd ? t('DEAD END · EXPLORE ANOTHER BRANCH', '死胡同 · 换一条路继续') : ending ? t('ENDING FOUND', '已抵达终点') : total ?
            (remaining ? t(`${total} outgoing ${total === 1 ? 'path' : 'paths'} · ${explored} explored`, `下一步 ${total} 条 · 已走通 ${explored} 条`) : t(`${total} outgoing ${total === 1 ? 'path' : 'paths'} · all explored`, `下一步 ${total} 条 · 已全部走通`)) :
            t('Guess this side branch, then return to another song.', '猜猜这条支线，再回到其他歌继续。');
        if (song.open_answers?.length)
            branch += '\n' + t(`${song.open_answers.length} answer has no next clue yet`, `另有 ${song.open_answers.length} 个答案，后续暂空`);
        document.getElementById('echo-branch').textContent = branch;
        form.hidden = ending || deadEnd || epilogue;
        document.getElementById('echo-dead-end').hidden = !(deadEnd || epilogue);
        document.getElementById('echo-ending').hidden = !ending;
        document.querySelector('.echo-help').hidden = ending || deadEnd || epilogue;
        document.querySelector('[data-back]').disabled = !trail.history.length;
        feedback.textContent = notice();
        feedback.dataset.kind = feedbackKind;
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
            button.className = 'bloom-' + (id === data.start ? 1 : id === data.ending ? 2 : data.nodes.findIndex(n => n.id === id) % 4);
            button.addEventListener('click', () => { visit(id); focusClue(); });
            return button;
        }));
        const foundCount = trail.found.filter(id => id !== data.bonus).length;
        document.getElementById('echo-found-count').textContent = String(foundCount);
        document.getElementById('echo-progress-bar').value = foundCount;
        const bonusUnlocked = !!data.bonus && trail.found.includes(data.bonus);
        document.getElementById('echo-bonus').hidden = !bonusUnlocked;
        root.querySelector('[data-bonus-link]')?.classList.toggle('is-hidden', !bonusUnlocked);
        root.classList.toggle('is-map-zoomed', zoomed);
        const zoomButton = root.querySelector('[data-map-zoom]');
        zoomButton.textContent = zoomed ? t('See full map', '查看全图') : t('Enlarge map', '放大地图');
        zoomButton.setAttribute('aria-pressed', String(zoomed));
        root.querySelector('.echo-map-instruction').textContent = zoomed ? t('Scroll to explore · select a discovered song to revisit', '滑动查看 · 点击已点亮的节点返回') : t('Select a discovered song to revisit', '点击已点亮的节点，回到那首歌');
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
        const relatedRoutes = [];
        root.querySelectorAll('[data-from]').forEach(edge => {
            const found = trail.edges.includes(edge.dataset.from + ':' + edge.dataset.to);
            const outgoing = edge.dataset.from === song.id;
            edge.classList.toggle('is-found', found);
            edge.classList.toggle('is-current', found && outgoing);
            edge.classList.toggle('is-next', !found && outgoing);
            edge.classList.toggle('is-incoming', edge.dataset.to === song.id);
            edge.setAttribute('marker-end', outgoing ? 'url(#echo-arrow-active)' : 'url(#echo-arrow)');
            const route = edge.parentElement;
            const related = outgoing || edge.dataset.to === song.id;
            route.classList.toggle('is-related', related);
            if (related)
                relatedRoutes.push(route);
        });
        const glow = root.querySelector('[data-travel-glow]');
        // Related paths sit above crossings, while labels and nodes stay above every path.
        relatedRoutes.sort((a, b) => Number(a.querySelector('[data-from]').dataset.from === song.id) - Number(b.querySelector('[data-from]').dataset.from === song.id));
        for (const route of relatedRoutes)
            glow.before(route);
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
        if (song.dead_ends?.some(n => norm(n) === guess))
            notice = () => t('You found a side branch with no next clue here; revisit another song below.', '你接上了一条支线。这里没有下一条谜面，可以在下方回到其他歌。');
        else
            notice = () => t('That song doesn’t follow this clue. Try another, or open a hint.', '这首歌没有接上当前线索。可以再试一首，或打开提示。');
        feedbackKind = 'error';
        render();
        input.select();
    });
    document.querySelector('[data-back]').addEventListener('click', () => { const id = trail.history.pop(); if (id)
        visit(id, false); });
    document.querySelector('[data-open-bonus]').addEventListener('click', () => { if (data.bonus)
        visit(data.bonus); });
    document.querySelector('[data-return-branch]').addEventListener('click', () => { const id = trail.history.pop() || data.nodes.find(n => n.next.includes(trail.current))?.id || data.start; visit(id, false); });
    document.querySelector('[data-go-start]').addEventListener('click', () => visit(data.start));
    document.querySelector('[data-reset]').addEventListener('click', () => { clearArrival(); piano.stop(); trail = fresh(); notice = () => ''; feedbackKind = ''; hint.open = false; reveal.open = false; input.value = ''; document.querySelector('.echo-reset').open = false; save(); render(); });
    hint.addEventListener('toggle', () => { if (hint.open)
        reveal.open = false; });
    reveal.addEventListener('toggle', () => { if (reveal.open)
        hint.open = false; render(); });
    root.querySelector('[data-sound]').addEventListener('click', () => {
        soundEnabled = soundStatus === 'failed' ? true : !soundEnabled;
        if (soundEnabled)
            playNote(trail.current);
        else
            piano.stop();
        try {
            localStorage.setItem(soundKey, soundEnabled ? 'on' : 'off');
        }
        catch { }
        renderSound();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden)
        piano.stop(); });
    root.querySelector('[data-map-zoom]').addEventListener('click', () => {
        zoomed = !zoomed;
        render();
        centerCurrentFlower();
    });
    root.querySelectorAll('[data-node]').forEach(node => {
        node.addEventListener('click', () => { visit(node.dataset.node); focusClue(); });
        node.addEventListener('keydown', event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            visit(node.dataset.node);
            focusClue();
        } });
    });
    window.SITE_SHELL?.onLang?.(render);
    syncBonus();
    save();
    render();
    centerCurrentFlower();
})();
