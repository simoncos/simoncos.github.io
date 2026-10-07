"use strict";
// Favorites. On the index, pointing at a category glyph shows its latest
// notes. On a category page, every work is in the HTML; this searches, pages
// and filters them (state in ?q=, ?filter= and ?page=), shows a date only
// where it changes, folds long notes and opens every season of a merged work.
(function () {
    // ---- Index ------------------------------------------------------------
    const glyphs = Array.from(document.querySelectorAll('[data-glyphs] .glyph'));
    const reels = Array.from(document.querySelectorAll('[data-reel]'));
    function peek(id) {
        glyphs.forEach((glyph) => glyph.classList.toggle('is-peek', glyph.dataset.peek === id));
        reels.forEach((reel) => reel.classList.toggle('is-on', reel.dataset.reel === id));
    }
    glyphs.forEach((glyph) => {
        const id = glyph.dataset.peek || '';
        glyph.addEventListener('mouseenter', () => peek(id));
        glyph.addEventListener('focusin', () => peek(id));
    });
    // ---- Category page ------------------------------------------------------
    const mainCandidate = document.querySelector('[data-fav-cat]');
    const listCandidate = document.querySelector('[data-fav-list]');
    if (!mainCandidate || !listCandidate)
        return;
    const main = mainCandidate;
    const list = listCandidate;
    const FILTERS = ['all', 'reviewed', 'unreviewed'];
    const rows = Array.from(list.querySelectorAll(':scope > .fav-row'));
    const perPage = Number(main.dataset.perPage) || 20;
    const unitZh = main.dataset.unitZh || '';
    const [unitOne, unitMany] = (main.dataset.unitEn || 'item|items').split('|');
    const filterButtons = Array.from(main.querySelectorAll('[data-fav-filter]'));
    const range = main.querySelector('[data-fav-range]');
    const pager = main.querySelector('[data-fav-pager]');
    const prev = main.querySelector('[data-fav-prev]');
    const next = main.querySelector('[data-fav-next]');
    const pages = main.querySelector('[data-fav-pages]');
    const pos = main.querySelector('[data-fav-pos]');
    const rangeLong = main.querySelector('[data-fav-range-long]');
    const search = main.querySelector('[data-fav-search]');
    const status = main.querySelector('[data-fav-status]');
    const empty = main.querySelector('[data-fav-empty]');
    function bi(en, zh) {
        return `<span data-l="en">${en}</span><span data-l="zh" lang="zh-Hans">${zh}</span>`;
    }
    function readState() {
        const params = new URLSearchParams(window.location.search);
        const filter = params.get('filter');
        const page = Number.parseInt(params.get('page') || '1', 10);
        return {
            filter: FILTERS.includes(filter) ? filter : 'all',
            page: Number.isFinite(page) && page > 0 ? page : 1,
            q: (params.get('q') || '').trim(),
        };
    }
    function stateUrl(filter, page) {
        const url = new URL(window.location.href);
        url.hash = '';
        if (state.q)
            url.searchParams.set('q', state.q);
        else
            url.searchParams.delete('q');
        if (filter === 'all')
            url.searchParams.delete('filter');
        else
            url.searchParams.set('filter', filter);
        if (page <= 1)
            url.searchParams.delete('page');
        else
            url.searchParams.set('page', String(page));
        return url.pathname + url.search;
    }
    let state = readState();
    // ---- Search -------------------------------------------------------------
    // A row is found by its title, original title, meta line and notes, every
    // season's included. Case, full width, accents and the several middle dots
    // don't count: "dvorak" finds Dvořák, "英雄联盟:" finds 英雄联盟：. Each
    // character folds on its own, so a match maps back onto the page text.
    function foldText(text) {
        let folded = '';
        const at = [];
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i);
            let ch = text[i];
            if (code < 0x80)
                ch = ch.toLowerCase();
            else if (code < 0x4e00 || code > 0x9fff) {
                ch = ch.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[·・•‧]/g, '·').toLowerCase();
            }
            folded += ch;
            for (let k = 0; k < ch.length; k++)
                at.push(i);
        }
        return { folded, at };
    }
    function terms(q) {
        return foldText(q).folded.split(/\s+/).filter(Boolean);
    }
    function textNodes(el, out) {
        el.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE)
                out.push(child);
            else if (child instanceof Element && !child.matches('.visually-hidden, [aria-hidden="true"]'))
                textNodes(child, out);
        });
        return out;
    }
    const fields = new Map();
    rows.forEach((row) => {
        const own = [];
        row.querySelectorAll('.fav-title, .fav-orig, .fav-meta, .fav-review, .fav-mark-review').forEach((el) => {
            const part = el.closest('.fav-marks') ? 'marks' : el.classList.contains('fav-review') ? 'main' : 'head';
            textNodes(el, []).forEach((node) => own.push({ node, folded: foldText(node.data).folded, part }));
        });
        fields.set(row, own);
    });
    // Where each term is found in a row, or null when one of them is not.
    function find(row, words) {
        const own = fields.get(row) || [];
        const found = [];
        for (const word of words) {
            const where = own.filter((field) => field.folded.includes(word));
            if (!where.length)
                return null;
            found.push(where);
        }
        return found;
    }
    // A match in a folded note, or only in a later season, opens it.
    function reveal(row, found) {
        const open = (cls, selector) => {
            row.classList.add(cls);
            const button = row.querySelector(selector);
            if (button)
                button.setAttribute('aria-expanded', 'true');
        };
        if (found.some((where) => where.every((field) => field.part === 'marks')))
            open('is-all', '[data-fav-marks]');
        else if (row.classList.contains('fold-wide') && found.some((where) => where.every((field) => field.part !== 'head'))) {
            open('is-open', '[data-fav-fold]');
        }
    }
    const canMark = typeof Highlight === 'function' && typeof CSS !== 'undefined' && 'highlights' in CSS;
    function mark(words, shownRows) {
        if (!canMark)
            return;
        const ranges = [];
        shownRows.forEach((row) => {
            (fields.get(row) || []).forEach((field) => {
                const { folded, at } = foldText(field.node.data);
                words.forEach((word) => {
                    for (let i = folded.indexOf(word); i !== -1; i = folded.indexOf(word, i + word.length)) {
                        const range = document.createRange();
                        range.setStart(field.node, at[i]);
                        range.setEnd(field.node, at[i + word.length - 1] + 1);
                        ranges.push(range);
                    }
                });
            });
        });
        if (ranges.length)
            CSS.highlights.set('fav-q', new Highlight(...ranges));
        else
            CSS.highlights.delete('fav-q');
    }
    function matches(row) {
        return state.filter === 'all' || (state.filter === 'reviewed') === (row.dataset.reviewed === 'true');
    }
    function setLink(link, page) {
        if (!link)
            return;
        if (page === null) {
            link.removeAttribute('href');
            link.classList.add('is-disabled');
            link.setAttribute('aria-disabled', 'true');
        }
        else {
            link.href = stateUrl(state.filter, page);
            link.dataset.page = String(page);
            link.classList.remove('is-disabled');
            link.removeAttribute('aria-disabled');
        }
    }
    let total = 0;
    function render() {
        const words = terms(state.q);
        const found = new Map();
        const searched = words.length
            ? rows.filter((row) => {
                const where = find(row, words);
                if (where)
                    found.set(row, where);
                return !!where;
            })
            : rows;
        const reviewed = searched.filter((row) => row.dataset.reviewed === 'true').length;
        const counts = { all: searched.length, reviewed, unreviewed: searched.length - reviewed };
        const matching = searched.filter(matches);
        total = matching.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const page = Math.min(state.page, totalPages);
        const start = (page - 1) * perPage;
        const end = Math.min(start + perPage, total);
        const shown = new Set(matching.slice(start, end));
        let previous = '';
        let first = true;
        rows.forEach((row) => {
            const onCandidate = shown.has(row);
            row.hidden = !onCandidate;
            row.classList.remove('is-open', 'is-all');
            row.querySelectorAll('[data-fav-fold], [data-fav-marks]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
            if (!onCandidate)
                return;
            const on = onCandidate;
            const date = row.dataset.marked || '';
            row.classList.toggle('is-repeat', !first && date === previous);
            row.classList.toggle('is-first', first);
            previous = date;
            first = false;
            const where = found.get(row);
            if (where)
                reveal(row, where);
        });
        list.classList.add('is-paged');
        mark(words, Array.from(shown));
        if (empty)
            empty.hidden = total > 0;
        filterButtons.forEach((button) => {
            const filter = button.dataset.favFilter;
            button.setAttribute('aria-pressed', filter === state.filter ? 'true' : 'false');
            const n = button.querySelector('.seg-n');
            if (n)
                n.textContent = String(counts[filter]);
        });
        if (range)
            range.textContent = total ? `${start + 1}–${end} / ${total}` : '0';
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
            if (pos)
                pos.textContent = `${page} / ${totalPages}`;
            if (rangeLong) {
                const en = `${start + 1}–${end} of ${total} ${total === 1 ? unitOne : unitMany}`;
                const zh = `第 ${start + 1}–${end} ${unitZh}，共 ${total} ${unitZh}`;
                rangeLong.innerHTML = bi(en, zh);
            }
        }
    }
    function replay() {
        list.style.animation = 'none';
        void list.offsetHeight;
        list.style.animation = 'om-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both';
    }
    function go(filter, page, focusList) {
        state = { filter, page, q: state.q };
        try {
            history.pushState(null, '', stateUrl(filter, page));
            window.SITE_SHELL?.syncLangToggle?.();
        }
        catch (_error) {
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
            const filter = button.dataset.favFilter;
            if (filter !== state.filter)
                go(filter, 1, false);
        });
    });
    if (pager) {
        pager.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-page]');
            if (!link || !link.hasAttribute('href'))
                return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return;
            event.preventDefault();
            go(state.filter, Number(link.dataset.page), true);
        });
    }
    list.addEventListener('click', (event) => {
        const buttonCandidate = event.target.closest('[data-fav-fold], [data-fav-marks]');
        if (!buttonCandidate)
            return;
        const button = buttonCandidate;
        const rowCandidate = button.closest('.fav-row');
        if (!rowCandidate)
            return;
        const row = rowCandidate;
        const cls = button.hasAttribute('data-fav-fold') ? 'is-open' : 'is-all';
        const open = !row.classList.contains(cls);
        row.classList.toggle(cls, open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (!open && row.getBoundingClientRect().top < 0)
            row.scrollIntoView({ block: 'start' });
    });
    // Typing replaces the address rather than adding a history step per key.
    let announcing = 0;
    function query() {
        const q = search ? search.value.trim() : '';
        if (q === state.q)
            return;
        state = { filter: state.filter, page: 1, q };
        try {
            history.replaceState(null, '', stateUrl(state.filter, 1));
            window.SITE_SHELL?.syncLangToggle?.();
        }
        catch (_error) {
            // The view still changes; only the address stays behind.
        }
        render();
        window.clearTimeout(announcing);
        announcing = window.setTimeout(() => {
            if (!status)
                return;
            status.innerHTML = !state.q
                ? ''
                : total
                    ? bi(`${total} ${total === 1 ? unitOne : unitMany} found`, `找到 ${total} ${unitZh}`)
                    : bi('Nothing matches.', '没有匹配的作品。');
        }, 600);
    }
    if (search) {
        search.value = state.q;
        // Wait for a pinyin or kana composition to finish before searching.
        search.addEventListener('input', (event) => {
            if (!event.isComposing)
                query();
        });
        search.addEventListener('compositionend', query);
        search.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && search.value) {
                event.preventDefault();
                search.value = '';
                query();
            }
            else if (event.key === 'Enter' && window.matchMedia('(pointer: coarse)').matches) {
                // Put the keyboard away so the results can be seen.
                search.blur();
            }
        });
    }
    window.addEventListener('popstate', () => {
        state = readState();
        if (search)
            search.value = state.q;
        render();
    });
    render();
})();
