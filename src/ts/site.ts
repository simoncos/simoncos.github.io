// Shared shell behaviour for every page in the v3 layout: language and theme
// toggles, the mobile menu, page transitions, external-link marking, the
// cursor-following image preview and copy buttons.
(function () {
    const shell = window.SITE_SHELL;
    if (!shell) return;

    const root = document.documentElement;
    const WIDE = 860;
    const EASE_IO = 'cubic-bezier(0.76, 0, 0.24, 1)';
    const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const langListeners: Array<(lang: SiteLanguage) => void> = [];
    let lang: SiteLanguage = shell.lang;

    function store(storage: Storage, key: string, value: string) {
        try {
            storage.setItem(key, value);
        } catch (_error) {
            // Storage can be refused; the page still works for this view.
        }
    }

    // ---- Language -------------------------------------------------------

    // Attributes that differ by language are listed in data-i18n; the Chinese
    // value sits in data-zh-<name>, the English one is remembered on first use.
    function localizeAttributes(scope: ParentNode) {
        scope.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
            (el.getAttribute('data-i18n') || '').split(/\s+/).forEach((name) => {
                if (!name) return;
                const enKey = `data-en-${name}`;
                if (!el.hasAttribute(enKey)) el.setAttribute(enKey, el.getAttribute(name) || '');
                const value = lang === 'zh' ? el.getAttribute(`data-zh-${name}`) : el.getAttribute(enKey);
                if (value !== null) el.setAttribute(name, value);
            });
        });
    }

    const titleEl = document.querySelector('title');
    const titleEn = titleEl ? titleEl.textContent || '' : document.title;

    function applyLang(next: SiteLanguage) {
        lang = next;
        shell.lang = next;
        root.setAttribute('data-lang', next);
        root.lang = next === 'zh' ? 'zh-Hans' : 'en';
        const zhTitle = titleEl ? titleEl.getAttribute('data-zh') : null;
        document.title = next === 'zh' && zhTitle ? zhTitle : titleEn;
        localizeAttributes(document);
        syncLangToggle();
        syncThemeButton();
        langListeners.forEach((listener) => listener(next));
    }

    function syncLangToggle() {
        document.querySelectorAll<HTMLAnchorElement>('[data-lang-toggle]').forEach((link) => {
            const url = new URL(window.location.href);
            url.searchParams.set('lang', lang === 'en' ? 'zh' : 'en');
            link.href = url.pathname + url.search + url.hash;
        });
    }

    function setLang(next: SiteLanguage) {
        store(localStorage, 'siteLanguage', next);
        const url = new URL(window.location.href);
        if (next === 'zh') url.searchParams.set('lang', 'zh');
        else url.searchParams.delete('lang');
        try {
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        } catch (_error) {
            // file:// and sandboxed frames can refuse; the view still switches.
        }
        applyLang(next);
    }

    shell.setLang = setLang;
    shell.onLang = (listener) => langListeners.push(listener);

    document.querySelectorAll<HTMLAnchorElement>('[data-lang-toggle]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            setLang(lang === 'en' ? 'zh' : 'en');
        });
    });

    // Articles are one language per file: the toggle is a link to the
    // translation, and following it also switches the site language.
    document.querySelectorAll<HTMLAnchorElement>('[data-lang-nav]').forEach((link) => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-lang-nav');
            if (target === 'zh' || target === 'en') store(localStorage, 'siteLanguage', target);
        });
    });

    // ---- Theme ----------------------------------------------------------

    const themeQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    function isDark() {
        return root.getAttribute('data-theme') === 'dark';
    }

    function syncThemeButton() {
        const label = isDark()
            ? (lang === 'zh' ? '浅色模式' : 'Light mode')
            : (lang === 'zh' ? '深色模式' : 'Dark mode');
        document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
        });
    }

    document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const next = isDark() ? 'light' : 'dark';
            store(localStorage, 'themeMode', next);
            root.setAttribute('data-theme-mode', next);
            root.setAttribute('data-theme', next);
            syncThemeButton();
        });
    });

    if (themeQuery) {
        const follow = () => {
            if (root.getAttribute('data-theme-mode') !== 'system') return;
            root.setAttribute('data-theme', themeQuery.matches ? 'dark' : 'light');
            syncThemeButton();
        };
        if (typeof themeQuery.addEventListener === 'function') themeQuery.addEventListener('change', follow);
    }

    // ---- Mobile menu ----------------------------------------------------

    const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
    const menuSheet = document.getElementById('menu-sheet');

    function setMenu(open: boolean) {
        if (!menuButton || !menuSheet) return;
        menuSheet.hidden = !open;
        menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        root.classList.toggle('menu-open', open);
    }

    if (menuButton && menuSheet) {
        menuButton.addEventListener('click', () => setMenu(Boolean(menuSheet.hidden)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !menuSheet.hidden) {
                setMenu(false);
                menuButton.focus();
            }
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth >= WIDE) setMenu(false);
        });
    }

    // ---- Page transitions -----------------------------------------------

    const main = document.querySelector<HTMLElement>('main');
    let curtain: HTMLElement | null = null;
    let covered = false;
    let timer = 0;

    function curtainEl() {
        if (!curtain) {
            curtain = document.createElement('div');
            curtain.className = 'curtain';
            curtain.setAttribute('aria-hidden', 'true');
            curtain.appendChild(document.createElement('span'));
            document.body.appendChild(curtain);
        }
        return curtain;
    }

    // Any navigation starts from a known state, so an interrupted
    // transition can never leave the overlay or a faded <main> behind.
    function reset() {
        window.clearTimeout(timer);
        covered = false;
        if (curtain) {
            curtain.style.transition = 'none';
            curtain.style.clipPath = 'inset(0 0 100% 0)';
        }
        if (main) {
            main.style.transition = 'none';
            main.style.opacity = '';
            main.style.transform = '';
        }
    }

    function leave(href: string, note: { mode: string; label?: string }) {
        store(sessionStorage, shell.navKey, JSON.stringify({
            mode: note.mode,
            label: note.label || '',
            href: new URL(href, window.location.href).href,
            t: Date.now(),
        }));
        window.location.href = href;
        // If nothing happens (a refused or aborted load), do not stay covered.
        timer = window.setTimeout(reset, 8000);
    }

    function go(href: string, dest: SiteRoute) {
        reset();
        const here = shell.here;
        if (!here || here.section !== dest.section) {
            const label = dest.label[lang];
            const cover = curtainEl();
            (cover.firstChild as HTMLElement).textContent = label;
            cover.style.transition = 'none';
            cover.style.clipPath = 'inset(100% 0 0 0)';
            void cover.offsetHeight;
            cover.style.transition = `clip-path 0.36s ${EASE_IO}`;
            cover.style.clipPath = 'inset(0 0 0 0)';
            covered = true;
            timer = window.setTimeout(() => leave(href, { mode: 'curtain', label }), 380);
            return;
        }
        if (!main) {
            window.location.href = href;
            return;
        }
        main.style.transition = 'opacity 0.14s ease, transform 0.14s ease';
        main.style.opacity = '0';
        main.style.transform = 'translate3d(0, 6px, 0)';
        timer = window.setTimeout(() => leave(href, { mode: 'fade' }), 150);
    }

    // In-page swaps within a section (Work's wheel and topic views) use the
    // same fade as a within-section navigation.
    shell.fade = (swap: () => void) => {
        reset();
        if (shell.reduced || !main) {
            swap();
            return;
        }
        main.style.transition = 'opacity 0.14s ease, transform 0.14s ease';
        main.style.opacity = '0';
        main.style.transform = 'translate3d(0, 6px, 0)';
        timer = window.setTimeout(() => {
            swap();
            main.style.transition = 'none';
            main.style.transform = 'translate3d(0, 10px, 0)';
            void main.offsetHeight;
            main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
            main.style.opacity = '1';
            main.style.transform = 'none';
        }, 150);
    };

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = (event.target as Element | null)?.closest?.('a');
        if (!link || !link.href || link.hasAttribute('download')) return;
        if (link.target && link.target !== '_self') return;
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        const dest = shell.route(url.pathname);
        if (!dest || shell.reduced) return;
        event.preventDefault();
        if (menuSheet && !menuSheet.hidden) setMenu(false);
        go(url.href, dest);
    });

    window.addEventListener('pagehide', () => {
        store(sessionStorage, shell.lastKey, shell.here ? shell.here.section : 'none');
    });

    // A page restored from the back/forward cache comes back exactly as it
    // was left: covered or faded. Play the reveal instead of staying stuck.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        window.clearTimeout(timer);
        root.removeAttribute('data-arrive');
        if (curtain) {
            curtain.style.transition = covered ? `clip-path 0.42s ${EASE_IO}` : 'none';
            curtain.style.clipPath = 'inset(0 0 100% 0)';
        }
        covered = false;
        if (main) {
            main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
            main.style.opacity = '1';
            main.style.transform = 'none';
        }
        if (menuSheet) setMenu(false);
    });

    // The arrival overlay is a pseudo-element animated by CSS alone; drop the
    // attribute once it has played so it cannot replay.
    if (root.hasAttribute('data-arrive')) {
        window.setTimeout(() => {
            root.removeAttribute('data-arrive');
            root.removeAttribute('data-curtain');
        }, 900);
    }

    // ---- External links -------------------------------------------------

    function markExternal(scope: ParentNode) {
        scope.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((link) => {
            if (link.hasAttribute('data-ext') || link.hasAttribute('data-noext')) return;
            let host = '';
            try {
                host = new URL(link.href).host;
            } catch (_error) {
                return;
            }
            if (host === window.location.host) return;
            link.target = '_blank';
            link.rel = 'noopener';
            const text = link.textContent || '';
            if (/[↗→]/.test(text) || link.querySelector('img, canvas')) link.setAttribute('data-noext', '');
            else link.setAttribute('data-ext', '');
        });
    }

    // ---- Cursor-following preview ---------------------------------------

    let float: HTMLElement | null = null;
    let floatImg: HTMLImageElement | null = null;
    let floatHost: Element | null = null;

    function canFloat(event: PointerEvent) {
        return event.pointerType === 'mouse' && window.innerWidth >= WIDE;
    }

    function floatEl() {
        if (!float) {
            float = document.createElement('div');
            float.className = 'float';
            float.setAttribute('aria-hidden', 'true');
            floatImg = document.createElement('img');
            floatImg.alt = '';
            float.appendChild(floatImg);
            document.body.appendChild(float);
        }
        return float;
    }

    document.addEventListener('pointerover', (event) => {
        if (!canFloat(event)) return;
        const host = (event.target as Element | null)?.closest?.('[data-float]');
        if (!host || host === floatHost) return;
        if (host.closest('.is-out')) return;
        floatHost = host;
        const el = floatEl();
        const src = host.getAttribute('data-float') || '';
        if (floatImg && floatImg.getAttribute('src') !== src) floatImg.src = src;
        el.classList.add('on');
    });

    document.addEventListener('pointerout', (event) => {
        if (!floatHost || !float) return;
        const next = event.relatedTarget as Node | null;
        if (next && floatHost.contains(next)) return;
        floatHost = null;
        float.classList.remove('on');
    });

    window.addEventListener('pointermove', (event) => {
        if (float && event.pointerType === 'mouse') {
            float.style.transform = `translate3d(${event.clientX + 28}px, ${event.clientY - 130}px, 0)`;
        }
    }, { passive: true });

    // ---- Copy buttons ---------------------------------------------------

    document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => {
        let reset = 0;
        button.addEventListener('click', () => {
            const text = button.getAttribute('data-copy') || '';
            try {
                navigator.clipboard.writeText(text).catch(() => undefined);
            } catch (_error) {
                // Older browsers: the address is still visible to copy by hand.
            }
            button.classList.add('is-copied');
            window.clearTimeout(reset);
            reset = window.setTimeout(() => button.classList.remove('is-copied'), 1600);
        });
    });

    // ---- Start ----------------------------------------------------------

    // The 404 page names the address that was not found.
    document.querySelectorAll<HTMLElement>('[data-bad-path]').forEach((el) => {
        let path = window.location.pathname;
        try {
            path = decodeURIComponent(path);
        } catch (_error) {
            // Keep the encoded form.
        }
        el.textContent = ` · ${path}`;
    });

    if (main) markExternal(main);
    applyLang(lang);
})();
