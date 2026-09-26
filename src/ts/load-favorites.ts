// Favorites (收藏) category pages: every work is in the HTML, in marking order.
// This script pages them, filters by whether a work has a review, folds long
// reviews and merged seasons. Filtering never reorders the list.
(function () {
    type Filter = 'all' | 'reviewed' | 'unreviewed';

    const FILTERS: Filter[] = ['all', 'reviewed', 'unreviewed'];
    const MOBILE_QUERY = '(max-width: 899px)';
    // A review folds only when it would hide at least two lines.
    const CLAMP_LINES = { desktop: 5, mobile: 8 };

    document.addEventListener('DOMContentLoaded', () => {
        const main = document.querySelector<HTMLElement>('.favorites-shell');
        const list = document.querySelector<HTMLOListElement>('[data-favorites-list]');
        const pager = document.querySelector<HTMLElement>('[data-favorites-pager]');
        const filterGroup = document.querySelector<HTMLFieldSetElement>('.favorites-filter');
        if (!main || !list || !pager || !filterGroup) {
            return;
        }

        const rows = Array.from(list.querySelectorAll<HTMLLIElement>(':scope > .favorite-row'));
        const perPage = Number(main.dataset.favoritesPerPage) || 20;
        const unit = main.dataset.favoritesUnit || '';
        const filterButtons = Array.from(filterGroup.querySelectorAll<HTMLButtonElement>('[data-favorites-filter]'));
        let state = readState();

        function readState(): { filter: Filter; page: number } {
            const params = new URLSearchParams(window.location.search);
            const filter = params.get('filter') as Filter;
            const page = Number.parseInt(params.get('page') || '1', 10);
            return {
                filter: FILTERS.includes(filter) ? filter : 'all',
                page: Number.isFinite(page) && page > 0 ? page : 1
            };
        }

        function stateUrl(filter: Filter, page: number): string {
            const url = new URL(window.location.href);
            url.hash = '';
            if (filter === 'all') {
                url.searchParams.delete('filter');
            } else {
                url.searchParams.set('filter', filter);
            }
            if (page <= 1) {
                url.searchParams.delete('page');
            } else {
                url.searchParams.set('page', String(page));
            }
            return `${url.pathname}${url.search}`;
        }

        function matches(row: HTMLLIElement, filter: Filter): boolean {
            const reviewed = row.dataset.reviewed === 'true';
            return filter === 'all' || (filter === 'reviewed') === reviewed;
        }

        function render() {
            const matching = rows.filter((row) => matches(row, state.filter));
            const totalPages = Math.max(1, Math.ceil(matching.length / perPage));
            state.page = Math.min(state.page, totalPages);
            const start = (state.page - 1) * perPage;
            const visible = new Set(matching.slice(start, start + perPage));

            let previousDate = '';
            rows.forEach((row) => {
                const shown = visible.has(row);
                row.hidden = !shown;
                if (shown) {
                    // A date shows only when it differs from the row above on this page.
                    row.classList.toggle('is-date-repeat', row.dataset.marked === previousDate);
                    previousDate = row.dataset.marked || '';
                }
            });

            filterButtons.forEach((button) => {
                button.setAttribute('aria-pressed', button.dataset.favoritesFilter === state.filter ? 'true' : 'false');
            });

            renderPager(matching.length, totalPages, start);
            applyClamps(Array.from(visible));
        }

        function pageLink(page: number, label: string, rel?: string): string {
            const relAttr = rel ? ` rel="${rel}"` : '';
            return `<a href="${stateUrl(state.filter, page)}" data-favorites-page="${page}"${relAttr}>${label}</a>`;
        }

        function renderPager(count: number, totalPages: number, start: number) {
            if (totalPages <= 1) {
                pager.hidden = true;
                pager.innerHTML = '';
                return;
            }

            const prevLabel = '<span aria-hidden="true">←</span>上一页';
            const nextLabel = '下一页<span aria-hidden="true">→</span>';
            const prev = state.page > 1
                ? pageLink(state.page - 1, prevLabel, 'prev')
                : `<span class="favorites-pager-off" aria-disabled="true">${prevLabel}</span>`;
            const next = state.page < totalPages
                ? pageLink(state.page + 1, nextLabel, 'next')
                : `<span class="favorites-pager-off" aria-disabled="true">${nextLabel}</span>`;

            const numbers: string[] = [];
            for (let page = 1; page <= totalPages; page += 1) {
                const link = pageLink(page, String(page));
                numbers.push(`<li>${page === state.page ? link.replace('<a ', '<a aria-current="page" ') : link}</li>`);
            }

            const last = Math.min(start + perPage, count);
            pager.innerHTML = `
                <div class="favorites-pager-steps">
                    ${prev}
                    <ol class="favorites-pager-numbers">${numbers.join('')}</ol>
                    <p class="favorites-pager-position">${state.page} <span>/ ${totalPages}</span></p>
                    ${next}
                </div>
                <p class="favorites-pager-range">第 ${start + 1}–${last} ${unit}，共 ${count} ${unit}</p>
            `;
            pager.hidden = false;
        }

        function mainReview(row: HTMLLIElement): HTMLParagraphElement | null {
            return row.querySelector<HTMLParagraphElement>('.favorite-notes > .favorite-review, .favorite-notes-main > .favorite-review');
        }

        function applyClamps(visibleRows: HTMLLIElement[]) {
            const clampLines = window.matchMedia(MOBILE_QUERY).matches ? CLAMP_LINES.mobile : CLAMP_LINES.desktop;
            visibleRows.forEach((row) => {
                const review = mainReview(row);
                const button = review?.nextElementSibling as HTMLButtonElement | null;
                if (!review || !button || !button.classList.contains('favorite-more')) {
                    return;
                }
                if (button.getAttribute('aria-expanded') === 'true') {
                    return;
                }

                review.classList.remove('is-clamped');
                const lineHeight = Number.parseFloat(window.getComputedStyle(review).lineHeight);
                const lines = lineHeight > 0 ? Math.round(review.getBoundingClientRect().height / lineHeight) : 0;
                const folds = lines >= clampLines + 2;
                review.style.setProperty('--favorite-clamp', String(clampLines));
                review.classList.toggle('is-clamped', folds);
                button.hidden = !folds;
            });
        }

        function setToggleLabel(button: HTMLButtonElement, expanded: boolean, collapsedLabel: string) {
            button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            const label = button.querySelector('.favorite-toggle-label');
            if (label) {
                label.textContent = expanded ? '收起' : collapsedLabel;
            }
        }

        function keepRowInView(row: HTMLElement | null) {
            if (row && row.getBoundingClientRect().top < 0) {
                row.scrollIntoView({ block: 'start' });
            }
        }

        function go(filter: Filter, page: number, focusList: boolean) {
            state = { filter, page };
            window.history.pushState(state, '', stateUrl(filter, page));
            render();
            if (focusList) {
                filterGroup.scrollIntoView({ block: 'start' });
                list.focus({ preventScroll: true });
            }
        }

        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.favoritesFilter as Filter;
                if (filter !== state.filter) {
                    go(filter, 1, false);
                }
            });
        });

        pager.addEventListener('click', (event) => {
            const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-favorites-page]') : null;
            if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }
            event.preventDefault();
            go(state.filter, Number(link.dataset.favoritesPage), true);
        });

        list.addEventListener('click', (event) => {
            const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.favorite-toggle') : null;
            if (!button) {
                return;
            }
            const row = button.closest<HTMLLIElement>('.favorite-row');
            const expanded = button.getAttribute('aria-expanded') !== 'true';

            if (button.classList.contains('favorite-series-toggle')) {
                const all = document.getElementById(button.getAttribute('aria-controls') || '');
                const mainBlock = row?.querySelector<HTMLElement>('.favorite-notes-main');
                if (all) {
                    all.hidden = !expanded;
                }
                if (mainBlock) {
                    mainBlock.hidden = expanded;
                }
                setToggleLabel(button, expanded, button.dataset.collapsedLabel || '');
            } else {
                const review = button.previousElementSibling as HTMLElement | null;
                review?.classList.toggle('is-clamped', !expanded);
                setToggleLabel(button, expanded, '展开全文');
            }

            if (!expanded) {
                keepRowInView(row);
            }
        });

        window.addEventListener('popstate', () => {
            state = readState();
            render();
        });

        let resizeTimer = 0;
        window.addEventListener('resize', () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => applyClamps(rows.filter((row) => !row.hidden)), 150);
        });

        filterGroup.hidden = false;
        list.classList.add('is-paginated');
        render();
    });
})();
