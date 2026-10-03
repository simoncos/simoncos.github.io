"use strict";
// Articles: the list (search, tag filter, month groups, excerpts that open in
// place), the month index its headings open, and the series view (a route of
// parts per series). #series and #series-<id> open the series view,
// #topic-<slug> filters the list by a tag's English label (#topic-outdoors);
// #2012-09 lands on a month.
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
    const status = main.querySelector('[data-status]');
    const cards = Array.from(main.querySelectorAll('.scard'));
    const index = main.querySelector('[data-date-index]');
    const cells = index ? Array.from(index.querySelectorAll('a.dmi-cell')) : [];
    const years = index ? Array.from(index.querySelectorAll('[data-year]')) : [];
    const hdr = document.querySelector('.hdr');
    let view = 'list';
    let tag = 'all';
    function bi(en, zh) {
        return `<span data-l="en">${en}</span><span data-l="zh" lang="zh-Hans">${zh}</span>`;
    }
    // ---- List -------------------------------------------------------------
    function visibleRows() {
        return rows.filter((row) => !row.hidden);
    }
    function filter(announce = false) {
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
        const shown = visibleRows().length;
        if (empty)
            empty.hidden = shown > 0;
        syncCount();
        syncIndex();
        // Tell screen readers what a search or a topic left on the list.
        if (announce && status) {
            status.innerHTML = shown
                ? bi(`${shown} ${shown === 1 ? 'article' : 'articles'}`, `${shown} 篇文章`)
                : bi('Nothing matches that yet.', '暂时没有匹配的文章。');
        }
    }
    function syncCount() {
        if (!shownEl)
            return;
        shownEl.textContent = String(view === 'list' ? visibleRows().length : cards.length);
    }
    // A tag's address name (its English label), and back.
    function slugOf(key) {
        return chips.find((chip) => chip.dataset.tag === key)?.dataset.slug || key;
    }
    function tagFor(name) {
        return chips.find((chip) => chip.dataset.slug === name)?.dataset.tag || 'all';
    }
    function setTag(next, record) {
        tag = tagFor(next);
        chips.forEach((chip) => chip.setAttribute('aria-pressed', chip.dataset.tag === tag ? 'true' : 'false'));
        filter(record);
        if (record)
            setHash(tag === 'all' ? '' : `topic-${slugOf(tag)}`);
    }
    chips.forEach((chip) => chip.addEventListener('click', () => setTag(chip.dataset.slug || 'all', true)));
    if (search)
        search.addEventListener('input', () => filter(true));
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
        // A click anywhere on the row opens or closes its excerpt, not only
        // on the title or the toggle, which stay the controls for keyboards
        // and screen readers. Links and other buttons keep their own action;
        // an open excerpt is left alone, so reading in it or selecting text
        // does not fold it away.
        row.addEventListener('click', (event) => {
            const target = event.target;
            if (!target.closest('.arow-title, .arow-toggle')) {
                if (target.closest('a, button, input, label, .arow-ex'))
                    return;
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.containsNode(row, true))
                    return;
            }
            setOpen(row);
        });
        // Hovering a row dims all the others. Series parts used to stay lit
        // together, which read as two rows hovered at once; the series pill
        // already shows the relation.
        row.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(hover: hover)').matches)
                return;
            rows.forEach((other) => other.classList.toggle('is-dim', other !== row));
        });
        row.addEventListener('mouseleave', () => rows.forEach((other) => other.classList.remove('is-dim')));
    });
    // ---- Month index --------------------------------------------------------
    // Every month heading sticks under the header and opens the index, a
    // popover with a cell per month. The popover and its links work without
    // this script; here it opens next to the heading, marks that month,
    // follows the filter, and jumps without touching the address.
    // Where headings stick and jumps land. The header is taller when its
    // labels wrap.
    function measure() {
        const h = hdr ? Math.round(hdr.getBoundingClientRect().height) : 76;
        document.documentElement.style.setProperty('--hdr-h', `${h}px`);
        return h;
    }
    // A month the filter emptied becomes a dot, a year with nothing left
    // drops out, and a year jumps to its newest month still listed.
    function syncIndex() {
        cells.forEach((cell) => {
            const month = document.getElementById(cell.dataset.jump || '');
            const n = month && !month.hidden ? month.querySelectorAll('.arow:not([hidden])').length : 0;
            cell.classList.toggle('is-off', n === 0);
            cell.tabIndex = n ? 0 : -1;
            if (n)
                cell.removeAttribute('aria-hidden');
            else
                cell.setAttribute('aria-hidden', 'true');
            const count = cell.querySelector('[data-n]');
            if (count && n)
                count.textContent = String(n);
        });
        years.forEach((row) => {
            const on = Array.from(row.querySelectorAll('a.dmi-cell:not(.is-off)'));
            row.hidden = on.length === 0;
            const year = row.querySelector('.dmi-year');
            const newest = on[on.length - 1];
            if (year && newest) {
                year.dataset.jump = newest.dataset.jump;
                year.setAttribute('href', `#${newest.dataset.jump}`);
            }
        });
    }
    function jump(key) {
        const month = document.getElementById(key);
        if (!month || month.hidden)
            return;
        month.scrollIntoView({ block: 'start' });
        month.classList.remove('is-arrived');
        void month.offsetWidth;
        month.classList.add('is-arrived');
        window.setTimeout(() => month.classList.remove('is-arrived'), 1700);
        const heading = month.querySelector('.amonth-jump');
        if (heading)
            heading.focus({ preventScroll: true });
    }
    if (index) {
        let invoker = null;
        main.querySelectorAll('.amonth-jump').forEach((button) => {
            button.addEventListener('click', () => {
                invoker = button;
            });
        });
        index.addEventListener('beforetoggle', (event) => {
            if (event.newState !== 'open')
                return;
            // Just under the heading that opened it, which is usually the
            // one stuck under the header; at the top when that leaves too
            // little room.
            const top0 = measure() + 8;
            let top = top0 + 44;
            if (invoker) {
                const r = invoker.getBoundingClientRect();
                if (r.bottom > 0 && r.bottom + 260 < window.innerHeight)
                    top = Math.max(top0, r.bottom + 6);
            }
            index.style.top = `${Math.round(top)}px`;
            index.style.maxHeight = `${Math.round(window.innerHeight - top - 16)}px`;
            const month = invoker ? invoker.closest('.amonth') : null;
            cells.forEach((cell) => {
                if (month && cell.dataset.jump === month.id)
                    cell.setAttribute('aria-current', 'true');
                else
                    cell.removeAttribute('aria-current');
            });
        });
        index.addEventListener('toggle', (event) => {
            if (event.newState !== 'open') {
                invoker = null;
                return;
            }
            const current = cells.find((cell) => cell.getAttribute('aria-current') === 'true');
            if (!current)
                return;
            index.scrollTop = Math.max(0, current.offsetTop - index.clientHeight / 2);
            current.focus({ preventScroll: true });
        });
        index.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-jump]');
            if (!link)
                return;
            event.preventDefault();
            index.hidePopover();
            jump(link.dataset.jump || '');
        });
    }
    measure();
    window.addEventListener('resize', measure);
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
            setHash(view === 'series' ? 'series' : tag === 'all' ? '' : `topic-${slugOf(tag)}`);
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
        if (hash === 'series') {
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
        else if (/^\d{4}-\d{2}$/.test(hash)) {
            // blogs.html#2012-09: the browser already scrolled, but before
            // the header height was known.
            setView('list', false);
            jump(hash);
        }
        else {
            setView('list', false);
        }
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
    filter();
})();
