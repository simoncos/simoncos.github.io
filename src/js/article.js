"use strict";
// Article: reading progress, the contents list that follows the reader,
// smooth jumps, footnote highlighting and a back-to-top button.
(function () {
    const shell = window.SITE_SHELL;
    const reduced = !!(shell && shell.reduced);
    const behavior = reduced ? 'auto' : 'smooth';
    const bar = document.querySelector('[data-progress]');
    const toTop = document.querySelector('[data-to-top]');
    const tocBox = document.querySelector('.toc-box');
    const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
    // Headings in document order, each with the contents links pointing at it.
    const heads = [];
    tocLinks.forEach((link) => {
        const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
        const el = id ? document.getElementById(id) : null;
        if (!el)
            return;
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
        if (bar)
            bar.style.width = `${progress.toFixed(1)}%`;
        let next = heads.length ? 0 : -1;
        heads.forEach((head, i) => {
            if (head.el.getBoundingClientRect().top < 140)
                next = i;
        });
        if (next !== active) {
            active = next;
            heads.forEach((head, i) => head.links.forEach((link) => link.classList.toggle('is-active', i === active)));
        }
        if (toTop)
            toTop.classList.toggle('is-on', window.scrollY > 600);
    }
    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });
    window.addEventListener('resize', update);
    function jump(el, hash) {
        el.scrollIntoView({ behavior, block: 'start' });
        // Move focus with the view, so the next Tab continues from the
        // target rather than the link, and a closed contents box does not
        // drop focus to the page.
        if (!el.hasAttribute('tabindex'))
            el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        try {
            history.pushState(null, '', `#${hash}`);
        }
        catch (_error) {
            // The jump already happened; the address simply stays.
        }
    }
    tocLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
            const el = id ? document.getElementById(id) : null;
            if (!el)
                return;
            event.preventDefault();
            // Close the box first: closing it after the jump pulls the
            // article up by the box's height and leaves the heading
            // above the screen.
            if (tocBox)
                tocBox.open = false;
            jump(el, id);
        });
    });
    // ---- Footnotes --------------------------------------------------------
    let hlTimer = 0;
    function highlight(id) {
        const note = document.getElementById(id);
        if (!note || note.tagName !== 'LI')
            return;
        document.querySelectorAll('.footnote li.is-hl').forEach((li) => li.classList.remove('is-hl'));
        note.classList.add('is-hl');
        window.clearTimeout(hlTimer);
        hlTimer = window.setTimeout(() => note.classList.remove('is-hl'), 1800);
    }
    document.querySelectorAll('a.footnote-ref').forEach((ref) => {
        ref.addEventListener('click', (event) => {
            const id = decodeURIComponent((ref.getAttribute('href') || '').slice(1));
            const note = id ? document.getElementById(id) : null;
            if (!note)
                return;
            event.preventDefault();
            jump(note, id);
            highlight(id);
        });
    });
    if (window.location.hash)
        highlight(decodeURIComponent(window.location.hash.slice(1)));
    window.addEventListener('hashchange', () => highlight(decodeURIComponent(window.location.hash.slice(1))));
    // ---- Looping clips ----------------------------------------------------
    // Clips stand in for animated GIFs: silent, looping, no controls. A
    // reader who prefers reduced motion keeps the controls and the poster.
    // Click, Enter or Space pauses and resumes.
    document.querySelectorAll('video.post-loop').forEach((video) => {
        if (reduced)
            return;
        video.muted = true;
        video.controls = false;
        video.tabIndex = 0;
        const toggle = () => {
            if (video.paused)
                void video.play().catch(() => undefined);
            else
                video.pause();
        };
        video.addEventListener('click', toggle);
        video.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ')
                return;
            event.preventDefault();
            toggle();
        });
        const start = () => {
            video.play().catch((error) => {
                // A refused autoplay (iOS Low Power Mode) brings the controls
                // back so the clip can still be started. Other failures, such
                // as Chrome pausing video in a background tab, are not refusals.
                if (error && error.name === 'NotAllowedError')
                    video.controls = true;
            });
        };
        // A page opened in a background tab starts its clips when it is shown.
        if (document.hidden)
            document.addEventListener('visibilitychange', start, { once: true });
        else
            start();
    });
    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior });
            const main = document.getElementById('main');
            if (main)
                main.focus({ preventScroll: true });
        });
    }
    update();
})();
