"use strict";
// Home: the Selected work stage, which changes only when the reader asks
// (a mouse hover on a wide screen, otherwise a tap), and the topic filter over
// the Newest list.
(function () {
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
            panels.forEach((panel, i) => panel.classList.toggle('is-on', i === active));
            bars.forEach((bar, i) => {
                bar.classList.toggle('is-on', i === active);
                bar.setAttribute('aria-current', i === active ? 'true' : 'false');
            });
            if (count)
                count.textContent = `${pad(active + 1)} / ${pad(total)}`;
        }
        // No timer: a stage that moves by itself shifts the page under the
        // reader. A mouse on a wide screen opens a panel by hovering. A touch
        // opens it on the first tap and follows the link on the second, on a
        // tablet too: a tap sends a synthetic hover before its click, which
        // used to open the panel and then follow the link in one tap.
        bars.forEach((bar, i) => bar.addEventListener('click', () => setActive(i)));
        panels.forEach((panel, i) => {
            panel.addEventListener('click', (event) => {
                if (i === active)
                    return;
                event.preventDefault();
                setActive(i);
            });
            panel.addEventListener('pointerenter', (event) => {
                if (event.pointerType === 'mouse' && wide() && i !== active)
                    setActive(i);
            });
        });
        setActive(active);
    }
    // ---- Newest: topic filter ---------------------------------------------
    const rowsBox = document.querySelector('[data-rows]');
    const rows = Array.from(document.querySelectorAll('[data-rows] .row'));
    // Only the newest few of the chosen topic show; Articles and Work list the rest.
    const shown = Number(rowsBox?.dataset.shown) || rows.length;
    const chips = Array.from(document.querySelectorAll('.newest [data-topic]'))
        .filter((el) => el.tagName === 'BUTTON');
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            const topic = chip.dataset.topic || 'all';
            chips.forEach((other) => other.setAttribute('aria-pressed', other === chip ? 'true' : 'false'));
            let n = 0;
            rows.forEach((row) => {
                const on = (topic === 'all' || row.dataset.topic === topic) && n < shown;
                if (on)
                    n++;
                row.hidden = !on;
            });
        });
    });
})();
