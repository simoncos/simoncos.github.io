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
            nav_tags: 'Index',
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
            latest_posts: 'Latest dispatches',
            home_os_kicker: 'Start here',
            home_os_title: 'Tools, research, essays, and field notes.',
            home_os_title_accessible: 'Tools and research. Essays and field notes.',
            home_os_lede: 'I keep the most useful recent projects, essays, and notes here. Newer work stays up front; older pieces stay findable in the index.',
            home_os_primary_action: 'See what is active',
            home_os_secondary_action: 'About me',
            home_os_status_label: 'Recently',
            home_os_status_capture: 'Building',
            home_os_status_agents: 'Thinking',
            home_os_status_publish: 'Field',
            home_system_kicker: 'Featured paths',
            home_system_title: 'Four ways into the work.',
            home_system_capture_title: 'Build',
            home_system_capture_text: 'Small tools and prototypes that solve recurring problems.',
            home_system_knowledge_title: 'Research',
            home_system_knowledge_text: 'Structured investigations, comparisons, notes, and reports.',
            home_system_agent_title: 'Systems',
            home_system_agent_text: 'How tools, agents, memory, and publishing workflows fit together.',
            home_system_artifact_title: 'Field notes',
            home_system_artifact_text: 'Outdoor experience, body data, risk, and lessons from outside the screen.',
            home_trails_kicker: 'Reading paths',
            home_trails_title: 'Follow a thread.',
            home_trail_agents_title: 'AI collaborators',
            home_trail_agents_text: 'How agents help with review, research, operations, and writing.',
            home_trail_pkm_title: 'Personal systems',
            home_trail_pkm_text: 'Notes, workflows, boundaries, publishing, and the infrastructure around work.',
            home_trail_data_title: 'Data and body',
            home_trail_data_text: 'Sleep, health, movement, and self-tracking as evidence.',
            home_trail_field_title: 'Field notes',
            home_trail_field_text: 'Places, risk, action, and body feedback from outside the screen.',
            home_route_note: 'Notes are for today. Systems are for the long run.',
            home_field_note_kicker: 'Field note',
            home_field_note_title: 'This is a living index.',
            home_field_note_text: 'It grows, shifts, and gets better with use.',
            home_field_note_work: 'Work',
            home_field_note_work_value: 'All work lives in public.',
            home_field_note_place: 'Coordinates',
            home_dispatch_all: 'Browse all essays, projects, and notes',
            home_bottom_index_kicker: 'Index & archive',
            home_bottom_index_title: 'Older projects, essays, series, and notes.',
            home_bottom_about_kicker: 'About this site',
            home_bottom_about_title: 'Built from curiosity, notes, and repetition.',
            home_bottom_connect_kicker: 'Connect',
            home_bottom_connect_title: 'Email, RSS, GitHub, and code.',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: 'Talks, demos, visual essays, and research artifacts from different parts of the work.',
            gallery_personal_data_kicker: 'Personal Data Lab',
            gallery_personal_data_title: 'Personal data, made readable.',
            gallery_personal_data_lede: 'Sleep logs, body feedback, field notes, and tools belong together when they help explain a lived pattern.',
            gallery_personal_data_metric_nights: '3,656 nights',
            gallery_personal_data_metric_years: '10 years',
            gallery_personal_data_metric_flow: 'CSV to report',
            gallery_personal_data_sleep_title: 'Ten years of sleep records',
            gallery_personal_data_sleep_text: 'A visual essay built from long-running SleepCycle records.',
            gallery_personal_data_tool_title: 'Sleep Toolkit',
            gallery_personal_data_tool_text: 'A public tool for turning SleepCycle exports into readable reports.',
            gallery_personal_data_field_title: 'Haba Snow Mountain',
            gallery_personal_data_field_text: 'A field note about altitude, risk, training, and body feedback.',
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
            projects_overview_title: 'Project observatory',
            projects_overview_note: '1 maintained public project',
            projects_lede: 'Projects here include the live tool, related writing, inputs, outputs, and the next question behind the work.',
            loading_projects: 'Loading projects...',
            no_projects_found: 'No projects yet.',
            error_loading_projects: 'Error loading projects. Please try again later.',
            project_type_data_essay: 'Data essay',
            project_type_tool: 'Tool',
            project_type_web_app: 'Web app',
            open_project: 'Open project',
            project_observatory_kicker: 'Observatory',
            project_observatory_title: 'Sleep Toolkit: from raw records to readable reports.',
            project_observatory_updated: 'Status: maintained public tool',
            project_observatory_status: 'Maintained',
            project_observatory_kind: 'Data tool',
            project_observatory_summary: 'A practical bridge between raw SleepCycle exports and readable reports: structured JSON, interactive HTML, and PDF output.',
            project_observatory_primary_action: 'Open Sleep Toolkit',
            project_observatory_related: 'Read the data essay',
            project_observatory_input_label: 'Input',
            project_observatory_input: 'SleepCycle CSV exports and long-running personal sleep records.',
            project_observatory_output_label: 'Output',
            project_observatory_output: 'JSON, interactive report, PDF, and reusable analysis language.',
            project_observatory_links_label: 'Connected artifacts',
            project_observatory_links: 'Ten-year sleep visual essay',
            project_observatory_next_label: 'Next question',
            project_observatory_next: 'How should personal data tools explain uncertainty, habits, and behavior change without pretending to be medical advice?',
            project_observatory_surface_app_type: 'App',
            project_observatory_surface_app_title: 'Sleep Toolkit web app',
            project_observatory_surface_app_text: 'Upload a SleepCycle CSV and generate structured analysis outputs.',
            project_observatory_surface_essay_type: 'Visual essay',
            project_observatory_surface_essay_title: 'Ten years of sleep records',
            project_observatory_surface_essay_text: 'The long-form narrative and data story that explains the project context.',
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
            about_lede: 'I am a Hong Kong-based builder working across software, AI, data, research, and lived field notes. This site collects the tools, essays, experiments, talks, and field notes that grow out of that work.',
            about_motto_label: 'Motto',
            about_motto: 'Connecting the dots.',
            about_what_i_do: 'What I do',
            about_what_i_do_title: 'I work through four modes.',
            about_mode_build: 'Build',
            about_mode_build_title: 'Make usable tools',
            about_mode_build_text: 'I turn recurring problems into small systems, dashboards, prototypes, and public utilities.',
            about_mode_research: 'Research',
            about_mode_research_title: 'Structure messy questions',
            about_mode_research_text: 'I use evidence, timelines, comparisons, and constraints to make complex topics easier to inspect.',
            about_mode_systems: 'Systems',
            about_mode_systems_title: 'Design personal infrastructure',
            about_mode_systems_text: 'I care about workflows, memory, agents, publishing, feedback loops, and the boundaries between them.',
            about_mode_field: 'Field',
            about_mode_field_title: 'Keep contact with reality',
            about_mode_field_text: 'Outdoor experience, body data, health, places, and risk keep the work grounded outside screens.',
            about_principles_kicker: 'Operating principles',
            about_principles_title: 'The through-line is not a topic. It is a way of working.',
            about_principle_1: 'Make the work inspectable: expose sources, assumptions, states, and next questions instead of only final outputs.',
            about_principle_2: 'Use AI as a collaborator with boundaries: useful for pressure, synthesis, review, and automation, but not a substitute for judgment.',
            about_principle_3: 'Keep the site useful as the work changes: recent work should move forward, and older work should remain easy to find.',
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
            nav_blogs: '文章',
            nav_projects: '项目',
            nav_tags: '索引',
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
            latest_posts: '最近派发',
            home_os_kicker: '从这里开始',
            home_os_title: '工具与研究，文章与现场记录。',
            home_os_title_accessible: '工具与研究，文章与现场记录。',
            home_os_lede: '这里放最近值得看的项目、长文和记录。新线索放前面，旧内容留在索引里。',
            home_os_primary_action: '看最近在做什么',
            home_os_secondary_action: '关于我',
            home_os_status_label: '最近',
            home_os_status_capture: '构建',
            home_os_status_agents: '思考',
            home_os_status_publish: '现场',
            home_system_kicker: '推荐入口',
            home_system_title: '四条线索，进入不同的内容。',
            home_system_capture_title: '构建',
            home_system_capture_text: '解决重复问题的小工具和原型。',
            home_system_knowledge_title: '研究',
            home_system_knowledge_text: '结构化调研、比较、笔记和报告。',
            home_system_agent_title: '系统',
            home_system_agent_text: '工具、agent、记忆和发布工作流如何互相连接。',
            home_system_artifact_title: '现场笔记',
            home_system_artifact_text: '户外经验、身体数据、风险，以及屏幕之外的反馈。',
            home_trails_kicker: '阅读路径',
            home_trails_title: '顺着线索读。',
            home_trail_agents_title: 'AI 协作者',
            home_trail_agents_text: '我如何让 agent 参与审阅、研究、执行和写作。',
            home_trail_pkm_title: '个人系统',
            home_trail_pkm_text: '笔记、工作流、边界、发布，以及围绕工作长出来的基础设施。',
            home_trail_data_title: '数据与身体',
            home_trail_data_text: '把睡眠、健康、行动和自我追踪当作证据来读。',
            home_trail_field_title: '现场笔记',
            home_trail_field_text: '户外记录、风险和屏幕之外的身体反馈。',
            home_route_note: '笔记用于今天，系统服务长期。',
            home_field_note_kicker: '现场便签',
            home_field_note_title: '这是一个持续生长的索引。',
            home_field_note_text: '它会随着使用继续移动、收束和变好。',
            home_field_note_work: '工作方式',
            home_field_note_work_value: '公开地记录、构建和复用。',
            home_field_note_place: '坐标',
            home_dispatch_all: '浏览所有文章、项目和笔记',
            home_bottom_index_kicker: '索引与归档',
            home_bottom_index_title: '旧项目、文章、系列和笔记。',
            home_bottom_about_kicker: '关于本站',
            home_bottom_about_title: '由好奇、笔记和重复构建。',
            home_bottom_connect_kicker: '联系',
            home_bottom_connect_title: 'Email、RSS、GitHub 和代码。',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: '这里放演讲、Demo、视觉随笔和研究产物，来自不同工作线索。',
            gallery_personal_data_kicker: 'Personal Data Lab',
            gallery_personal_data_title: '把个人数据读成经验。',
            gallery_personal_data_lede: '睡眠记录、身体反馈、现场笔记和工具放在一起，才更容易看出生活里的真实模式。',
            gallery_personal_data_metric_nights: '3,656 个夜晚',
            gallery_personal_data_metric_years: '10 年',
            gallery_personal_data_metric_flow: 'CSV 到报告',
            gallery_personal_data_sleep_title: '十年睡眠记录',
            gallery_personal_data_sleep_text: '基于长期 SleepCycle 记录做成的视觉随笔。',
            gallery_personal_data_tool_title: 'Sleep Toolkit',
            gallery_personal_data_tool_text: '把 SleepCycle 导出转成可读报告的公开工具。',
            gallery_personal_data_field_title: '哈巴雪山之旅',
            gallery_personal_data_field_text: '关于海拔、风险、训练和身体反馈的现场记录。',
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
            projects_overview_title: '项目观察台',
            projects_overview_note: '1 个持续维护的公开项目',
            projects_lede: '这里不只放上线链接，也会把工具、相关文章、输入输出和下一步问题放在一起。',
            loading_projects: '正在加载项目…',
            no_projects_found: '暂无项目。',
            error_loading_projects: '加载项目失败，请稍后重试。',
            project_type_data_essay: '数据随笔',
            project_type_tool: '工具',
            project_type_web_app: 'Web App',
            open_project: '打开项目',
            project_observatory_kicker: '观察台',
            project_observatory_title: 'Sleep Toolkit：把原始记录变成可读报告。',
            project_observatory_updated: '状态：持续维护的公开工具',
            project_observatory_status: '持续维护',
            project_observatory_kind: '数据工具',
            project_observatory_summary: '一个把原始 SleepCycle 导出转成可读报告的实用桥梁：结构化 JSON、交互式 HTML 和 PDF 输出。',
            project_observatory_primary_action: '打开 Sleep Toolkit',
            project_observatory_related: '阅读数据随笔',
            project_observatory_input_label: '输入',
            project_observatory_input: 'SleepCycle CSV 导出，以及长期积累的个人睡眠记录。',
            project_observatory_output_label: '输出',
            project_observatory_output: 'JSON、交互式报告、PDF，以及可复用的分析语言。',
            project_observatory_links_label: '关联产物',
            project_observatory_links: '十年睡眠视觉随笔',
            project_observatory_next_label: '下一步问题',
            project_observatory_next: '个人数据工具如何解释不确定性、习惯和行为变化，同时不假装自己是医疗建议？',
            project_observatory_surface_app_type: 'App',
            project_observatory_surface_app_title: 'Sleep Toolkit Web App',
            project_observatory_surface_app_text: '上传 SleepCycle CSV，并生成结构化分析输出。',
            project_observatory_surface_essay_type: 'Visual Essay',
            project_observatory_surface_essay_title: '十年睡眠记录',
            project_observatory_surface_essay_text: '解释项目背景的长文叙事和数据故事。',
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
            about_lede: '现居香港，工作横跨软件、AI、数据、研究和真实经验。这个站点收着这些工作长出来的工具、文章、实验、演讲和现场记录。',
            about_motto_label: '座右铭',
            about_motto: 'Connecting the dots.',
            about_what_i_do: '我在做什么',
            about_what_i_do_title: '我通过四种模式工作。',
            about_mode_build: '构建',
            about_mode_build_title: '做可用的工具',
            about_mode_build_text: '把反复出现的问题做成小系统、dashboard、原型和公开工具。',
            about_mode_research: '研究',
            about_mode_research_title: '整理混乱问题',
            about_mode_research_text: '用证据、时间线、比较和约束，让复杂问题变得更容易检查。',
            about_mode_systems: '系统',
            about_mode_systems_title: '设计个人基础设施',
            about_mode_systems_text: '我关心工作流、记忆、agent、发布、反馈循环，以及它们之间的边界。',
            about_mode_field: '现场',
            about_mode_field_title: '和现实保持接触',
            about_mode_field_text: '户外经验、身体数据、健康、地点和风险，让工作不只停留在屏幕里。',
            about_principles_kicker: '操作原则',
            about_principles_title: '贯穿它们的不是一个主题，而是一种工作方式。',
            about_principle_1: '让工作可检查：暴露来源、假设、状态和下一步问题，而不只展示最终产物。',
            about_principle_2: '把 AI 当作有边界的协作者：适合施压、综合、审阅和自动化，但不能替代判断。',
            about_principle_3: '让站点随着工作变化而保持有用：最近的东西应该往前，旧内容也要容易找到。',
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
