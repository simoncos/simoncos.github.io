// Work: a wheel of work types that turns by scroll, drag, arrow keys or the
// buttons, and one view per type. The type views are real sections with ids,
// so #projects, #talks and so on open them directly and survive a reload.
(function () {
    const shell = window.SITE_SHELL;
    const work = document.querySelector<HTMLElement>('[data-work]');
    const wheel = document.querySelector<HTMLElement>('[data-wheel]');
    if (!work || !wheel) return;

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

    function show(id: string) {
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
    }

    // After a switch, put focus where the reader now is: the type's heading,
    // or the front card back on the wheel.
    function focusView() {
        const current = topics.find((section) => section.classList.contains('is-current'));
        const target = current
            ? current.querySelector<HTMLElement>('.topic-head h1, .topic-head h2')
            : cards.find((card) => card.classList.contains('is-on'));
        if (!target) return;
        if (current) target.tabIndex = -1;
        target.focus({ preventScroll: true });
    }

    function swap(id: string) {
        // A fragment link fires both hashchange and popstate; act once.
        const target = topicIndex(id) < 0 ? '' : id;
        if (target === shown) return;
        shown = target;
        const change = () => {
            show(id);
            window.scrollTo(0, 0);
            focusView();
        };
        if (shell && shell.fade) shell.fade(change);
        else change();
    }

    function openTopic(id: string) {
        if (topicIndex(id) < 0) return;
        history.pushState(null, '', `#${id}`);
        swap(id);
    }

    function backToWheel() {
        history.pushState(null, '', window.location.pathname + window.location.search);
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

    // Within a type: hovering (or, on touch, a first tap) picks a work, and
    // the picture and its Open link follow.
    function copyHref(from: HTMLAnchorElement, to: HTMLAnchorElement) {
        const zh = from.getAttribute('data-zh-href');
        const en = from.getAttribute('data-en-href') || from.getAttribute('href') || '';
        if (zh) {
            to.setAttribute('data-en-href', en);
            to.setAttribute('data-zh-href', zh);
            to.setAttribute('data-i18n', 'href');
            to.setAttribute('href', shell && shell.lang === 'zh' ? zh : en);
        } else {
            to.removeAttribute('data-en-href');
            to.removeAttribute('data-zh-href');
            to.removeAttribute('data-i18n');
            to.setAttribute('href', from.getAttribute('href') || '');
        }
    }

    topics.forEach((section) => {
        const items = Array.from(section.querySelectorAll<HTMLAnchorElement>('.work-item'));
        const open = section.querySelector<HTMLAnchorElement>('[data-topic-open]');

        function pick(index: number) {
            items.forEach((item, i) => item.classList.toggle('is-on', i === index));
            section.querySelectorAll<HTMLElement>('.topic-visual [data-w]').forEach((el) => {
                el.classList.toggle('is-on', el.dataset.w === String(index));
            });
            if (open && items[index]) copyHref(items[index], open);
        }

        items.forEach((item, i) => {
            item.addEventListener('mouseenter', () => {
                if (window.innerWidth >= WIDE && !item.classList.contains('is-on')) pick(i);
            });
            item.addEventListener('focus', () => {
                if (!item.classList.contains('is-on')) pick(i);
            });
            item.addEventListener('click', (event) => {
                if (window.innerWidth < WIDE && !item.classList.contains('is-on')) {
                    event.preventDefault();
                    pick(i);
                }
            });
        });

        (section as HTMLElement & { pickWork?: (d: number) => void }).pickWork = (d: number) => {
            const current = items.findIndex((item) => item.classList.contains('is-on'));
            pick(mod(current + d, items.length));
        };
    });

    // ---- Keys -------------------------------------------------------------

    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target as HTMLElement;
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        if (work.classList.contains('is-topic')) {
            const current = topics.find((section) => section.classList.contains('is-current')) as
                (HTMLElement & { pickWork?: (d: number) => void }) | undefined;
            if (event.key === 'Escape') backToWheel();
            else if (current && current.pickWork && (event.key === 'ArrowDown' || event.key === 'ArrowRight')) current.pickWork(1);
            else if (current && current.pickWork && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) current.pickWork(-1);
            else return;
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

    show(window.location.hash.slice(1));
    render();
})();
