"use strict";
(function () {
    const SUPPORTED_LANGUAGES = ['en', 'zh'];
    const STORAGE_KEY = 'siteLanguage';
    const DEFAULT_LANGUAGE = 'en';
    const translations = {
        en: {
            nav_home: 'Home',
            nav_gallery: 'Gallery',
            nav_blogs: 'Essays',
            nav_projects: 'Projects',
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
            recent_writing: 'Recent writing',
            recent_updates: 'Recent updates',
            latest_posts: 'Latest posts',
            latest_activity: 'Latest activity',
            home_os_kicker: 'Tools, research, and field notes',
            home_topline_title: 'Home',
            home_topline_updated: 'Updated Jun 25, 2026',
            home_topline_action: 'Essays & topics →',
            home_os_title: 'Tools, research, essays, and field notes.',
            home_os_title_accessible: 'Tools and research. Essays and field notes.',
            home_os_lede: 'I keep the most useful recent projects, essays, and notes here. Newer work stays up front; older pieces stay findable by topic.',
            home_os_primary_action: 'See what is active',
            home_os_secondary_action: 'About me',
            home_os_status_label: 'Recently',
            home_os_status_capture: 'Building',
            home_os_status_agents: 'Thinking',
            home_os_status_publish: 'Field',
            home_system_kicker: 'Current Index',
            home_system_title: 'Current Index',
            home_system_capture_title: 'Build',
            home_system_capture_text: 'Small tools and prototypes that solve recurring problems.',
            home_system_knowledge_title: 'Research',
            home_system_knowledge_text: 'Structured investigations, comparisons, notes, and reports.',
            home_system_agent_title: 'Systems',
            home_system_agent_text: 'How tools, agents, memory, and publishing workflows fit together.',
            home_system_artifact_title: 'Field notes',
            home_system_artifact_text: 'Outdoor experience, body data, risk, and lessons from outside the screen.',
            home_trails_kicker: 'Reading paths',
            home_trails_title: 'Reading paths',
            home_trail_projects_title: 'Projects',
            home_trail_projects_text: 'Things I build and maintain: products, systems, and experiments.',
            home_trail_essays_title: 'Essays',
            home_trail_essays_text: 'Notes and essays on how systems behave and how I think about them.',
            home_trail_gallery_title: 'Gallery',
            home_trail_gallery_text: 'Talks, demos, visual essays, and research artifacts.',
            home_route_note: 'Notes are for today. Systems are for the long run.',
            home_field_note_kicker: 'Field note',
            home_field_note_title: 'This is a living index.',
            home_field_note_text: 'It grows, shifts, and gets better with use.',
            home_field_note_work: 'Work',
            home_field_note_work_value: 'All work lives in public.',
            home_field_note_place: 'Coordinates',
            home_dispatch_all: 'Browse all writing',
            home_bottom_index_kicker: 'Essays & topics',
            home_bottom_index_title: 'Writing, reading paths, and topic trails.',
            home_bottom_about_kicker: 'About this site',
            home_bottom_about_title: 'Built from curiosity, notes, and repetition.',
            home_bottom_connect_kicker: 'Connect',
            home_bottom_connect_title: 'Email, RSS, GitHub, and code.',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: 'Talks, demos, visual essays, and research artifacts.',
            gallery_research_card_title: 'Hermes Agent / HV Analysis',
            gallery_research_card_text: 'Evidence, questions, and limits in agent systems.',
            gallery_filter_all: 'All',
            gallery_sections_label: 'Gallery sections',
            gallery_section_index: 'Section index',
            gallery_overview: 'Overview',
            gallery_filter_talks: 'Talks',
            gallery_filter_visual_essays: 'Visual essays',
            gallery_filter_research: 'Research artifacts',
            gallery_filter_field_notes: 'Field notes',
            loading_gallery_items: 'Loading gallery items...',
            no_gallery_items_found: 'No gallery items found yet.',
            error_loading_gallery_items: 'Error loading gallery. Please try again later.',
            gallery_type_talk: 'Talk',
            gallery_type_demo: 'Demo',
            gallery_type_visual_essay: 'Visual essay',
            gallery_type_artifact: 'Artifact',
            gallery_type_field_note: 'Field note',
            gallery_type_tool: 'Tool',
            open_gallery_item: 'Open item',
            loading_blog_posts: 'Loading blog posts...',
            no_blog_posts: 'No blog posts found.',
            error_loading_blog_posts: 'Error loading blog posts. Please try again later.',
            last_updated: 'Last updated',
            archive: 'Archive',
            writing_archive: 'Writing archive',
            blog_posts: 'Blog posts',
            archive_lede: 'Essays, technical notes, and other long-form posts, newest first. Turn previews on when you want to scan quickly.',
            essays_title: 'Essays',
            essays_compact_note: 'Long-form writing, reading paths, and topics.',
            essays_preview_label: 'Preview',
            essays_view_label: 'Essay browsing',
            essays_view_latest: 'Latest',
            essays_view_reading_paths: 'Reading paths',
            essays_view_topics: 'Topics',
            essays_discovery_label: 'Essay discovery',
            essays_reading_path: 'Reading path',
            essays_topics: 'Topics',
            essays_all_topics: 'All topics',
            essays_filter_kicker: 'Filters',
            essays_filter_all: 'All posts',
            essays_filter_field_note: 'Field note',
            essays_rss_feed: 'RSS feed',
            essay_feature_kicker: 'Latest essay',
            essay_feature_title: 'My Personal Knowledge Management System, 2026-03',
            essay_feature_text: 'A field report on capture, memory, AI collaboration, and personal infrastructure.',
            essay_side_kicker: 'Reading table',
            essay_side_item_1: 'Across Three Abysses: Sonnet, Qwen, and GPT-5.4',
            essay_side_item_2: 'My Haba Snow Mountain Journey',
            projects_kicker: 'Projects',
            projects_title: 'Projects',
            projects_overview_note: '1 maintained public project',
            projects_maintained_label: 'Maintained',
            projects_updated_label: 'Updated May 20, 2026',
            projects_updated_prefix: 'Updated',
            projects_count_singular: '1 maintained public project',
            projects_count_plural: '{count} maintained public projects',
            projects_index_action: 'Project index →',
            project_details_label: 'Project details',
            project_signals_suffix: 'signals',
            project_surfaces_title: 'Project surfaces',
            project_ledger_title: 'Project ledger',
            show_previews: 'Show previews',
            read_more: 'Read more',
            browse_by_tag: 'Browse by tag',
            discovery: 'Discovery',
            tags_lede: 'Start from a topic and branch out from there. The tag system stays intentionally lightweight, so this page remains quick to scan.',
            tags_filter_label: 'Tag filter',
            all: 'All',
            no_tags_found: 'No tags found.',
            error_loading_tags: 'Error loading tags data.',
            structured_reading: 'Structured reading',
            blog_series: 'Blog series',
            series_lede: 'Posts that follow the same line of thought. Use this view when you want an arc rather than a timeline.',
            series_count_one: '1 part',
            series_count_other: '{count} parts',
            no_series_found: 'No series found.',
            error_loading_series: 'Error loading series.',
            no_series: 'No series.',
            error_loading_post_series: 'Error loading series.',
            no_backlinks_found: 'No backlinks found.',
            error_loading_backlinks: 'Error loading backlinks.',
            about: 'About',
            about_profile: 'Profile',
            about_motto: 'Connecting the dots.',
            about_fact_location_label: 'Location',
            about_fact_location: 'Hong Kong',
            about_fact_current_label: 'Open here',
            about_fact_current: 'Projects, essays, gallery pieces, and public notes.',
            about_contact: 'Contact',
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
            nav_gallery: '作品',
            nav_blogs: '文章',
            nav_projects: '项目',
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
            recent_writing: '最近写作',
            recent_updates: '最近更新',
            latest_posts: '最新内容',
            latest_activity: '最新动态',
            home_os_kicker: '工具、研究和现场记录',
            home_topline_title: '首页',
            home_topline_updated: '更新于 2026 年 6 月 25 日',
            home_topline_action: '文章与主题 →',
            home_os_title: '工具与研究，文章与现场记录。',
            home_os_title_accessible: '工具与研究，文章与现场记录。',
            home_os_lede: '这里放最近值得看的项目、长文和记录。新线索放前面，旧内容可以按主题找到。',
            home_os_primary_action: '看最近在做什么',
            home_os_secondary_action: '关于我',
            home_os_status_label: '最近',
            home_os_status_capture: '构建',
            home_os_status_agents: '思考',
            home_os_status_publish: '现场',
            home_system_kicker: '当前索引',
            home_system_title: '当前索引',
            home_system_capture_title: '构建',
            home_system_capture_text: '解决重复问题的小工具和原型。',
            home_system_knowledge_title: '研究',
            home_system_knowledge_text: '结构化调研、比较、笔记和报告。',
            home_system_agent_title: '系统',
            home_system_agent_text: '工具、agent、记忆和发布工作流如何互相连接。',
            home_system_artifact_title: '现场笔记',
            home_system_artifact_text: '户外经验、身体数据、风险，以及屏幕之外的反馈。',
            home_trails_kicker: '阅读路径',
            home_trails_title: '阅读路径',
            home_trail_projects_title: '项目',
            home_trail_projects_text: '我持续构建和维护的产品、系统和实验。',
            home_trail_essays_title: '文章',
            home_trail_essays_text: '关于系统如何运转，以及我如何理解它们的笔记和文章。',
            home_trail_gallery_title: '作品',
            home_trail_gallery_text: '演讲、Demo、视觉随笔和研究产物。',
            home_route_note: '笔记用于今天，系统服务长期。',
            home_field_note_kicker: '现场便签',
            home_field_note_title: '这是一个持续生长的索引。',
            home_field_note_text: '它会随着使用继续移动、收束和变好。',
            home_field_note_work: '工作方式',
            home_field_note_work_value: '公开地记录、构建和复用。',
            home_field_note_place: '坐标',
            home_dispatch_all: '浏览全部文章',
            home_bottom_index_kicker: '文章与主题',
            home_bottom_index_title: '长文、阅读路径和主题线索。',
            home_bottom_about_kicker: '关于本站',
            home_bottom_about_title: '由好奇、笔记和重复构建。',
            home_bottom_connect_kicker: '联系',
            home_bottom_connect_title: 'Email、RSS、GitHub 和代码。',
            gallery_kicker: '作品',
            gallery_title: '作品',
            gallery_lede: '演讲、Demo、视觉随笔和研究产物。',
            gallery_research_card_title: 'Hermes Agent / HV 分析',
            gallery_research_card_text: '关于 Agent 系统的证据、问题和边界。',
            gallery_filter_all: '全部',
            gallery_sections_label: '作品章节索引',
            gallery_section_index: '章节索引',
            gallery_overview: '概览',
            gallery_filter_talks: '演讲',
            gallery_filter_visual_essays: '视觉随笔',
            gallery_filter_research: '研究产物',
            gallery_filter_field_notes: '现场笔记',
            loading_gallery_items: '正在加载作品…',
            no_gallery_items_found: '暂无作品。',
            error_loading_gallery_items: '加载作品失败，请稍后重试。',
            gallery_type_talk: 'Talk',
            gallery_type_demo: 'Demo',
            gallery_type_visual_essay: 'Visual Essay',
            gallery_type_artifact: 'Artifact',
            gallery_type_field_note: '现场笔记',
            gallery_type_tool: '工具',
            open_gallery_item: '打开',
            loading_blog_posts: '正在加载文章…',
            no_blog_posts: '暂无文章。',
            error_loading_blog_posts: '加载文章失败，请稍后重试。',
            last_updated: '更新于',
            archive: '归档',
            writing_archive: '文章归档',
            blog_posts: '全部文章',
            archive_lede: '这里按时间倒序收着随笔、技术笔记和其他长文。想先快速浏览一遍的话，可以打开摘要预览。',
            essays_title: '文章',
            essays_compact_note: '长文、阅读路径和主题索引。',
            essays_preview_label: '预览',
            essays_view_label: '文章浏览方式',
            essays_view_latest: '最新文章',
            essays_view_reading_paths: '阅读路径',
            essays_view_topics: '主题',
            essays_discovery_label: '文章发现',
            essays_reading_path: '阅读路径',
            essays_topics: '主题',
            essays_all_topics: '全部主题',
            essays_filter_kicker: '筛选',
            essays_filter_all: '全部文章',
            essays_filter_field_note: '现场笔记',
            essays_rss_feed: 'RSS 订阅',
            essay_feature_kicker: '最新文章',
            essay_feature_title: '我的个人知识管理系统 2026-03',
            essay_feature_text: '关于捕捉、记忆、AI 协作和个人基础设施的一份现场报告。',
            essay_side_kicker: '阅读桌',
            essay_side_item_1: '跨过三个深渊：Sonnet、Qwen 与 GPT-5.4',
            essay_side_item_2: '我的哈巴雪山之旅',
            projects_kicker: '项目',
            projects_title: '项目',
            projects_overview_note: '1 个持续维护的公开项目',
            projects_maintained_label: '持续维护',
            projects_updated_label: '更新于 2026 年 5 月 20 日',
            projects_updated_prefix: '更新于',
            projects_count_singular: '1 个持续维护的公开项目',
            projects_count_plural: '{count} 个持续维护的公开项目',
            projects_index_action: '项目索引 →',
            project_details_label: '项目详情',
            project_signals_suffix: '信号',
            project_surfaces_title: '项目入口',
            project_ledger_title: '项目台账',
            show_previews: '显示摘要',
            read_more: '阅读全文',
            browse_by_tag: '按标签浏览',
            discovery: '从主题进入',
            tags_lede: '从一个主题切进去，再顺着相关文章慢慢展开。标签体系刻意保持轻量，方便快速浏览。',
            tags_filter_label: '标签筛选',
            all: '全部',
            no_tags_found: '暂无标签。',
            error_loading_tags: '加载标签数据失败。',
            structured_reading: '顺着脉络读',
            blog_series: '系列文章',
            series_lede: '这里收着同一条线索里的文章。想顺着脉络往下读，而不是按时间翻找时，就看这里。',
            series_count_one: '1 篇',
            series_count_other: '{count} 篇',
            no_series_found: '暂无系列。',
            error_loading_series: '加载系列失败。',
            no_series: '不在任何系列中。',
            error_loading_post_series: '加载系列失败。',
            no_backlinks_found: '暂无反向链接。',
            error_loading_backlinks: '加载反向链接失败。',
            about: '关于',
            about_profile: '关于我',
            about_motto: 'Connecting the dots.',
            about_fact_location_label: '位置',
            about_fact_location: '香港',
            about_fact_current_label: '这里可以打开',
            about_fact_current: '项目、文章、作品和公开笔记。',
            about_contact: '联系方式',
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
    function applyDocumentLanguage(language = currentLanguage) {
        document.documentElement.lang = language;
    }
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
    function formatSeriesCount(count) {
        return count === 1 ? t('series_count_one') : t('series_count_other', { count });
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
        applyDocumentLanguage(normalized);
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
        applyDocumentLanguage();
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
        formatSeriesCount,
        localizeDocument,
        applyLanguageStateToInternalLinks,
        resolveLocalizedUrl,
        updateLanguageSwitcherState,
        normalizeLanguage
    };
})();
