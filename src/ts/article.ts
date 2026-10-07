// Article: reading progress, the contents list that follows the reader,
// smooth jumps, footnote highlighting and a back-to-top button.
(function () {
    // "← Articles" returns to the list as the reader left it: the search
    // and topic live in the list's address (?q=, #topic-…), which is the
    // referrer when the article was opened from it. A referrer has no
    // #topic-…, so the list also leaves its whole address in sessionStorage.
    const backToList = document.querySelector<HTMLAnchorElement>('[data-back-to-list]');
    if (backToList && document.referrer) {
        try {
            const from = new URL(document.referrer);
            const list = new URL(backToList.href);
            const page = (url: URL) => url.pathname.replace(/\.html$/, '');
            if (from.origin === list.origin && page(from) === page(list)) {
                let saved: string | null = null;
                try {
                    saved = sessionStorage.getItem('articles-list');
                } catch (_error) {
                    // Storage blocked: the referrer still has the search.
                }
                backToList.href = saved && saved.split('#')[0] === from.href ? saved : from.href;
                // Tells the list to return to where the reader left it.
                backToList.addEventListener('click', () => {
                    try {
                        sessionStorage.setItem('articles-back', backToList.href);
                    } catch (_error) {
                        // The list opens at the top.
                    }
                });
            }
        } catch (_error) {
            // Keep the plain link.
        }
    }

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
        const elCandidate = id ? document.getElementById(id) : null;
        if (!elCandidate) return;
        const el = elCandidate;
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
    // A heading becomes current a little below where a jump lands it.
    let activeLine = 140;

    function update() {
        ticking = false;
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const progress = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
        if (bar) bar.style.width = `${progress.toFixed(1)}%`;

        let next = heads.length ? 0 : -1;
        heads.forEach((head, i) => {
            if (head.el.getBoundingClientRect().top < activeLine) next = i;
        });
        if (next !== active) {
            active = next;
            heads.forEach((head, i) => head.links.forEach((link) => {
                link.classList.toggle('is-active', i === active);
                if (i === active) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            }));
        }

        if (toTop) toTop.classList.toggle('is-on', window.scrollY > 600);
        follow();
    }

    // ---- Contents on narrow screens ---------------------------------------

    // Below 860px the contents box sticks under the header once the reader
    // is past it. It steps aside while they scroll down, comes back as soon
    // as they scroll up, and steps aside again after 5 s without scrolling
    // or touching. It never hides while open or holding keyboard focus, and
    // a tap outside closes it. The back-to-top button follows it. This is
    // what mobile-scroll-ui.ts did before the v3 redesign.
    const narrow = window.matchMedia('(max-width: 859.98px)');
    const hdr = document.querySelector<HTMLElement>('.hdr');
    const tocSummary = tocBox ? tocBox.querySelector<HTMLElement>('summary') : null;
    const minDelta = 8;
    const idleMs = 5000;
    let stickTop = 84;
    let lastY = window.scrollY;
    let idleTimer = 0;

    function measure() {
        const h = hdr ? Math.round(hdr.getBoundingClientRect().height) : 76;
        document.documentElement.style.setProperty('--hdr-h', `${h}px`);
        stickTop = h + 8;
        const margin = heads.length ? parseFloat(getComputedStyle(heads[0].el).scrollMarginTop) : NaN;
        activeLine = (Number.isFinite(margin) ? margin : 96) + 44;
    }

    function stuck() {
        return !!tocBox && narrow.matches && tocBox.getBoundingClientRect().top <= stickTop + 1;
    }

    // Past the point where hiding makes sense: the box has reached the
    // header. An article without contents keeps the old threshold for the
    // back-to-top button.
    function past() {
        return tocBox ? stuck() : window.scrollY > Math.max(200, window.innerHeight * 0.6);
    }

    function holds(el: HTMLElement) {
        return !!el.querySelector(':focus-visible');
    }

    function setAway(away: boolean) {
        if (tocBox) tocBox.classList.toggle('is-away', away && !tocBox.open && !holds(tocBox));
        // The open list reaches the bottom of the screen, where the button
        // would sit on it.
        const listOpen = !!tocBox && tocBox.open && narrow.matches;
        if (toTop) toTop.classList.toggle('is-away', (away || listOpen) && !toTop.matches(':focus-visible'));
        if (away) window.clearTimeout(idleTimer);
        else idle();
    }

    function idle() {
        window.clearTimeout(idleTimer);
        if (!narrow.matches || !past() || (tocBox && tocBox.open)) return;
        idleTimer = window.setTimeout(() => {
            if (narrow.matches && past() && !(tocBox && tocBox.open)) setAway(true);
        }, idleMs);
    }

    function follow() {
        // Frozen while open: the class decides whether the list drops over
        // the text or pushes it down, and switching mid-way would move the
        // page under the reader.
        if (tocBox && !tocBox.open) tocBox.classList.toggle('is-stuck', stuck());
        const y = window.scrollY;
        if (!narrow.matches) {
            lastY = y;
            setAway(false);
            return;
        }
        const delta = y - lastY;
        if (Math.abs(delta) < minDelta) return;
        lastY = y;
        setAway(delta > 0 && past());
    }

    window.addEventListener('scroll', idle, { passive: true });
    window.addEventListener('touchstart', idle, { passive: true });
    window.addEventListener('click', idle, { passive: true });

    if (tocBox) {
        tocBox.addEventListener('toggle', () => {
            if (tocBox.open) {
                // Shown, and no idle timer while open (idle() checks).
                setAway(false);
                lastY = window.scrollY;
            } else {
                tocBox.classList.toggle('is-stuck', stuck());
                setAway(false);
            }
        });

        document.addEventListener('click', (event) => {
            if (!tocBox.open || !narrow.matches) return;
            if (event.target instanceof Node && tocBox.contains(event.target)) return;
            tocBox.open = false;
        });

        tocBox.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape' || !tocBox.open) return;
            tocBox.open = false;
            if (tocSummary) tocSummary.focus();
        });

        // Keyboard focus arriving in a hidden box brings it back.
        tocBox.addEventListener('focusin', () => {
            if (tocBox.classList.contains('is-away')) setAway(false);
        });
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });
    window.addEventListener('resize', () => {
        measure();
        lastY = window.scrollY;
        update();
    });

    function jump(el: HTMLElement, hash: string) {
        el.scrollIntoView({ behavior, block: 'start' });
        // Move focus with the view, so the next Tab continues from the
        // target rather than the link, and a closed contents box does not
        // drop focus to the page.
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
        try {
            history.pushState(null, '', `#${hash}`);
        } catch (_error) {
            // The jump already happened; the address simply stays.
        }
    }

    tocLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
            const elCandidate = id ? document.getElementById(id) : null;
            if (!elCandidate) return;
            const el = elCandidate;
            event.preventDefault();
            // Close the box first: closing it after the jump pulls the
            // article up by the box's height and leaves the heading
            // above the screen.
            if (tocBox) tocBox.open = false;
            jump(el, id);
        });
    });

    // ---- Footnotes --------------------------------------------------------

    let hlTimer = 0;
    let lit: HTMLElement | null = null;

    // The light fades 1.8 s after the page stops moving, so a long smooth
    // jump still arrives to it.
    function fadeLater() {
        window.clearTimeout(hlTimer);
        hlTimer = window.setTimeout(() => {
            if (lit) lit.classList.remove('is-hl');
            lit = null;
        }, 1800);
    }

    // Lights up a note, or on the way back the number in the text it
    // belongs to.
    function highlight(id: string) {
        const el = document.getElementById(id);
        if (!el || !(el.tagName === 'LI' || (el.tagName === 'SUP' && id.startsWith('fnref')))) return;
        document.querySelectorAll('.post-content .is-hl').forEach((other) => other.classList.remove('is-hl'));
        el.classList.add('is-hl');
        lit = el;
        fadeLater();
    }

    window.addEventListener('scroll', () => {
        if (lit) fadeLater();
    }, { passive: true });

    document.querySelectorAll<HTMLAnchorElement>('a.footnote-ref, a.footnote-backref').forEach((link) => {
        link.addEventListener('click', (event) => {
            const id = decodeURIComponent((link.getAttribute('href') || '').slice(1));
            const targetCandidate = id ? document.getElementById(id) : null;
            if (!targetCandidate) return;
            const target = targetCandidate;
            event.preventDefault();
            jump(target, id);
            highlight(id);
        });
    });

    if (window.location.hash) highlight(decodeURIComponent(window.location.hash.slice(1)));
    window.addEventListener('hashchange', () => highlight(decodeURIComponent(window.location.hash.slice(1))));

    // ---- Looping clips ----------------------------------------------------

    // Clips stand in for animated GIFs: silent, looping, no controls. A
    // reader who prefers reduced motion keeps the controls and the poster.
    // Click, Enter or Space pauses and resumes.
    document.querySelectorAll<HTMLVideoElement>('video.post-loop').forEach((video) => {
        if (reduced) return;
        video.muted = true;
        video.controls = false;
        video.tabIndex = 0;
        const toggle = () => {
            if (video.paused) void video.play().catch(() => undefined);
            else video.pause();
        };
        video.addEventListener('click', toggle);
        video.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggle();
        });
        const start = () => {
            video.play().catch((error: DOMException) => {
                // A refused autoplay (iOS Low Power Mode) brings the controls
                // back so the clip can still be started. Other failures, such
                // as Chrome pausing video in a background tab, are not refusals.
                if (error && error.name === 'NotAllowedError') video.controls = true;
            });
        };
        // A page opened in a background tab starts its clips when it is shown.
        if (document.hidden) document.addEventListener('visibilitychange', start, { once: true });
        else start();
    });

    if (toTop) {
        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior });
            const main = document.getElementById('main');
            if (main) main.focus({ preventScroll: true });
        });
    }

    measure();
    update();
})();
