// Article: reading progress, the contents list that follows the reader,
// smooth jumps, footnote highlighting and a back-to-top button.
(function () {
    const shell = window.SITE_SHELL;
    const reduced = !!(shell && shell.reduced);
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';

    const bar = document.querySelector<HTMLElement>('[data-progress]');
    const toTop = document.querySelector<HTMLButtonElement>('[data-to-top]');
    const tocBox = document.querySelector<HTMLDetailsElement>('.toc-box');
    const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc-link'));

    // Headings in document order, each with the contents links pointing at it.
    const heads: { el: HTMLElement; links: HTMLAnchorElement[] }[] = [];
    tocLinks.forEach((link) => {
        const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
        const el = id ? document.getElementById(id) : null;
        if (!el) return;
        let entry = heads.find((head) => head.el === el);
        if (!entry) {
            entry = { el, links: [] };
            heads.push(entry);
        }
        entry.links.push(link);
    });
    heads.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    let active = -1;
    let ticking = false;

    function update() {
        ticking = false;
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const progress = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
        if (bar) bar.style.width = `${progress.toFixed(1)}%`;

        let next = heads.length ? 0 : -1;
        heads.forEach((head, i) => {
            if (head.el.getBoundingClientRect().top < 140) next = i;
        });
        if (next !== active) {
            active = next;
            heads.forEach((head, i) => head.links.forEach((link) => link.classList.toggle('is-active', i === active)));
        }

        if (toTop) toTop.classList.toggle('is-on', window.scrollY > 600);
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });
    window.addEventListener('resize', update);

    function jump(el: HTMLElement, hash: string) {
        el.scrollIntoView({ behavior, block: 'start' });
        try {
            history.pushState(null, '', `#${hash}`);
        } catch (_error) {
            // The jump already happened; the address simply stays.
        }
    }

    tocLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
            const el = id ? document.getElementById(id) : null;
            if (!el) return;
            event.preventDefault();
            jump(el, id);
            if (tocBox) tocBox.open = false;
        });
    });

    // ---- Footnotes --------------------------------------------------------

    let hlTimer = 0;

    function highlight(id: string) {
        const note = document.getElementById(id);
        if (!note || note.tagName !== 'LI') return;
        document.querySelectorAll('.footnote li.is-hl').forEach((li) => li.classList.remove('is-hl'));
        note.classList.add('is-hl');
        window.clearTimeout(hlTimer);
        hlTimer = window.setTimeout(() => note.classList.remove('is-hl'), 1800);
    }

    document.querySelectorAll<HTMLAnchorElement>('a.footnote-ref').forEach((ref) => {
        ref.addEventListener('click', (event) => {
            const id = decodeURIComponent((ref.getAttribute('href') || '').slice(1));
            const note = id ? document.getElementById(id) : null;
            if (!note) return;
            event.preventDefault();
            jump(note, id);
            highlight(id);
        });
    });

    if (window.location.hash) highlight(decodeURIComponent(window.location.hash.slice(1)));
    window.addEventListener('hashchange', () => highlight(decodeURIComponent(window.location.hash.slice(1))));

    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior });
            const main = document.getElementById('main');
            if (main) main.focus({ preventScroll: true });
        });
    }

    update();
})();
