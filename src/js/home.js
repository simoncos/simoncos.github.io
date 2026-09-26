"use strict";
// Home: the Selected work stage, which advances on its own and pauses under
// the pointer, and the topic filter over the Newest list.
(function () {
    const shell = window.SITE_SHELL;
    const WIDE = 860;
    function wide() {
        return window.innerWidth >= WIDE;
    }
    // ---- Selected work ----------------------------------------------------
    const sel = document.querySelector('[data-sel]');
    if (sel) {
        const panels = Array.from(sel.querySelectorAll('.panel'));
        const bars = Array.from(sel.querySelectorAll('.sel-bar'));
        const count = sel.querySelector('.sel-count');
        const stage = sel.querySelector('.sel-stage');
        const pad = (n) => String(n).padStart(2, '0');
        let active = panels.findIndex((panel) => panel.classList.contains('is-on'));
        if (active < 0)
            active = 0;
        function setActive(next) {
            const total = panels.length;
            active = ((next % total) + total) % total;
            // Dropping the running class and forcing a reflow restarts the bar,
            // even when the stage comes back round to the same panel.
            bars.forEach((bar) => bar.classList.remove('is-on'));
            void sel.offsetWidth;
            panels.forEach((panel, i) => panel.classList.toggle('is-on', i === active));
            bars.forEach((bar, i) => {
                bar.classList.toggle('is-on', i === active);
                bar.classList.toggle('is-done', i < active);
                bar.setAttribute('aria-current', i === active ? 'true' : 'false');
            });
            if (count)
                count.textContent = `${pad(active + 1)} / ${pad(total)}`;
        }
        // The bar's own animation is the clock: when it ends, move on. Pausing
        // the animation (hover, focus) therefore pauses the stage too.
        sel.addEventListener('animationend', (event) => {
            if (event.animationName !== 'om-bar' || shell?.reduced)
                return;
            const bar = event.target.closest('.sel-bar');
            if (bar && bar.classList.contains('is-on'))
                setActive(active + 1);
        });
        bars.forEach((bar, i) => bar.addEventListener('click', () => setActive(i)));
        panels.forEach((panel, i) => {
            panel.addEventListener('click', (event) => {
                if (i === active)
                    return;
                event.preventDefault();
                setActive(i);
            });
            panel.addEventListener('mouseenter', () => {
                if (wide() && i !== active)
                    setActive(i);
            });
        });
        const pause = () => sel.classList.add('is-paused');
        const resume = () => sel.classList.remove('is-paused');
        if (stage) {
            stage.addEventListener('mouseenter', pause);
            stage.addEventListener('mouseleave', resume);
        }
        sel.addEventListener('focusin', pause);
        sel.addEventListener('focusout', (event) => {
            if (!sel.contains(event.relatedTarget))
                resume();
        });
        setActive(active);
    }
    // ---- Newest: topic filter ---------------------------------------------
    const rows = Array.from(document.querySelectorAll('[data-rows] .row'));
    const chips = Array.from(document.querySelectorAll('.newest [data-topic]'))
        .filter((el) => el.tagName === 'BUTTON');
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const topic = chip.dataset.topic || 'all';
            chips.forEach((other) => other.setAttribute('aria-pressed', other === chip ? 'true' : 'false'));
            rows.forEach((row) => {
                const out = topic !== 'all' && row.dataset.topic !== topic;
                row.classList.toggle('is-out', out);
                if (out)
                    row.setAttribute('tabindex', '-1');
                else
                    row.removeAttribute('tabindex');
            });
        });
    });
})();
