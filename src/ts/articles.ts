// Articles: the list (search, tag filter, month groups, excerpts that open in
// place), the month index its headings open, and the series view (a route of
// parts per series). #series and #series-<id> open the series view,
// #topic-<slug> filters the list by a tag's English label (#topic-outdoors);
// #2012-09 lands on a month.
(function () {
    const main = document.querySelector<HTMLElement>('[data-articles]');
    if (!main) return;

    const shownEl = main.querySelector<HTMLElement>('[data-shown]');
    const viewButtons = Array.from(main.querySelectorAll<HTMLButtonElement>('[data-view]'));
    const search = main.querySelector<HTMLInputElement>('[data-search]');
    const chips = Array.from(main.querySelectorAll<HTMLButtonElement>('[data-tag]'));
    const rows = Array.from(main.querySelectorAll<HTMLElement>('.arow'));
    const months = Array.from(main.querySelectorAll<HTMLElement>('[data-month]'));
    const empty = main.querySelector<HTMLElement>('[data-empty]');
    const status = main.querySelector<HTMLElement>('[data-status]');
    const cards = Array.from(main.querySelectorAll<HTMLElement>('.scard'));
    const index = main.querySelector<HTMLElement>('[data-date-index]');
    const cells = index ? Array.from(index.querySelectorAll<HTMLAnchorElement>('a.dmi-cell')) : [];
    const years = index ? Array.from(index.querySelectorAll<HTMLElement>('[data-year]')) : [];
    const hdr = document.querySelector<HTMLElement>('.hdr');

    let view: 'list' | 'series' = 'list';
    let tag = 'all';

    function bi(en: string, zh: string) {
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
            const n = Array.from(month.querySelectorAll<HTMLElement>('.arow')).filter((row) => !row.hidden).length;
            month.hidden = n === 0;
            const count = month.querySelector<HTMLElement>('[data-month-count]');
            if (count) count.innerHTML = bi(`${n} ${n === 1 ? 'article' : 'articles'}`, `${n} 篇`);
        });
        const shown = visibleRows().length;
        if (empty) empty.hidden = shown > 0;
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
        if (!shownEl) return;
        shownEl.textContent = String(view === 'list' ? visibleRows().length : cards.length);
    }

    // A tag's address name (its English label), and back.
    function slugOf(key: string) {
        return chips.find((chip) => chip.dataset.tag === key)?.dataset.slug || key;
    }

    function tagFor(name: string) {
        return chips.find((chip) => chip.dataset.slug === name)?.dataset.tag || 'all';
    }

    function setTag(next: string, record: boolean) {
        tag = tagFor(next);
        chips.forEach((chip) => chip.setAttribute('aria-pressed', chip.dataset.tag === tag ? 'true' : 'false'));
        filter(record);
        if (record) setHash(tag === 'all' ? '' : `topic-${slugOf(tag)}`);
    }

    chips.forEach((chip) => chip.addEventListener('click', () => setTag(chip.dataset.slug || 'all', true)));

    // The search lives in the address as ?q=, so going back from an
    // article, reloading or sharing the link brings the same results.
    // Browsers do not restore the field themselves (autocomplete is off).
    let queryTimer = 0;
    function recordQuery() {
        window.clearTimeout(queryTimer);
        const params = new URLSearchParams(window.location.search);
        const q = search ? search.value.trim() : '';
        if (q) params.set('q', q);
        else params.delete('q');
        const query = params.toString();
        try {
            history.replaceState(history.state, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
        } catch (_error) {
            // Not fatal: the list still filters.
        }
        // A referrer drops the #topic-…, so the article's "← Articles" reads
        // the whole address from here.
        try {
            sessionStorage.setItem('articles-list', window.location.href);
        } catch (_error) {
            // Then it goes back with the search only.
        }
    }

    if (search) {
        const saved = new URLSearchParams(window.location.search).get('q');
        if (saved) search.value = saved;
        search.addEventListener('input', () => {
            filter(true);
            window.clearTimeout(queryTimer);
            queryTimer = window.setTimeout(recordQuery, 300);
        });
        // Following a result before the pause still records the query, and
        // records it before the article reads the list's address as its
        // referrer.
        main.addEventListener('click', (event) => {
            const link = (event.target as Element).closest('a[href]');
            if (!link) return;
            recordQuery();
            // Where the row stood, so "← Articles" can put it back there.
            const row = link.closest<HTMLElement>('.arow');
            if (!row) return;
            try {
                sessionStorage.setItem('articles-spot', JSON.stringify({
                    url: window.location.href,
                    row: row.id,
                    top: Math.round(row.getBoundingClientRect().top),
                }));
            } catch (_error) {
                // Then the list opens at the top.
            }
        }, true);
        window.addEventListener('pagehide', recordQuery);
    }

    function setOpen(row: HTMLElement | null) {
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
            const target = event.target as Element;
            if (!target.closest('.arow-title, .arow-toggle')) {
                if (target.closest('a, button, input, label, .arow-ex')) return;
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.containsNode(row, true)) return;
            }
            setOpen(row);
        });
        // Hovering a row dims all the others. Series parts used to stay lit
        // together, which read as two rows hovered at once; the series pill
        // already shows the relation.
        row.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(hover: hover)').matches) return;
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
            if (n) cell.removeAttribute('aria-hidden');
            else cell.setAttribute('aria-hidden', 'true');
            const count = cell.querySelector<HTMLElement>('[data-n]');
            if (count && n) count.textContent = String(n);
        });
        years.forEach((row) => {
            const on = Array.from(row.querySelectorAll<HTMLAnchorElement>('a.dmi-cell:not(.is-off)'));
            row.hidden = on.length === 0;
            const year = row.querySelector<HTMLAnchorElement>('.dmi-year');
            const newest = on[on.length - 1];
            if (year && newest) {
                year.dataset.jump = newest.dataset.jump;
                year.setAttribute('href', `#${newest.dataset.jump}`);
            }
        });
    }

    function jump(key: string) {
        const month = document.getElementById(key);
        if (!month || month.hidden) return;
        month.scrollIntoView({ block: 'start' });
        month.classList.remove('is-arrived');
        void month.offsetWidth;
        month.classList.add('is-arrived');
        window.setTimeout(() => month.classList.remove('is-arrived'), 1700);
        const heading = month.querySelector<HTMLElement>('.amonth-jump');
        if (heading) heading.focus({ preventScroll: true });
    }

    if (index) {
        let invoker: HTMLElement | null = null;
        main.querySelectorAll<HTMLElement>('.amonth-jump').forEach((button) => {
            button.addEventListener('click', () => {
                invoker = button;
            });
        });

        index.addEventListener('beforetoggle', (event) => {
            if ((event as ToggleEvent).newState !== 'open') return;
            // Just under the heading that opened it, which is usually the
            // one stuck under the header; at the top when that leaves too
            // little room.
            const top0 = measure() + 8;
            let top = top0 + 44;
            if (invoker) {
                const r = invoker.getBoundingClientRect();
                if (r.bottom > 0 && r.bottom + 260 < window.innerHeight) top = Math.max(top0, r.bottom + 6);
            }
            index.style.top = `${Math.round(top)}px`;
            index.style.maxHeight = `${Math.round(window.innerHeight - top - 16)}px`;
            const month = invoker ? invoker.closest<HTMLElement>('.amonth') : null;
            cells.forEach((cell) => {
                if (month && cell.dataset.jump === month.id) cell.setAttribute('aria-current', 'true');
                else cell.removeAttribute('aria-current');
            });
        });

        index.addEventListener('toggle', (event) => {
            if ((event as ToggleEvent).newState !== 'open') {
                invoker = null;
                return;
            }
            const current = cells.find((cell) => cell.getAttribute('aria-current') === 'true');
            if (!current) return;
            index.scrollTop = Math.max(0, current.offsetTop - index.clientHeight / 2);
            current.focus({ preventScroll: true });
        });

        index.addEventListener('click', (event) => {
            const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-jump]');
            if (!link) return;
            event.preventDefault();
            index.hidePopover();
            jump(link.dataset.jump || '');
        });
    }

    measure();
    window.addEventListener('resize', measure);

    // ---- Series -----------------------------------------------------------

    function focusCard(card: HTMLElement) {
        cards.forEach((other) => other.classList.toggle('is-focus', other === card));
    }

    function selectPart(card: HTMLElement, index: number) {
        const nodes = Array.from(card.querySelectorAll<HTMLElement>('.rnode'));
        nodes.forEach((node, i) => {
            node.classList.toggle('is-sel', i === index);
            node.classList.toggle('is-done', i < index);
            node.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
        card.querySelectorAll<HTMLElement>('[data-part-detail]').forEach((part) => {
            part.classList.toggle('is-sel', part.dataset.partDetail === String(index));
        });
        const prog = card.querySelector<HTMLElement>('[data-prog]');
        if (prog) prog.innerHTML = bi(`Part ${index + 1} / ${nodes.length}`, `第 ${index + 1} / ${nodes.length} 篇`);
        focusCard(card);
    }

    cards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('is-focus')) focusCard(card);
        });
        card.addEventListener('focusin', () => {
            if (!card.classList.contains('is-focus')) focusCard(card);
        });
        card.querySelectorAll<HTMLElement>('.rnode').forEach((node) => {
            const index = Number(node.dataset.part) || 0;
            node.addEventListener('click', () => selectPart(card, index));
            node.addEventListener('pointerenter', (event) => {
                if (event.pointerType === 'mouse' && window.innerWidth >= 860 && !node.classList.contains('is-sel')) selectPart(card, index);
            });
        });
    });

    // ---- Views and the address ---------------------------------------------

    function setHash(hash: string) {
        const url = window.location.pathname + window.location.search + (hash ? `#${hash}` : '');
        try {
            history.replaceState(history.state, '', url);
        } catch (_error) {
            // Not fatal: the view still switches.
        }
    }

    function setView(next: 'list' | 'series', record: boolean) {
        view = next;
        main.classList.toggle('is-series', view === 'series');
        viewButtons.forEach((button) => button.setAttribute('aria-pressed', button.dataset.view === view ? 'true' : 'false'));
        syncCount();
        if (record) setHash(view === 'series' ? 'series' : tag === 'all' ? '' : `topic-${slugOf(tag)}`);
    }

    viewButtons.forEach((button) => {
        button.addEventListener('click', () => setView(button.dataset.view === 'series' ? 'series' : 'list', true));
    });

    main.querySelectorAll<HTMLButtonElement>('[data-to-series]').forEach((button) => {
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
        } else if (hash.startsWith('series-')) {
            setView('series', false);
            const card = cards.find((c) => c.id === hash);
            if (card) {
                focusCard(card);
                card.scrollIntoView({ block: 'start' });
            }
        } else if (hash.startsWith('topic-')) {
            setView('list', false);
            setTag(hash.slice('topic-'.length), false);
        } else if (/^\d{4}-\d{2}$/.test(hash)) {
            // blogs.html#2012-09: the browser already scrolled, but before
            // the header height was known.
            setView('list', false);
            jump(hash);
        } else {
            setView('list', false);
        }
    }

    // Back through "← Articles": reopen the row the reader followed and put
    // it where it stood. (The browser's own Back restores the page itself.)
    function restoreSpot() {
        let spot: { url?: string; row?: string; top?: number } | null = null;
        try {
            if (sessionStorage.getItem('articles-back') !== window.location.href) return;
            sessionStorage.removeItem('articles-back');
            spot = JSON.parse(sessionStorage.getItem('articles-spot') || 'null');
        } catch (_error) {
            return;
        }
        if (!spot || spot.url !== window.location.href || !spot.row) return;
        const row = document.getElementById(spot.row);
        if (!row || row.hidden || !rows.includes(row)) return;
        // Open it at once, not over 0.55s, so it has its height before the
        // scroll is measured.
        const animated = Array.from(row.querySelectorAll<HTMLElement>('.arow-ex, .arow-ex-clip'));
        animated.forEach((el) => {
            el.style.transition = 'none';
        });
        if (!row.classList.contains('is-open')) setOpen(row);
        void row.offsetHeight;
        animated.forEach((el) => {
            el.style.transition = '';
        });
        const top = spot.top || 0;
        let placed = 0;
        const place = () => {
            window.scrollBy(0, row.getBoundingClientRect().top - top);
            placed = window.scrollY;
        };
        place();
        // Fonts and images arriving later, and the excerpt that was open
        // folding away, move the row; follow them until the reader scrolls.
        const again = () => {
            if (Math.abs(window.scrollY - placed) < 2) place();
        };
        document.fonts?.ready.then(again);
        window.addEventListener('load', again, { once: true });
        window.setTimeout(again, 600);
    }

    window.addEventListener('hashchange', fromHash);
    fromHash();
    filter();
    restoreSpot();
})();
