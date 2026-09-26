"use strict";
// Work: a wheel of work types that turns by scroll, drag, arrow keys or the
// buttons, and one view per type. The type views are real sections with ids,
// so #projects, #talks and so on open them directly and survive a reload.
(function () {
    const shell = window.SITE_SHELL;
    const work = document.querySelector('[data-work]');
    const wheel = document.querySelector('[data-wheel]');
    if (!work || !wheel)
        return;
    const WIDE = 860;
    const titles = Array.from(wheel.querySelectorAll('.wheel-title'));
    const cards = Array.from(wheel.querySelectorAll('.wheel-card'));
    const positions = Array.from(wheel.querySelectorAll('.wheel-pos'));
    const topics = Array.from(work.querySelectorAll('section.topic'));
    const N = titles.length;
    const RING = cards.length;
    const STEP = 360 / RING;
    const mod = (a, n) => ((a % n) + n) % n;
    const pad = (n) => String(n).padStart(2, '0');
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
        });
        titles.forEach((title, i) => {
            title.classList.toggle('is-on', i === active);
            if (i === active)
                title.removeAttribute('aria-hidden');
            else
                title.setAttribute('aria-hidden', 'true');
        });
        positions.forEach((el) => {
            el.textContent = `${pad(active + 1)} / ${pad(N)}`;
        });
    }
    function step(d) {
        rot += d;
        render();
    }
    wheel.querySelectorAll('[data-wheel-step]').forEach((button) => {
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
    let recent = [];
    wheel.addEventListener('wheel', (event) => {
        if (work.classList.contains('is-topic'))
            return;
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
        if (recent.length > 6)
            recent.shift();
        if (locked)
            return;
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
    let dragStart = null;
    let moved = false;
    wheel.addEventListener('pointerdown', (event) => {
        if (event.button !== 0)
            return;
        if (event.target.closest('.round-btn'))
            return;
        dragStart = event.clientX;
        moved = false;
    });
    window.addEventListener('pointermove', (event) => {
        if (dragStart === null)
            return;
        const dx = event.clientX - dragStart;
        if (Math.abs(dx) > 4) {
            moved = true;
            wheel.classList.add('is-dragging');
        }
        if (!moved)
            return;
        drag = -dx / ((radius() * Math.PI) / 180) / STEP;
        render();
    });
    function endDrag() {
        if (dragStart === null)
            return;
        dragStart = null;
        wheel.classList.remove('is-dragging');
        rot = Math.round(rot + drag);
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
            if (moved)
                return;
            const rel = i - rot;
            const wrapped = rel - Math.round(rel / RING) * RING;
            if (Math.abs(wrapped) < 0.5)
                openTopic(card.dataset.topic || '');
            else
                step(Math.round(wrapped));
        });
    });
    // ---- Type views -------------------------------------------------------
    function topicIndex(id) {
        return topics.findIndex((section) => section.id === id);
    }
    let shown = null;
    function show(id) {
        const index = topicIndex(id);
        shown = index < 0 ? '' : id;
        if (index < 0) {
            if (work.classList.contains('is-topic')) {
                // Back on the wheel, face the type just left.
                const current = topics.findIndex((section) => section.classList.contains('is-current'));
                if (current >= 0)
                    rot = current + Math.round(rot / N) * N;
            }
            work.classList.remove('is-topic');
            topics.forEach((section) => section.classList.remove('is-current'));
            render();
            return;
        }
        work.classList.add('is-topic');
        topics.forEach((section, i) => section.classList.toggle('is-current', i === index));
    }
    function swap(id) {
        // A fragment link fires both hashchange and popstate; act once.
        const target = topicIndex(id) < 0 ? '' : id;
        if (target === shown)
            return;
        shown = target;
        const change = () => {
            show(id);
            window.scrollTo(0, 0);
        };
        if (shell && shell.fade)
            shell.fade(change);
        else
            change();
    }
    function openTopic(id) {
        if (topicIndex(id) < 0)
            return;
        history.pushState(null, '', `#${id}`);
        swap(id);
    }
    function backToWheel() {
        history.pushState(null, '', window.location.pathname + window.location.search);
        swap('');
    }
    window.addEventListener('hashchange', () => swap(window.location.hash.slice(1)));
    window.addEventListener('popstate', () => swap(window.location.hash.slice(1)));
    work.querySelectorAll('[data-topic-back]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return;
            event.preventDefault();
            backToWheel();
        });
    });
    // Within a type: hovering (or, on touch, a first tap) picks a work, and
    // the picture and its Open link follow.
    function copyHref(from, to) {
        const zh = from.getAttribute('data-zh-href');
        const en = from.getAttribute('data-en-href') || from.getAttribute('href') || '';
        if (zh) {
            to.setAttribute('data-en-href', en);
            to.setAttribute('data-zh-href', zh);
            to.setAttribute('data-i18n', 'href');
            to.setAttribute('href', shell && shell.lang === 'zh' ? zh : en);
        }
        else {
            to.removeAttribute('data-en-href');
            to.removeAttribute('data-zh-href');
            to.removeAttribute('data-i18n');
            to.setAttribute('href', from.getAttribute('href') || '');
        }
    }
    topics.forEach((section) => {
        const items = Array.from(section.querySelectorAll('.work-item'));
        const open = section.querySelector('[data-topic-open]');
        function pick(index) {
            items.forEach((item, i) => item.classList.toggle('is-on', i === index));
            section.querySelectorAll('.topic-visual [data-w]').forEach((el) => {
                el.classList.toggle('is-on', el.dataset.w === String(index));
            });
            if (open && items[index])
                copyHref(items[index], open);
        }
        items.forEach((item, i) => {
            item.addEventListener('mouseenter', () => {
                if (window.innerWidth >= WIDE && !item.classList.contains('is-on'))
                    pick(i);
            });
            item.addEventListener('focus', () => {
                if (!item.classList.contains('is-on'))
                    pick(i);
            });
            item.addEventListener('click', (event) => {
                if (window.innerWidth < WIDE && !item.classList.contains('is-on')) {
                    event.preventDefault();
                    pick(i);
                }
            });
        });
        section.pickWork = (d) => {
            const current = items.findIndex((item) => item.classList.contains('is-on'));
            pick(mod(current + d, items.length));
        };
    });
    // ---- Keys -------------------------------------------------------------
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
            return;
        const target = event.target;
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
            return;
        if (work.classList.contains('is-topic')) {
            const current = topics.find((section) => section.classList.contains('is-current'));
            if (event.key === 'Escape')
                backToWheel();
            else if (current && current.pickWork && (event.key === 'ArrowDown' || event.key === 'ArrowRight'))
                current.pickWork(1);
            else if (current && current.pickWork && (event.key === 'ArrowUp' || event.key === 'ArrowLeft'))
                current.pickWork(-1);
            else
                return;
            event.preventDefault();
            return;
        }
        if (event.key === 'ArrowRight')
            step(1);
        else if (event.key === 'ArrowLeft')
            step(-1);
        else if (event.key === 'Enter' && !target.closest('a, button')) {
            openTopic(topics[mod(Math.round(rot), N)]?.id || '');
        }
        else
            return;
        event.preventDefault();
    });
    show(window.location.hash.slice(1));
    render();
})();
