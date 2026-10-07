// Runs synchronously in <head>, before first paint: theme, language, fonts,
// and the arrival half of a page transition. Everything a later script needs
// from here is exposed as window.SITE_SHELL.
(function () {
    const root = document.documentElement;
    const THEME_KEY = 'themeMode';
    const LEGACY_DARK_KEY = 'darkMode';
    const LANG_KEY = 'siteLanguage';
    const NAV_KEY = 'site-nav';
    const LAST_KEY = 'site-last-section';
    const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Noto+Sans+SC:wght@400..700&display=swap';

    const LABELS: Record<string, SiteLabel> = {
        home: { en: 'Index', zh: '首页' },
        articles: { en: 'Articles', zh: '文章' },
        reading: { en: 'Reading', zh: '阅读' },
        work: { en: 'Work', zh: '作品' },
        apps: { en: 'Apps', zh: '应用' },
        toolkit: { en: 'Sleep Toolkit', zh: 'Sleep Toolkit' },
        music: { en: 'Music', zh: '音乐' },
        favorites: { en: 'Favorites', zh: '收藏' },
        about: { en: 'About', zh: '关于' },
    };

    function read(storage: Storage, key: string): string | null {
        try {
            return storage.getItem(key);
        } catch (_error) {
            return null;
        }
    }

    // Maps a same-origin path to its top-level section and the label the
    // transition curtain shows. Pages outside this shell (the standalone
    // essays, the talk deck, research pages) return null and get a plain
    // navigation.
    function route(pathname: string): SiteRoute | null {
        const path = pathname.replace(/\/{2,}/g, '/');
        const make = (section: string, label: string): SiteRoute => ({ section, label: LABELS[label] });
        if (path === '/' || /^\/index(\.zh)?\.html$/.test(path)) return make('home', 'home');
        if (/^\/blogs(\.zh)?\.html$/.test(path) || path === '/series.html' || path === '/tags.html') return make('articles', 'articles');
        if (/^\/blogs\/[^/]+\.html$/.test(path)) return make('articles', 'reading');
        if (/^\/gallery(\.zh)?\.html$/.test(path)) return make('work', 'work');
        if (path === '/apps.html') return make('work', 'apps');
        if (/^\/apps\/sleep-toolkit(\.en)?\.html$/.test(path)) return make('work', 'toolkit');
        if (/^\/gallery\/music\/[a-z0-9-]+\.html$/.test(path)) return make('work', 'music');
        if (path === '/favorites.html' || /^\/favorites\/[a-z]+\.html$/.test(path)) return make('favorites', 'favorites');
        if (/^\/about(\.zh)?\.html$/.test(path)) return make('about', 'about');
        return null;
    }

    // Theme: an explicit choice wins; otherwise follow the system, live.
    let mode = read(localStorage, THEME_KEY);
    if (mode !== 'dark' && mode !== 'light' && mode !== 'system') {
        const legacy = read(localStorage, LEGACY_DARK_KEY);
        mode = legacy === 'true' ? 'dark' : legacy === 'false' ? 'light' : 'system';
    }
    // Art-directed pages can fix their own palette without changing the saved site preference.
    const pageTheme = root.getAttribute('data-page-theme');
    if (pageTheme === 'dark' || pageTheme === 'light') mode = pageTheme;
    const systemDark = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'system' && systemDark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', mode);

    // Language: articles are one language per file, so theirs is fixed.
    // Elsewhere ?lang= wins and is remembered, then the stored choice.
    const fixed = root.getAttribute('data-page-lang');
    const sectionEn = root.getAttribute('data-section-en');
    const sectionZh = root.getAttribute('data-section-zh');
    if (sectionEn && sectionZh) {
        const current = new URL(window.location.href);
        const query = current.searchParams.get('lang');
        const requested = query === 'en' || query === 'zh' ? query : null;
        // The legacy English entry respects a saved choice. An explicit
        // Chinese document keeps its language even when storage differs.
        const legacyEntry = current.pathname === '/' || current.pathname.endsWith('/' + sectionEn);
        const chosen = requested || (legacyEntry && read(localStorage, LANG_KEY) === 'zh' ? 'zh' : fixed);
        if (chosen === 'zh' || chosen === 'en') {
            try { localStorage.setItem(LANG_KEY, chosen); } catch (_error) { /* URL remains sufficient. */ }
            const target = new URL(chosen === 'zh' ? sectionZh : sectionEn, current);
            const sameEnglishHome = sectionEn === 'index.html' && current.pathname === '/' && chosen === 'en';
            if (target.pathname !== current.pathname && !sameEnglishHome) {
                current.pathname = target.pathname;
                current.searchParams.delete('lang');
                window.location.replace(current.pathname + current.search + current.hash);
                return;
            }
        }
    }
    let lang: SiteLanguage = 'en';
    if (fixed === 'zh' || fixed === 'en') {
        lang = fixed;
    } else {
        const query = new URLSearchParams(window.location.search).get('lang');
        if (query === 'zh' || query === 'en') {
            lang = query;
            try {
                localStorage.setItem(LANG_KEY, query);
            } catch (_error) {
                // Private windows can refuse storage; the URL still carries it.
            }
        } else if (read(localStorage, LANG_KEY) === 'zh') {
            lang = 'zh';
        }
    }
    root.setAttribute('data-lang', lang);
    root.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    root.classList.add('js');
    const title = document.querySelector('title');
    if (lang === 'zh' && title && title.getAttribute('data-zh')) {
        // Setting document.title rewrites <title>, so keep the English one
        // for site.js to switch back to.
        if (!title.hasAttribute('data-en')) title.setAttribute('data-en', title.textContent || '');
        document.title = title.getAttribute('data-zh') || document.title;
    }

    // Fonts load without blocking first paint; the fallback stack is close.
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS;
    document.head.appendChild(fonts);

    // Back on the article list through "← Articles": the list stays hidden
    // until articles.js has put the reader's row back in its final type,
    // and never longer than 2.5 s.
    try {
        if (sessionStorage.getItem('articles-back') === window.location.href) {
            root.classList.add('is-returning');
            window.setTimeout(() => root.classList.remove('is-returning'), 2500);
        }
    } catch (_error) {
        // Storage blocked: the list shows at once.
    }

    const here = route(window.location.pathname);
    const reduced = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Arrival: the departing page covered the screen (curtain) or faded
    // <main> out and left a note; finish the same motion on this side.
    let arrive: { mode: string; label?: string } | null = null;
    try {
        const raw = sessionStorage.getItem(NAV_KEY);
        sessionStorage.removeItem(NAV_KEY);
        if (raw) {
            const note = JSON.parse(raw);
            const target = String(note.href || '').split('#')[0];
            if (Date.now() - note.t < 8000 && target === window.location.href.split('#')[0]) {
                arrive = note;
            }
        }
        if (!arrive && here) {
            const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const last = sessionStorage.getItem(LAST_KEY);
            if (entry && entry.type === 'back_forward' && last) {
                arrive = last === here.section ? { mode: 'fade' } : { mode: 'curtain', label: here.label[lang] };
            }
        }
    } catch (_error) {
        arrive = null;
    }
    if (arrive && !reduced) {
        root.setAttribute('data-arrive', arrive.mode === 'curtain' ? 'curtain' : 'fade');
        if (arrive.mode === 'curtain') root.setAttribute('data-curtain', arrive.label || '');
    }

    window.SITE_SHELL = { route, here, lang, labels: LABELS, reduced, navKey: NAV_KEY, lastKey: LAST_KEY };
})();
