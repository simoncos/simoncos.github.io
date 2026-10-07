// Work: a wheel of work types that turns by scroll, drag, arrow keys or the
// buttons, and one view per type. The type views are real sections with ids,
// so #apps, #talks and so on open them directly and survive a reload.
// #apps/hn-llm-research also brings one work's card into view and
// highlights it; the home page links works this way.
(function () {
    const shell = window.SITE_SHELL;
    const workCandidate = document.querySelector<HTMLElement>('[data-work]');
    const wheelCandidate = document.querySelector<HTMLElement>('[data-wheel]');
    if (!workCandidate || !wheelCandidate) return;
    const work = workCandidate;
    const wheel = wheelCandidate;

    const WIDE = 860;
    const titles = Array.from(wheel.querySelectorAll<HTMLElement>('.wheel-title'));
    const cards = Array.from(wheel.querySelectorAll<HTMLButtonElement>('.wheel-card'));
    const positions = Array.from(wheel.querySelectorAll<HTMLElement>('.wheel-pos'));
    const topics = Array.from(work.querySelectorAll<HTMLElement>('section.topic'));
    const N = titles.length;
    const RING = cards.length;
    const STEP = 360 / RING;
    const mod = (a: number, n: number) => ((a % n) + n) % n;
    const pad = (n: number) => String(n).padStart(2, '0');

    let rot = 0;
    let drag = 0;

    function radius() {
        return window.innerWidth >= WIDE ? 1050 : 560;
    }

    function render() {
        const pos = rot + drag;
        const active = mod(Math.round(pos), N);
        cards.forEach((card, i) => {
            const rel = i - pos;
            const wrapped = rel - Math.round(rel / RING) * RING;
            const a = Math.abs(wrapped);
            const on = a < 0.5;
            card.style.setProperty('--deg', `${(wrapped * STEP).toFixed(3)}deg`);
            card.style.setProperty('--s', (on ? 1 : Math.max(0.72, 1 - a * 0.12)).toFixed(3));
            card.style.setProperty('--o', a > 3.2 ? '0' : (1 - a * 0.22).toFixed(3));
            card.style.zIndex = String(100 - Math.round(a * 10));
            card.classList.toggle('is-on', on);
            // Only the front card is a tab stop, and the only one assistive
            // technology sees: the ring repeats the same types three times.
            card.tabIndex = on ? 0 : -1;
            if (on) card.removeAttribute('aria-hidden');
            else card.setAttribute('aria-hidden', 'true');
        });
        // Keyboard focus rides along when the wheel turns under it.
        const focused = document.activeElement;
        if (focused instanceof HTMLButtonElement && cards.includes(focused) && !focused.classList.contains('is-on')) {
            cards.find((card) => card.classList.contains('is-on'))?.focus({ preventScroll: true });
        }
        titles.forEach((title, i) => {
            title.classList.toggle('is-on', i === active);
            if (i === active) title.removeAttribute('aria-hidden');
            else title.setAttribute('aria-hidden', 'true');
        });
        positions.forEach((el) => {
            el.textContent = `${pad(active + 1)} / ${pad(N)}`;
        });
    }

    function step(d: number) {
        rot += d;
        render();
    }

    wheel.querySelectorAll<HTMLButtonElement>('[data-wheel-step]').forEach((button) => {
        button.addEventListener('click', () => step(Number(button.dataset.wheelStep) || 0));
    });

    // One step per gesture: stay locked until wheel events, trackpad inertia
    // included, go quiet. Only a clear spike above the recent tail, or a real
    // reversal, counts as a new gesture before then.
    let acc = 0;
    let locked = false;
    let lockAt = 0;
    let lockDir = 0;
    let idle = 0;
    let recent: number[] = [];

    wheel.addEventListener('wheel', (event) => {
        if (work.classList.contains('is-topic')) return;
        const d = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        event.preventDefault();
        const now = Date.now();
        const mag = Math.abs(d);
        window.clearTimeout(idle);
        idle = window.setTimeout(() => {
            locked = false;
            acc = 0;
            recent = [];
        }, 180);
        if (locked && now - lockAt > 380) {
            const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
            const spike = recent.length >= 4 && mag > 24 && mag > avg * 3;
            const flipped = Math.sign(d) !== lockDir && mag > 12;
            if (spike || flipped) {
                locked = false;
                acc = 0;
            }
        }
        recent.push(mag);
        if (recent.length > 6) recent.shift();
        if (locked) return;
        acc += d;
        if (Math.abs(acc) > 30) {
            lockDir = acc > 0 ? 1 : -1;
            step(lockDir);
            acc = 0;
            locked = true;
            lockAt = now;
        }
    }, { passive: false });

    // ---- Drag -----------------------------------------------------------

    // The cards follow the finger along the arc, so one card is about 290px
    // of travel on a phone and rounding alone asked for half of that. On
    // release, a short swipe or a quick flick still turns one card. A gesture
    // the browser takes over for scrolling (pointercancel) never does.
    const COMMIT_PX = 32;
    const FLICK_PX = 12;
    const FLICK_SPEED = 0.3; // px per ms, over the last 100ms

    let dragStart: number | null = null;
    let moved = false;
    let samples: { t: number; x: number }[] = [];

    wheel.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if ((event.target as Element).closest('.round-btn')) return;
        dragStart = event.clientX;
        moved = false;
        samples = [{ t: event.timeStamp, x: event.clientX }];
    });

    window.addEventListener('pointermove', (event) => {
        if (dragStart === null) return;
        const dx = event.clientX - dragStart;
        samples.push({ t: event.timeStamp, x: event.clientX });
        while (samples.length > 2 && event.timeStamp - samples[0].t > 100) samples.shift();
        if (Math.abs(dx) > 4) {
            moved = true;
            wheel.classList.add('is-dragging');
        }
        if (!moved) return;
        drag = -dx / ((radius() * Math.PI) / 180) / STEP;
        render();
    });

    function endDrag(event: PointerEvent) {
        if (dragStart === null) return;
        const dx = event.clientX - dragStart;
        dragStart = null;
        wheel.classList.remove('is-dragging');
        let target = Math.round(rot + drag);
        if (event.type === 'pointerup' && moved && target === rot) {
            const first = samples[0];
            const span = event.timeStamp - first.t;
            const speed = span > 0 ? (event.clientX - first.x) / span : 0;
            const flick = Math.abs(dx) >= FLICK_PX && Math.abs(speed) >= FLICK_SPEED && speed * dx > 0;
            if (Math.abs(dx) >= COMMIT_PX || flick) target = rot + (dx < 0 ? 1 : -1);
        }
        rot = target;
        drag = 0;
        render();
        window.setTimeout(() => {
            moved = false;
        }, 30);
    }

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    cards.forEach((card, i) => {
        card.addEventListener('click', () => {
            if (moved) return;
            const rel = i - rot;
            const wrapped = rel - Math.round(rel / RING) * RING;
            if (Math.abs(wrapped) < 0.5) openTopic(card.dataset.topic || '');
            else step(Math.round(wrapped));
        });
    });

    // ---- Type views -------------------------------------------------------

    function topicIndex(id: string) {
        return topics.findIndex((section) => section.id === id);
    }

    let shown: string | null = null;

    // The card a #type/work address points at, once its type is showing.
    // Focus follows the reader to the card a link sent them to, for screen readers and the next Tab. The wash already shows
    // which card it is, so the focus ring stays off until the reader moves focus themselves.
    function land(card: HTMLElement | null) {
        if (!card) return;
        card.classList.add('is-landed');
        card.addEventListener('blur', () => card.classList.remove('is-landed'), { once: true });
        card.focus({ preventScroll: true });
    }

    function pointAt(item: string) {
        const current = topics.find((section) => section.classList.contains('is-current'));
        const cardCandidate = item && current ? current.querySelector<HTMLElement>(`[data-work="${CSS.escape(item)}"]`) : null;
        if (!cardCandidate) return null;
        const card = cardCandidate;
        card.scrollIntoView({ block: 'center' });
        card.classList.remove('is-target');
        void card.offsetWidth;
        // Arriving from another page, the transition still covers the screen for about 0.45 s; ring the card after it lifts.
        const arriving = document.documentElement.hasAttribute('data-arrive');
        window.setTimeout(() => card.classList.add('is-target'), arriving ? 460 : 0);
        // Other animations inside the card end too; only the ring's own end clears it.
        const clear = (event: AnimationEvent) => {
            if (event.animationName !== 'wcard-target') return;
            card.classList.remove('is-target');
            card.removeEventListener('animationend', clear);
        };
        card.addEventListener('animationend', clear);
        return card;
    }

    function show(address: string) {
        let [id, item = ''] = address.split('/');
        // Keep old links to the retired single-item category useful.
        if (id === 'visual') id = 'research';
        const index = topicIndex(id);
        shown = index < 0 ? '' : id;
        if (index < 0) {
            if (work.classList.contains('is-topic')) {
                // Back on the wheel, face the type just left.
                const current = topics.findIndex((section) => section.classList.contains('is-current'));
                if (current >= 0) rot = current + Math.round(rot / N) * N;
            }
            work.classList.remove('is-topic');
            topics.forEach((section) => section.classList.remove('is-current'));
            render();
            return;
        }
        work.classList.add('is-topic');
        topics.forEach((section, i) => section.classList.toggle('is-current', i === index));
        return pointAt(item);
    }

    // After a switch, put focus where the reader now is: the type's heading,
    // or the front card back on the wheel.
    function focusView() {
        const current = topics.find((section) => section.classList.contains('is-current'));
        const targetCandidate = current
            ? current.querySelector<HTMLElement>('.topic-head h1, .topic-head h2')
            : cards.find((card) => card.classList.contains('is-on'));
        if (!targetCandidate) return;
        const target = targetCandidate;
        if (current) target.tabIndex = -1;
        target.focus({ preventScroll: true });
    }

    function swap(address: string) {
        let [id, item = ''] = address.split('/');
        if (id === 'visual') id = 'research';
        // A fragment link fires both hashchange and popstate; act once.
        const target = topicIndex(id) < 0 ? '' : id;
        if (target === shown && !item) return;
        shown = target;
        const change = () => {
            window.scrollTo(0, 0);
            const card = show(item ? `${id}/${item}` : id);
            if (card && item) land(card);
            else if (card) card.focus({ preventScroll: true });
            else focusView();
        };
        if (shell && shell.fade) shell.fade(change);
        else change();
    }

    function openTopic(id: string) {
        if (topicIndex(id) < 0) return;
        history.pushState(null, '', `#${id}`);
        shell?.syncLangToggle?.();
        swap(id);
    }

    function backToWheel() {
        history.pushState(null, '', window.location.pathname + window.location.search);
        shell?.syncLangToggle?.();
        swap('');
    }

    window.addEventListener('hashchange', () => swap(window.location.hash.slice(1)));
    window.addEventListener('popstate', () => swap(window.location.hash.slice(1)));

    work.querySelectorAll<HTMLAnchorElement>('[data-topic-back]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            backToWheel();
        });
    });

    // ---- Keys -------------------------------------------------------------

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        // Keys belong to the mobile menu while it covers the page, whichever
        // listener runs first.
        if (document.documentElement.classList.contains('menu-open')) return;
        const target = event.target as HTMLElement;
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        if (work.classList.contains('is-topic')) {
            if (event.key !== 'Escape') return;
            backToWheel();
            event.preventDefault();
            return;
        }
        if (event.key === 'ArrowRight') step(1);
        else if (event.key === 'ArrowLeft') step(-1);
        else if (event.key === 'Enter' && !target.closest('a, button')) {
            openTopic(topics[mod(Math.round(rot), N)]?.id || '');
        } else return;
        event.preventDefault();
    });

    const arrival = window.location.hash.slice(1);
    show(arrival.split('/')[0]);
    render();
    // Point at the card after the first layout, so the scroll lands where the page has settled.
    if (arrival.includes('/')) requestAnimationFrame(() => land(pointAt(arrival.split('/')[1])));
})();
