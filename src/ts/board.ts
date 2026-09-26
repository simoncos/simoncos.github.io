// Project board: Board / Present modes with slide navigation, the nights
// canvas, the pipeline stages and the privacy timeline.
(function () {
    const shell = window.SITE_SHELL;
    const board = document.querySelector<HTMLElement>('[data-board]');
    if (!board) return;

    const root = document.documentElement;
    const reduced = !!(shell && shell.reduced);

    // ---- Board / Present --------------------------------------------------

    const track = board.querySelector<HTMLElement>('[data-track]');
    const modes = Array.from(board.querySelectorAll<HTMLButtonElement>('[data-mode]'));
    const pos = board.querySelector<HTMLElement>('[data-slide-pos]');
    const slides = track ? Array.from(track.children) as HTMLElement[] : [];
    let slide = 0;

    function present() {
        return board.classList.contains('is-present');
    }

    function syncPos() {
        if (pos) pos.textContent = `${slide + 1} / ${slides.length}`;
    }

    function setMode(mode: string) {
        board.classList.toggle('is-present', mode === 'present');
        modes.forEach((button) => button.setAttribute('aria-pressed', button.dataset.mode === mode ? 'true' : 'false'));
        slide = 0;
        if (track) track.scrollLeft = 0;
        syncPos();
        drawDots();
    }

    function slideBy(d: number) {
        if (!track || !slides.length) return;
        slide = Math.max(0, Math.min(slides.length - 1, slide + d));
        const child = slides[slide];
        track.scrollTo({ left: child.offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
        syncPos();
    }

    modes.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode || 'board')));
    board.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach((button) => {
        button.addEventListener('click', () => slideBy(Number(button.dataset.slide) || 0));
    });

    if (track) {
        track.addEventListener('scroll', () => {
            if (!present()) return;
            const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
            if (i !== slide) {
                slide = i;
                syncPos();
            }
        }, { passive: true });
    }

    document.addEventListener('keydown', (event) => {
        if (!present() || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.key === 'ArrowRight') slideBy(1);
        else if (event.key === 'ArrowLeft') slideBy(-1);
        else if (event.key === 'Escape') setMode('board');
        else return;
        event.preventDefault();
    });

    // ---- Nights canvas ----------------------------------------------------

    const NIGHTS = 3656;
    const YEARS = 10;
    const COLS = 366;
    const canvas = board.querySelector<HTMLCanvasElement>('[data-dots]');
    const countEl = board.querySelector<HTMLElement>('[data-dots-count]');
    const labelEl = board.querySelector<HTMLElement>('[data-dots-label]');
    let filled = reduced ? NIGHTS : 0;
    let year: number | null = null;

    function cssVar(name: string, fallback: string) {
        return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
    }

    function drawDots() {
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w < 10 || h < 10) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const cols = w < 520 ? 53 : COLS;
        const per = COLS / cols;
        const labelW = 40;
        const cw = (w - labelW) / cols;
        const rh = h / YEARS;
        const ink = cssVar('--ink', '#141414');
        const accent = cssVar('--a', ink);
        const muted = cssVar('--muted-2', '#8a8a86');
        const line = cssVar('--line', '#e4e4e0');
        const line2 = cssVar('--line-2', '#c9c9c5');
        ctx.font = '11px Geist, sans-serif';
        ctx.textBaseline = 'middle';
        for (let y = 0; y < YEARS; y++) {
            const hot = year === y;
            ctx.fillStyle = hot ? ink : muted;
            ctx.fillText(String(2016 + y), 0, y * rh + rh / 2);
            for (let x = 0; x < cols; x++) {
                const idx = y * COLS + Math.floor(x * per);
                const on = idx < filled;
                ctx.fillStyle = on ? (hot ? accent : (year === null ? ink : line2)) : line;
                ctx.fillRect(labelW + x * cw, y * rh + rh * 0.18, Math.max(0.8, cw - 0.6), rh * 0.64);
            }
        }
    }

    function syncCount() {
        if (countEl) countEl.textContent = filled.toLocaleString('en-US');
    }

    if (canvas) {
        canvas.addEventListener('pointermove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const y = Math.floor(((event.clientY - rect.top) / rect.height) * YEARS);
            const next = y >= 0 && y < YEARS ? y : null;
            if (next === year) return;
            year = next;
            if (labelEl) labelEl.textContent = year === null ? labelEl.dataset.default || '' : String(2016 + year);
            drawDots();
        });
        canvas.addEventListener('pointerleave', () => {
            year = null;
            if (labelEl) labelEl.textContent = labelEl.dataset.default || '';
            drawDots();
        });

        syncCount();
        drawDots();
        if (!reduced) {
            const fill = window.setInterval(() => {
                filled = Math.min(NIGHTS, filled + 90);
                syncCount();
                drawDots();
                if (filled >= NIGHTS) window.clearInterval(fill);
            }, 30);
        }

        let resize = 0;
        window.addEventListener('resize', () => {
            window.clearTimeout(resize);
            resize = window.setTimeout(drawDots, 100);
        });
        // Theme changes swap the palette the canvas was drawn with.
        new MutationObserver(drawDots).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    // ---- Pipeline ---------------------------------------------------------

    const stageButtons = Array.from(board.querySelectorAll<HTMLButtonElement>('[data-stage]'));
    const stageDescs = Array.from(board.querySelectorAll<HTMLElement>('[data-stage-desc]'));

    function setStage(i: string) {
        stageButtons.forEach((button) => {
            const on = button.dataset.stage === i;
            button.classList.toggle('is-on', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        stageDescs.forEach((desc) => desc.classList.toggle('is-on', desc.dataset.stageDesc === i));
    }

    stageButtons.forEach((button) => {
        const pick = () => setStage(button.dataset.stage || '0');
        button.addEventListener('mouseenter', pick);
        button.addEventListener('focus', pick);
        button.addEventListener('click', pick);
    });

    // ---- Privacy timeline -------------------------------------------------

    const priv = board.querySelector<HTMLElement>('[data-priv]');
    if (priv && !reduced) {
        const steps = Array.from(priv.querySelectorAll<HTMLElement>('li'));
        let lit = 0;
        const light = () => steps.forEach((step, i) => step.classList.toggle('is-lit', i <= lit));
        priv.classList.add('is-cycling');
        light();
        window.setInterval(() => {
            lit = (lit + 1) % steps.length;
            light();
        }, 1600);
    }

    syncPos();
})();
