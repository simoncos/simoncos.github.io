"use strict";
(function () {
    const SUPPORTED_LANGUAGES = ['en', 'zh'];
    const STORAGE_KEY = 'siteLanguage';
    const DEFAULT_LANGUAGE = 'en';
    const translations = {
        en: {
            nav_home: 'Home',
            nav_gallery: 'Gallery',
            nav_blogs: 'Blogs',
            nav_projects: 'Projects',
            nav_tags: 'Tags',
            nav_series: 'Series',
            nav_about: 'About',
            theme: 'Theme',
            switch_to_dark_mode: 'Switch to dark mode',
            switch_to_light_mode: 'Switch to light mode',
            switch_to_system_mode: 'Follow system theme',
            theme_mode_system: 'Theme: System',
            theme_mode_dark: 'Theme: Dark',
            theme_mode_light: 'Theme: Light',
            article: 'Article',
            site_kicker_home: 'Projects, writing, and field notes',
            site_kicker_blog: 'Blog',
            created: 'Created',
            updated: 'Updated',
            backlinks: 'Backlinks',
            tags: 'Tags',
            series: 'Series',
            recent_writing: 'Writing & projects',
            latest_posts: 'Latest',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: 'Talks, demos, visual essays, and artifacts — public edges of the system rather than a conventional portfolio.',
            loading_gallery_items: 'Loading gallery items...',
            no_gallery_items_found: 'No gallery items found yet.',
            error_loading_gallery_items: 'Error loading gallery. Please try again later.',
            gallery_type_talk: 'Talk',
            gallery_type_demo: 'Demo',
            gallery_type_visual_essay: 'Visual essay',
            gallery_type_artifact: 'Artifact',
            open_gallery_item: 'Open item',
            loading_blog_posts: 'Loading blog posts...',
            no_blog_posts: 'No blog posts found.',
            error_loading_blog_posts: 'Error loading blog posts. Please try again later.',
            last_updated: 'Last updated',
            archive: 'Archive',
            writing_archive: 'Writing archive',
            blog_posts: 'Blog posts',
            archive_lede: 'Essays, technical notes, and other long-form posts, newest first. Turn previews on when you want to scan quickly.',
            projects_kicker: 'Projects',
            projects_title: 'Projects',
            projects_overview_title: 'Project work',
            projects_overview_note: '1 maintained public project',
            projects_lede: 'Maintained, public-facing projects: usable tools, deployed systems, and things that can keep growing beyond a single essay or demo.',
            loading_projects: 'Loading projects...',
            no_projects_found: 'No projects yet.',
            error_loading_projects: 'Error loading projects. Please try again later.',
            project_type_data_essay: 'Data essay',
            project_type_tool: 'Tool',
            project_type_web_app: 'Web app',
            open_project: 'Open project',
            show_previews: 'Show previews',
            read_more: 'Read more',
            browse_by_tag: 'Browse by tag',
            discovery: 'Discovery',
            tags_lede: 'Start from a topic and branch out from there. The tag system stays intentionally lightweight, so this page remains quick to scan.',
            all: 'All',
            no_tags_found: 'No tags found.',
            error_loading_tags: 'Error loading tags data.',
            structured_reading: 'Structured reading',
            blog_series: 'Blog series',
            series_lede: 'Posts that follow the same line of thought. Use this view when you want an arc rather than a timeline.',
            no_series_found: 'No series found.',
            error_loading_series: 'Error loading series.',
            no_series: 'No series.',
            error_loading_post_series: 'Error loading series.',
            no_backlinks_found: 'No backlinks found.',
            error_loading_backlinks: 'Error loading backlinks.',
            about: 'About',
            about_profile: 'Profile',
            about_lede: 'I am a full-stack builder working across AI and data, based in Hong Kong. This site brings together technical work, long-form writing, and the parts of experience that usually get edited out of a portfolio.',
            about_what_i_do: 'What I do',
            about_what_i_do_title: 'Connecting the dots.',
            about_contact: 'Contact',
            about_reach_out: 'Get in touch',
            about_contact_email: 'Email',
            about_contact_linkedin: 'LinkedIn',
            about_contact_x: 'X',
            about_contact_github: 'GitHub',
            language_switcher: 'Language switcher',
            undated: 'Undated',
            post_count_one: '1 post',
            post_count_other: '{count} posts',
            archive_month_note_one: '1 post',
            archive_month_note_other: '{count} posts',
            series_part: 'Part {part}',
            page_not_found_title: 'Page not found',
            page_not_found_lede: "The page you're looking for doesn't exist, or may have moved.",
            back_to_home: 'Back to home'
        },
        zh: {
            nav_home: '首页',
            nav_gallery: 'Gallery',
            nav_blogs: '博客',
            nav_projects: '项目',
            nav_tags: '标签',
            nav_series: '系列',
            nav_about: '关于',
            theme: '外观',
            switch_to_dark_mode: '切换为深色模式',
            switch_to_light_mode: '切换为浅色模式',
            switch_to_system_mode: '跟随系统主题',
            theme_mode_system: '外观：跟随系统',
            theme_mode_dark: '外观：深色',
            theme_mode_light: '外观：浅色',
            article: '文章',
            site_kicker_home: '项目、写作与见闻',
            site_kicker_blog: '博客',
            created: '发布于',
            updated: '更新于',
            backlinks: '反向链接',
            tags: '标签',
            series: '系列',
            recent_writing: '文章与项目',
            latest_posts: '最新',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: 'Talks、Demos、Visual Essays、Artifacts——不是传统作品集，而是系统的公开边缘。',
            loading_gallery_items: '正在加载 Gallery…',
            no_gallery_items_found: '暂无 Gallery 项目。',
            error_loading_gallery_items: '加载 Gallery 失败，请稍后重试。',
            gallery_type_talk: 'Talk',
            gallery_type_demo: 'Demo',
            gallery_type_visual_essay: 'Visual Essay',
            gallery_type_artifact: 'Artifact',
            open_gallery_item: '打开',
            loading_blog_posts: '正在加载文章…',
            no_blog_posts: '暂无文章。',
            error_loading_blog_posts: '加载文章失败，请稍后重试。',
            last_updated: '更新于',
            archive: '归档',
            writing_archive: '文章归档',
            blog_posts: '全部文章',
            archive_lede: '这里按时间倒序收着随笔、技术笔记和其他长文。想先快速浏览一遍的话，可以打开摘要预览。',
            projects_kicker: '项目',
            projects_title: '项目',
            projects_overview_title: '项目作品',
            projects_overview_note: '1 个持续维护的公开项目',
            projects_lede: '这里放真正持续维护、对外可用的项目：工具、部署后的系统，以及能在一篇文章或一次 demo 之后继续生长的东西。',
            loading_projects: '正在加载项目…',
            no_projects_found: '暂无项目。',
            error_loading_projects: '加载项目失败，请稍后重试。',
            project_type_data_essay: '数据随笔',
            project_type_tool: '工具',
            project_type_web_app: 'Web App',
            open_project: '打开项目',
            show_previews: '显示摘要',
            read_more: '阅读全文',
            browse_by_tag: '按标签浏览',
            discovery: '从主题进入',
            tags_lede: '从一个主题切进去，再顺着相关文章慢慢展开。标签体系刻意保持轻量，方便快速浏览。',
            all: '全部',
            no_tags_found: '暂无标签。',
            error_loading_tags: '加载标签数据失败。',
            structured_reading: '顺着脉络读',
            blog_series: '系列文章',
            series_lede: '这里收着同一条线索里的文章。想顺着脉络往下读，而不是按时间翻找时，就看这里。',
            no_series_found: '暂无系列。',
            error_loading_series: '加载系列失败。',
            no_series: '不在任何系列中。',
            error_loading_post_series: '加载系列失败。',
            no_backlinks_found: '暂无反向链接。',
            error_loading_backlinks: '加载反向链接失败。',
            about: '关于',
            about_profile: '关于我',
            about_lede: '现居香港，做 AI 和数据相关的全栈开发。这里放着我的技术工作、长文写作，也放着那些通常不会写进作品集的经验和现场感。',
            about_what_i_do: '我在做什么',
            about_what_i_do_title: 'Connecting the dots.',
            about_contact: '联系方式',
            about_reach_out: '欢迎联系',
            about_contact_email: '邮箱',
            about_contact_linkedin: 'LinkedIn',
            about_contact_x: 'X',
            about_contact_github: 'GitHub',
            language_switcher: '语言切换',
            undated: '未注明日期',
            post_count_one: '1 篇文章',
            post_count_other: '{count} 篇文章',
            archive_month_note_one: '1 篇文章',
            archive_month_note_other: '{count} 篇文章',
            series_part: '第 {part} 篇',
            page_not_found_title: '页面不存在',
            page_not_found_lede: '你要找的页面不存在，或者已经移动到其他位置。',
            back_to_home: '回到首页'
        }
    };
    function normalizeLanguage(value) {
        if (!value) {
            return null;
        }
        const normalized = String(value).trim().toLowerCase();
        if (normalized.startsWith('en')) {
            return 'en';
        }
        if (normalized.startsWith('zh') || normalized.startsWith('cn')) {
            return 'zh';
        }
        return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : null;
    }
    function getLanguageFromUrl(url = window.location.href) {
        try {
            const parsed = new URL(url, window.location.href);
            return normalizeLanguage(parsed.searchParams.get('lang'));
        }
        catch (_error) {
            return null;
        }
    }
    function hasExplicitLanguage(url = window.location.href) {
        return !!getLanguageFromUrl(url);
    }
    function getStoredLanguage() {
        try {
            return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
        }
        catch (_error) {
            return null;
        }
    }
    function getArticleLanguageFromPath(pathname = window.location.pathname) {
        const normalizedPath = String(pathname || '');
        if (!/\/blogs\/[^/]+\.html$/i.test(normalizedPath)) {
            return null;
        }
        return normalizedPath.endsWith('.en.html') ? 'en' : 'zh';
    }
    let currentLanguage = getLanguageFromUrl() || getArticleLanguageFromPath() || getStoredLanguage() || DEFAULT_LANGUAGE;
    function persistLanguage(language) {
        try {
            window.localStorage.setItem(STORAGE_KEY, language);
        }
        catch (_error) {
            // Ignore storage failures.
        }
    }
    function updateUrlLanguage(language, replace = true) {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', language);
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        }
        else {
            window.history.pushState({}, '', url.toString());
        }
    }
    function interpolate(template, params = {}) {
        return String(template).replace(/\{(\w+)\}/g, (_match, key) => {
            return Object.prototype.hasOwnProperty.call(params, key) ? params[key] : '';
        });
    }
    function t(key, params = {}) {
        const active = translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
        const fallback = translations[DEFAULT_LANGUAGE] || {};
        return interpolate(active[key] || fallback[key] || key, params);
    }
    function formatDate(dateValue, style = 'medium') {
        if (!dateValue) {
            return t('undated');
        }
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) {
            return dateValue;
        }
        const locale = currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
        const optionsByStyle = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            medium: { year: 'numeric', month: currentLanguage === 'zh' ? 'numeric' : 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            month: { year: 'numeric', month: 'long' }
        };
        return new Intl.DateTimeFormat(locale, optionsByStyle[style] || optionsByStyle.medium).format(parsed);
    }
    function formatPostCount(count) {
        return count === 1 ? t('post_count_one') : t('post_count_other', { count });
    }
    function formatArchiveMonthNote(count) {
        return count === 1 ? t('archive_month_note_one') : t('archive_month_note_other', { count });
    }
    function formatSeriesPart(part) {
        return t('series_part', { part });
    }
    function isInternalHtmlLink(url) {
        return url.origin === window.location.origin && /\.html$/i.test(url.pathname);
    }
    function resolveLocalizedUrl(href, language = currentLanguage) {
        try {
            const url = new URL(href, window.location.href);
            if (!isInternalHtmlLink(url)) {
                return url.toString();
            }
            if (hasExplicitLanguage()) {
                url.searchParams.set('lang', language);
            }
            else {
                url.searchParams.delete('lang');
            }
            return url.origin === window.location.origin
                ? `${url.pathname}${url.search}${url.hash}`
                : url.toString();
        }
        catch (_error) {
            return href;
        }
    }
    function applyLanguageStateToInternalLinks(root = document) {
        root.querySelectorAll('a[href]').forEach((anchor) => {
            if (anchor.dataset.skipLangRewrite === 'true') {
                return;
            }
            const rawHref = anchor.getAttribute('href') || '';
            if (!rawHref || rawHref.startsWith('#') || /^[a-z]+:/i.test(rawHref)) {
                return;
            }
            anchor.setAttribute('href', resolveLocalizedUrl(rawHref));
        });
    }
    function localizeDocument(root = document) {
        root.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });
        root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
            element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
        });
        root.querySelectorAll('[data-i18n-title]').forEach((element) => {
            element.setAttribute('title', t(element.dataset.i18nTitle));
        });
        root.querySelectorAll('[data-date]').forEach((element) => {
            const style = element.dataset.dateFormat || 'medium';
            element.textContent = formatDate(element.dataset.date, style);
        });
        applyLanguageStateToInternalLinks(root);
    }
    function updateLanguageSwitcherState(root = document) {
        root.querySelectorAll('[data-site-language]').forEach((element) => {
            const isActive = element.dataset.siteLanguage === currentLanguage;
            element.classList.toggle('active', isActive);
            element.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }
    function dispatchLanguageChange() {
        window.dispatchEvent(new CustomEvent('site-language-change', {
            detail: { language: currentLanguage }
        }));
    }
    function setCurrentLanguage(language, options = {}) {
        const normalized = normalizeLanguage(language);
        if (!normalized) {
            return currentLanguage;
        }
        const { persist = true, updateUrl = hasExplicitLanguage(), replace = true } = options;
        currentLanguage = normalized;
        if (persist) {
            persistLanguage(normalized);
        }
        if (updateUrl) {
            updateUrlLanguage(normalized, replace);
        }
        localizeDocument(document);
        updateLanguageSwitcherState(document);
        dispatchLanguageChange();
        return currentLanguage;
    }
    document.addEventListener('click', (event) => {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const languageButton = eventTarget ? eventTarget.closest('[data-site-language]') : null;
        if (languageButton) {
            const targetLanguage = normalizeLanguage(languageButton.dataset.siteLanguage);
            if (!targetLanguage) {
                return;
            }
            const body = document.body;
            const variantFile = body.dataset[`article${targetLanguage.toUpperCase()}File`];
            const currentFile = window.location.pathname.split('/').pop();
            const shouldNavigate = body.classList.contains('article-page') && variantFile && variantFile !== currentFile;
            setCurrentLanguage(targetLanguage, { updateUrl: hasExplicitLanguage(), replace: true });
            if (shouldNavigate) {
                window.location.href = resolveLocalizedUrl(variantFile, targetLanguage);
            }
            event.preventDefault();
            return;
        }
        const languageSwitchLink = eventTarget ? eventTarget.closest('[data-language-switch][data-target-language]') : null;
        if (languageSwitchLink) {
            const targetLanguage = normalizeLanguage(languageSwitchLink.dataset.targetLanguage);
            if (targetLanguage) {
                setCurrentLanguage(targetLanguage, { updateUrl: hasExplicitLanguage(), replace: true });
            }
        }
    });
    document.addEventListener('DOMContentLoaded', () => {
        localizeDocument(document);
        updateLanguageSwitcherState(document);
    });
    window.SITE_I18N = {
        DEFAULT_LANGUAGE,
        SUPPORTED_LANGUAGES,
        getCurrentLanguage: () => currentLanguage,
        getLanguageFromUrl,
        getArticleLanguageFromPath,
        hasExplicitLanguage,
        setCurrentLanguage,
        t,
        formatDate,
        formatPostCount,
        formatArchiveMonthNote,
        formatSeriesPart,
        localizeDocument,
        applyLanguageStateToInternalLinks,
        resolveLocalizedUrl,
        updateLanguageSwitcherState,
        normalizeLanguage
    };
})();
