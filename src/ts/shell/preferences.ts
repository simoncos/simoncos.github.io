export function installPreferences(shell: SiteShell, root: HTMLElement) {
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
    // theme-init.js may already have switched the title to Chinese; it keeps
    // the English one in data-en.
    const titleEn = titleEl ? titleEl.getAttribute('data-en') || titleEl.textContent || '' : document.title;

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
        document.querySelectorAll<HTMLAnchorElement>('[data-lang-peer]').forEach((link) => {
            const target = link.getAttribute('data-lang-nav');
            const peerCandidate = target === 'zh' ? root.getAttribute('data-section-zh') : root.getAttribute('data-section-en');
            if (!peerCandidate) return;
            const peer = peerCandidate;
            const url = new URL(peer, window.location.href);
            url.search = window.location.search;
            url.searchParams.delete('lang');
            url.hash = window.location.hash;
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
    // History API updates do not emit hashchange or popstate. Page scripts
    // refresh this real link after changing their address, so it can also be
    // copied or opened in another tab with the current filters and section.
    shell.syncLangToggle = syncLangToggle;
    window.addEventListener('hashchange', syncLangToggle);
    window.addEventListener('popstate', syncLangToggle);
    window.addEventListener('pageshow', syncLangToggle);

    document.querySelectorAll<HTMLAnchorElement>('[data-lang-toggle]').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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


    return { applyLang, get lang() { return lang; }, store };
}
