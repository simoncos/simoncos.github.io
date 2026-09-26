// Favorites. On the index, pointing at a category glyph shows its latest
// notes. On a category page, every work is in the HTML; this pages and
// filters them (state in ?filter= and ?page=), shows a date only where it
// changes, folds long notes and opens every season of a merged work.
(function () {
    // ---- Index ------------------------------------------------------------

    const glyphs = Array.from(document.querySelectorAll<HTMLElement>('[data-glyphs] .glyph'));
    const reels = Array.from(document.querySelectorAll<HTMLElement>('[data-reel]'));

    function peek(id: string) {
        glyphs.forEach((glyph) => glyph.classList.toggle('is-peek', glyph.dataset.peek === id));
        reels.forEach((reel) => reel.classList.toggle('is-on', reel.dataset.reel === id));
    }

    glyphs.forEach((glyph) => {
        const id = glyph.dataset.peek || '';
        glyph.addEventListener('mouseenter', () => peek(id));
        glyph.addEventListener('focusin', () => peek(id));
    });

    // ---- Category page ------------------------------------------------------

    const main = document.querySelector<HTMLElement>('[data-fav-cat]');
    const list = document.querySelector<HTMLOListElement>('[data-fav-list]');
    if (!main || !list) return;

    type Filter = 'all' | 'reviewed' | 'unreviewed';
    const FILTERS: Filter[] = ['all', 'reviewed', 'unreviewed'];
    const rows = Array.from(list.querySelectorAll<HTMLLIElement>(':scope > .fav-row'));
    const perPage = Number(main.dataset.perPage) || 20;
    const unitZh = main.dataset.unitZh || '';
    const [unitOne, unitMany] = (main.dataset.unitEn || 'item|items').split('|');
    const filterButtons = Array.from(main.querySelectorAll<HTMLButtonElement>('[data-fav-filter]'));
    const range = main.querySelector<HTMLElement>('[data-fav-range]');
    const pager = main.querySelector<HTMLElement>('[data-fav-pager]');
    const prev = main.querySelector<HTMLAnchorElement>('[data-fav-prev]');
    const next = main.querySelector<HTMLAnchorElement>('[data-fav-next]');
    const pages = main.querySelector<HTMLOListElement>('[data-fav-pages]');
    const pos = main.querySelector<HTMLElement>('[data-fav-pos]');
    const rangeLong = main.querySelector<HTMLElement>('[data-fav-range-long]');

    function readState(): { filter: Filter; page: number } {
        const params = new URLSearchParams(window.location.search);
        const filter = params.get('filter') as Filter;
        const page = Number.parseInt(params.get('page') || '1', 10);
        return {
            filter: FILTERS.includes(filter) ? filter : 'all',
            page: Number.isFinite(page) && page > 0 ? page : 1,
        };
    }

    function stateUrl(filter: Filter, page: number): string {
        const url = new URL(window.location.href);
        url.hash = '';
        if (filter === 'all') url.searchParams.delete('filter');
        else url.searchParams.set('filter', filter);
        if (page <= 1) url.searchParams.delete('page');
        else url.searchParams.set('page', String(page));
        return url.pathname + url.search;
    }

    let state = readState();

    function matches(row: HTMLLIElement) {
        return state.filter === 'all' || (state.filter === 'reviewed') === (row.dataset.reviewed === 'true');
    }

    function setLink(link: HTMLAnchorElement | null, page: number | null) {
        if (!link) return;
        if (page === null) {
            link.removeAttribute('href');
            link.classList.add('is-disabled');
            link.setAttribute('aria-disabled', 'true');
        } else {
            link.href = stateUrl(state.filter, page);
            link.dataset.page = String(page);
            link.classList.remove('is-disabled');
            link.removeAttribute('aria-disabled');
        }
    }

    function render() {
        const matching = rows.filter(matches);
        const total = matching.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const page = Math.min(state.page, totalPages);
        const start = (page - 1) * perPage;
        const end = Math.min(start + perPage, total);
        const shown = new Set(matching.slice(start, end));

        let previous = '';
        let first = true;
        rows.forEach((row) => {
            const on = shown.has(row);
            row.hidden = !on;
            row.classList.remove('is-open', 'is-all');
            row.querySelectorAll('[data-fav-fold], [data-fav-marks]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
            if (!on) return;
            const date = row.dataset.marked || '';
            row.classList.toggle('is-repeat', !first && date === previous);
            row.classList.toggle('is-first', first);
            previous = date;
            first = false;
        });
        list.classList.add('is-paged');

        filterButtons.forEach((button) => {
            button.setAttribute('aria-pressed', button.dataset.favFilter === state.filter ? 'true' : 'false');
        });
        if (range) range.textContent = total ? `${start + 1}–${end} / ${total}` : '0';

        if (pager) {
            pager.hidden = totalPages <= 1;
            setLink(prev, page > 1 ? page - 1 : null);
            setLink(next, page < totalPages ? page + 1 : null);
            if (pages) {
                const items = [];
                for (let p = 1; p <= totalPages; p++) {
                    const current = p === page ? ' aria-current="page"' : '';
                    items.push(`<li><a class="fav-page" href="${stateUrl(state.filter, p)}" data-page="${p}"${current}>${p}</a></li>`);
                }
                pages.innerHTML = items.join('');
            }
            if (pos) pos.textContent = `${page} / ${totalPages}`;
            if (rangeLong) {
                const en = `${start + 1}–${end} of ${total} ${total === 1 ? unitOne : unitMany}`;
                const zh = `第 ${start + 1}–${end} ${unitZh}，共 ${total} ${unitZh}`;
                rangeLong.innerHTML = `<span data-l="en">${en}</span><span data-l="zh" lang="zh-Hans">${zh}</span>`;
            }
        }
    }

    function replay() {
        list.style.animation = 'none';
        void list.offsetHeight;
        list.style.animation = 'om-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both';
    }

    function go(filter: Filter, page: number, focusList: boolean) {
        state = { filter, page };
        try {
            history.pushState(null, '', stateUrl(filter, page));
        } catch (_error) {
            // The view still changes; only the address stays behind.
        }
        render();
        replay();
        if (focusList) {
            window.scrollTo({ top: list.getBoundingClientRect().top + window.scrollY - 150 });
            list.focus({ preventScroll: true });
        }
    }

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const filter = button.dataset.favFilter as Filter;
            if (filter !== state.filter) go(filter, 1, false);
        });
    });

    if (pager) {
        pager.addEventListener('click', (event) => {
            const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-page]');
            if (!link || !link.hasAttribute('href')) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            go(state.filter, Number(link.dataset.page), true);
        });
    }

    list.addEventListener('click', (event) => {
        const button = (event.target as Element).closest<HTMLButtonElement>('[data-fav-fold], [data-fav-marks]');
        if (!button) return;
        const row = button.closest<HTMLLIElement>('.fav-row');
        if (!row) return;
        const cls = button.hasAttribute('data-fav-fold') ? 'is-open' : 'is-all';
        const open = !row.classList.contains(cls);
        row.classList.toggle(cls, open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open && row.getBoundingClientRect().top < 0) row.scrollIntoView({ block: 'start' });
    });

    window.addEventListener('popstate', () => {
        state = readState();
        render();
    });

    render();
})();
