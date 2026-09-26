"use strict";
// Articles: the list (search, tag filter, month groups, excerpts that open in
// place) and the series view (a route of parts per series). Old links keep
// working: #reading-paths and #series-<id> open the series view, #topics and
// #topic-<tag> the list.
(function () {
    const main = document.querySelector('[data-articles]');
    if (!main)
        return;
    const shownEl = main.querySelector('[data-shown]');
    const viewButtons = Array.from(main.querySelectorAll('[data-view]'));
    const search = main.querySelector('[data-search]');
    const chips = Array.from(main.querySelectorAll('[data-tag]'));
    const rows = Array.from(main.querySelectorAll('.arow'));
    const months = Array.from(main.querySelectorAll('[data-month]'));
    const empty = main.querySelector('[data-empty]');
    const cards = Array.from(main.querySelectorAll('.scard'));
    let view = 'list';
    let tag = 'all';
    function bi(en, zh) {
        return `<span data-l="en">${en}</span><span data-l="zh" lang="zh-Hans">${zh}</span>`;
    }
    // ---- List -------------------------------------------------------------
    function visibleRows() {
        return rows.filter((row) => !row.hidden);
    }
    function filter() {
        const q = (search ? search.value : '').trim().toLowerCase();
        rows.forEach((row) => {
            const tags = (row.dataset.tags || '').split(/\s+/);
            const text = row.dataset.search || '';
            row.hidden = !((tag === 'all' || tags.includes(tag)) && (!q || text.includes(q)));
        });
        months.forEach((month) => {
            const n = Array.from(month.querySelectorAll('.arow')).filter((row) => !row.hidden).length;
            month.hidden = n === 0;
            const count = month.querySelector('[data-month-count]');
            if (count)
                count.innerHTML = bi(`${n} ${n === 1 ? 'article' : 'articles'}`, `${n} 篇`);
        });
        if (empty)
            empty.hidden = visibleRows().length > 0;
        syncCount();
    }
    function syncCount() {
        if (!shownEl)
            return;
        shownEl.textContent = String(view === 'list' ? visibleRows().length : cards.length);
    }
    function setTag(next, record) {
        tag = chips.some((chip) => chip.dataset.tag === next) ? next : 'all';
        chips.forEach((chip) => chip.setAttribute('aria-pressed', chip.dataset.tag === tag ? 'true' : 'false'));
        filter();
        if (record)
            setHash(tag === 'all' ? '' : `topic-${tag}`);
    }
    chips.forEach((chip) => chip.addEventListener('click', () => setTag(chip.dataset.tag || 'all', true)));
    if (search)
        search.addEventListener('input', filter);
    function setOpen(row) {
        rows.forEach((other) => {
            const open = other === row && !other.classList.contains('is-open');
            other.classList.toggle('is-open', open);
            other.querySelectorAll('.arow-title, .arow-toggle').forEach((button) => {
                button.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });
    }
    rows.forEach((row) => {
        row.querySelectorAll('.arow-title, .arow-toggle').forEach((button) => {
            button.addEventListener('click', () => setOpen(row));
        });
        // Hovering a row dims the others, except the other parts of its series.
        row.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(hover: hover)').matches)
                return;
            const series = row.dataset.series;
            rows.forEach((other) => {
                other.classList.toggle('is-dim', other !== row && !(series && other.dataset.series === series));
            });
        });
        row.addEventListener('mouseleave', () => rows.forEach((other) => other.classList.remove('is-dim')));
    });
    // ---- Series -----------------------------------------------------------
    function focusCard(card) {
        cards.forEach((other) => other.classList.toggle('is-focus', other === card));
    }
    function selectPart(card, index) {
        const nodes = Array.from(card.querySelectorAll('.rnode'));
        nodes.forEach((node, i) => {
            node.classList.toggle('is-sel', i === index);
            node.classList.toggle('is-done', i < index);
            node.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
        card.querySelectorAll('[data-part-detail]').forEach((part) => {
            part.classList.toggle('is-sel', part.dataset.partDetail === String(index));
        });
        const prog = card.querySelector('[data-prog]');
        if (prog)
            prog.innerHTML = bi(`Part ${index + 1} / ${nodes.length}`, `第 ${index + 1} / ${nodes.length} 篇`);
        focusCard(card);
    }
    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('is-focus'))
                focusCard(card);
        });
        card.addEventListener('focusin', () => {
            if (!card.classList.contains('is-focus'))
                focusCard(card);
        });
        card.querySelectorAll('.rnode').forEach((node) => {
            const index = Number(node.dataset.part) || 0;
            node.addEventListener('click', () => selectPart(card, index));
            node.addEventListener('mouseenter', () => {
                if (window.innerWidth >= 860 && !node.classList.contains('is-sel'))
                    selectPart(card, index);
            });
        });
    });
    // ---- Views and the address ---------------------------------------------
    function setHash(hash) {
        const url = window.location.pathname + window.location.search + (hash ? `#${hash}` : '');
        try {
            history.replaceState(history.state, '', url);
        }
        catch (_error) {
            // Not fatal: the view still switches.
        }
    }
    function setView(next, record) {
        view = next;
        main.classList.toggle('is-series', view === 'series');
        viewButtons.forEach((button) => button.setAttribute('aria-pressed', button.dataset.view === view ? 'true' : 'false'));
        syncCount();
        if (record)
            setHash(view === 'series' ? 'reading-paths' : tag === 'all' ? '' : `topic-${tag}`);
    }
    viewButtons.forEach((button) => {
        button.addEventListener('click', () => setView(button.dataset.view === 'series' ? 'series' : 'list', true));
    });
    main.querySelectorAll('[data-to-series]').forEach((button) => {
        button.addEventListener('click', () => {
            const card = cards.find((c) => c.dataset.series === button.dataset.toSeries);
            setView('series', false);
            if (card) {
                focusCard(card);
                setHash(card.id);
            }
            window.scrollTo(0, 0);
        });
    });
    function fromHash() {
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash === 'reading-paths') {
            setView('series', false);
        }
        else if (hash.startsWith('series-')) {
            setView('series', false);
            const card = cards.find((c) => c.id === hash);
            if (card) {
                focusCard(card);
                card.scrollIntoView({ block: 'start' });
            }
        }
        else if (hash.startsWith('topic-')) {
            setView('list', false);
            setTag(hash.slice('topic-'.length), false);
        }
        else {
            setView('list', false);
        }
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    filter();
})();
