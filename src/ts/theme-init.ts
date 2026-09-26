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
    const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Noto+Sans+SC:wght@400;500;700&display=swap';

    const LABELS: Record<string, SiteLabel> = {
        home: { en: 'Index', zh: '首页' },
        articles: { en: 'Articles', zh: '文章' },
        reading: { en: 'Reading', zh: '阅读' },
        work: { en: 'Work', zh: '作品' },
        projects: { en: 'Projects', zh: '项目' },
        toolkit: { en: 'Sleep Toolkit', zh: 'Sleep Toolkit' },
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
        if (path === '/' || path === '/index.html') return make('home', 'home');
        if (path === '/blogs.html' || path === '/series.html' || path === '/tags.html') return make('articles', 'articles');
        if (/^\/blogs\/[^/]+\.html$/.test(path)) return make('articles', 'reading');
        if (path === '/gallery.html') return make('work', 'work');
        if (path === '/projects.html') return make('work', 'projects');
        if (/^\/projects\/sleep-toolkit(\.en)?\.html$/.test(path)) return make('work', 'toolkit');
        if (path === '/favorites.html' || /^\/favorites\/[a-z]+\.html$/.test(path)) return make('favorites', 'favorites');
        if (path === '/about.html') return make('about', 'about');
        return null;
    }

    // Theme: an explicit choice wins; otherwise follow the system, live.
    let mode = read(localStorage, THEME_KEY);
    if (mode !== 'dark' && mode !== 'light' && mode !== 'system') {
        const legacy = read(localStorage, LEGACY_DARK_KEY);
        mode = legacy === 'true' ? 'dark' : legacy === 'false' ? 'light' : 'system';
    }
    const systemDark = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'system' && systemDark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-mode', mode);

    // Language: articles are one language per file, so theirs is fixed.
    // Elsewhere ?lang= wins and is remembered, then the stored choice.
    const fixed = root.getAttribute('data-page-lang');
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
        document.title = title.getAttribute('data-zh') || document.title;
    }

    // Fonts load without blocking first paint; the fallback stack is close.
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS;
    document.head.appendChild(fonts);

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
