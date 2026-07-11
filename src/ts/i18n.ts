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
            recent_writing: 'Recent writing',
            latest_posts: 'Latest posts',
            home_os_kicker: 'Tools, research, and field notes',
            home_os_title: 'Tools, research, essays, and field notes.',
            home_os_title_accessible: 'Tools and research. Essays and field notes.',
            home_os_lede: 'I keep the most useful recent projects, essays, and notes here. Newer work stays up front; older pieces stay findable in the index.',
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
            home_trail_agents_title: 'Building',
            home_trail_agents_text: 'Things I build and maintain: products, systems, and experiments.',
            home_trail_pkm_title: 'Thinking',
            home_trail_pkm_text: 'Notes and essays on how systems behave and how I think about them.',
            home_trail_data_title: 'Field',
            home_trail_data_text: 'Field notes on travel, training, and decisions in the real world.',
            home_trail_field_title: 'Field notes',
            home_trail_field_text: 'Places, risk, action, and body feedback from outside the screen.',
            home_route_note: 'Notes are for today. Systems are for the long run.',
            home_field_note_kicker: 'Field note',
            home_field_note_title: 'This is a living index.',
            home_field_note_text: 'It grows, shifts, and gets better with use.',
            home_field_note_work: 'Work',
            home_field_note_work_value: 'All work lives in public.',
            home_field_note_place: 'Coordinates',
            home_dispatch_all: 'All recent writing',
            home_bottom_index_kicker: 'Index & archive',
            home_bottom_index_title: 'Older projects, essays, series, and notes.',
            home_bottom_about_kicker: 'About this site',
            home_bottom_about_title: 'Built from curiosity, notes, and repetition.',
            home_bottom_connect_kicker: 'Connect',
            home_bottom_connect_title: 'Email, RSS, GitHub, and code.',
            gallery_kicker: 'Gallery',
            gallery_title: 'Gallery',
            gallery_lede: 'Talks, demos, visual essays, and research artifacts.',
            gallery_personal_data_kicker: 'Personal Data Lab',
            gallery_personal_data_title: 'A route through personal data work.',
            gallery_personal_data_lede: 'A curated path through data essays, tools, and field notes.',
            gallery_personal_data_cta: 'Explore all artifacts',
            gallery_personal_data_sleep_title: 'Ten years of sleep records',
            gallery_personal_data_sleep_text: 'Sleep records as a visual essay.',
            gallery_personal_data_tool_type: 'Tool',
            gallery_personal_data_tool_title: 'Sleep Toolkit',
            gallery_personal_data_tool_text: 'A converter from export to report.',
            gallery_personal_data_field_title: 'Haba Snow Mountain',
            gallery_personal_data_field_text: 'Altitude, risk, training, and body feedback.',
            gallery_research_card_title: 'Hermes Agent / HV Analysis',
            gallery_research_card_text: 'Evidence, questions, and limits in agent systems.',
            gallery_system_card_title: 'AI personal information system',
            gallery_system_card_text: 'A visual map of capture, memory, retrieval, and action.',
            gallery_filter_all: 'All',
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
            essays_compact_note: 'Long-form writing, newest first.',
            essays_preview_label: 'Preview',
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
            projects_overview_title: 'Project observatory',
            projects_overview_note: '1 maintained public project',
            projects_lede: 'Projects here include the live tool, related writing, inputs, outputs, and the next question behind the work.',
            projects_count_label: '1 project',
            projects_maintained_label: 'Maintained',
            projects_updated_label: 'Updated May 6, 2026',
            projects_index_action: 'Project index →',
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
            project_artifact_count: '1 item',
            project_observatory_next_label: 'Next question',
            project_observatory_next: 'How should personal data tools explain uncertainty, habits, and behavior change without pretending to be medical advice?',
            project_observatory_surface_app_type: 'App',
            project_observatory_surface_app_title: 'Sleep Toolkit web app',
            project_observatory_surface_app_text: 'Upload a SleepCycle CSV and generate structured analysis outputs.',
            project_observatory_surface_essay_type: 'Visual essay',
            project_observatory_surface_essay_title: 'Ten years of sleep records',
            project_observatory_surface_essay_text: 'The long-form narrative and data story that explains the project context.',
            projects_featured_kicker: 'Featured project · maintained',
            project_feature_subtitle: 'From raw records to readable reports.',
            project_feature_body: 'A maintained tool that turns long-running SleepCycle exports into structured JSON, interactive HTML reports, and PDF outputs. Private by design, running locally with full data ownership.',
            project_action_open: 'Open Sleep Toolkit',
            project_action_essay: 'Read data essay',
            project_report_kicker: 'Sleep report · May 2025',
            project_report_title: 'Report preview',
            project_metric_nights_label: 'Nights',
            project_metric_nights: '3,656',
            project_metric_years_label: 'Years',
            project_metric_years: '10',
            project_metric_outputs_label: 'Outputs',
            project_metric_outputs: 'JSON · HTML · PDF',
            project_fact_input_label: 'Input',
            project_fact_input: 'SleepCycle CSV exports and long-running personal sleep records.',
            project_fact_output_label: 'Output',
            project_fact_output: 'JSON · interactive report · PDF.',
            project_fact_stack_label: 'Stack',
            project_fact_stack: 'Python · Pandas · Jinja2 · Plotly · SQLite.',
            project_fact_status_label: 'Status',
            project_fact_status: 'Maintained · v1.4.2',
            project_index_kicker: 'Project index',
            project_index_title: 'Active and archived work',
            project_index_active: 'Active',
            project_index_archive: 'Archive',
            project_table_project: 'Project',
            project_table_status: 'Status',
            project_table_type: 'Type',
            project_table_summary: 'Summary',
            project_table_action: 'Action',
            project_row_status: 'Maintained',
            project_row_type: 'Personal data tool',
            project_row_summary: 'Transform personal sleep records into structured reports and insights.',
            project_row_action: 'Open →',
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
            recent_writing: '最近写作',
            latest_posts: '最新内容',
            home_os_kicker: '工具、研究和现场记录',
            home_os_title: '工具与研究，文章与现场记录。',
            home_os_title_accessible: '工具与研究，文章与现场记录。',
            home_os_lede: '这里放最近值得看的项目、长文和记录。新线索放前面，旧内容留在索引里。',
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
            home_trail_agents_title: '构建',
            home_trail_agents_text: '我持续构建和维护的产品、系统和实验。',
            home_trail_pkm_title: '思考',
            home_trail_pkm_text: '关于系统如何运转，以及我如何理解它们的笔记和文章。',
            home_trail_data_title: '现场',
            home_trail_data_text: '关于旅行、训练和现实决策的现场记录。',
            home_trail_field_title: '现场笔记',
            home_trail_field_text: '户外记录、风险和屏幕之外的身体反馈。',
            home_route_note: '笔记用于今天，系统服务长期。',
            home_field_note_kicker: '现场便签',
            home_field_note_title: '这是一个持续生长的索引。',
            home_field_note_text: '它会随着使用继续移动、收束和变好。',
            home_field_note_work: '工作方式',
            home_field_note_work_value: '公开地记录、构建和复用。',
            home_field_note_place: '坐标',
            home_dispatch_all: '所有最近写作',
            home_bottom_index_kicker: '索引与归档',
            home_bottom_index_title: '旧项目、文章、系列和笔记。',
            home_bottom_about_kicker: '关于本站',
            home_bottom_about_title: '由好奇、笔记和重复构建。',
            home_bottom_connect_kicker: '联系',
            home_bottom_connect_title: 'Email、RSS、GitHub 和代码。',
            gallery_kicker: '作品',
            gallery_title: '作品',
            gallery_lede: '演讲、Demo、视觉随笔和研究产物。',
            gallery_personal_data_kicker: '个人数据实验室',
            gallery_personal_data_title: '个人数据作品路径。',
            gallery_personal_data_lede: '把数据随笔、工具和现场记录串成一条路径。',
            gallery_personal_data_cta: '浏览全部作品',
            gallery_personal_data_sleep_title: '十年睡眠记录',
            gallery_personal_data_sleep_text: '把睡眠记录读成视觉随笔。',
            gallery_personal_data_tool_type: '工具',
            gallery_personal_data_tool_title: 'Sleep Toolkit',
            gallery_personal_data_tool_text: '把导出数据转成可读报告。',
            gallery_personal_data_field_title: '哈巴雪山之旅',
            gallery_personal_data_field_text: '海拔、风险、训练和身体反馈。',
            gallery_research_card_title: 'Hermes Agent / HV 分析',
            gallery_research_card_text: '关于 Agent 系统的证据、问题和边界。',
            gallery_system_card_title: 'AI 时代的个人信息系统',
            gallery_system_card_text: '关于捕捉、记忆、检索和行动的视觉地图。',
            gallery_filter_all: '全部',
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
            essays_compact_note: '长文写作，按时间倒序。',
            essays_preview_label: '预览',
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
            projects_overview_title: '项目观察台',
            projects_overview_note: '1 个持续维护的公开项目',
            projects_lede: '这里不只放上线链接，也会把工具、相关文章、输入输出和下一步问题放在一起。',
            projects_count_label: '1 个项目',
            projects_maintained_label: '持续维护',
            projects_updated_label: '更新于 2026 年 5 月 6 日',
            projects_index_action: '项目索引 →',
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
            project_artifact_count: '1 个条目',
            project_observatory_next_label: '下一步问题',
            project_observatory_next: '个人数据工具如何解释不确定性、习惯和行为变化，同时不假装自己是医疗建议？',
            project_observatory_surface_app_type: 'App',
            project_observatory_surface_app_title: 'Sleep Toolkit Web App',
            project_observatory_surface_app_text: '上传 SleepCycle CSV，并生成结构化分析输出。',
            project_observatory_surface_essay_type: 'Visual Essay',
            project_observatory_surface_essay_title: '十年睡眠记录',
            project_observatory_surface_essay_text: '解释项目背景的长文叙事和数据故事。',
            projects_featured_kicker: '精选项目 · 持续维护',
            project_feature_subtitle: '从原始记录到可读报告。',
            project_feature_body: '一个持续维护的工具，把长期 SleepCycle 导出转成结构化 JSON、交互式 HTML 报告和 PDF 输出。默认私有、本地运行，数据所有权留在自己手里。',
            project_action_open: '打开 Sleep Toolkit',
            project_action_essay: '阅读数据随笔',
            project_report_kicker: '睡眠报告 · 2025 年 5 月',
            project_report_title: '报告预览',
            project_metric_nights_label: '夜晚',
            project_metric_nights: '3,656',
            project_metric_years_label: '年份',
            project_metric_years: '10',
            project_metric_outputs_label: '输出',
            project_metric_outputs: 'JSON · HTML · PDF',
            project_fact_input_label: '输入',
            project_fact_input: 'SleepCycle CSV 导出，以及长期积累的个人睡眠记录。',
            project_fact_output_label: '输出',
            project_fact_output: 'JSON、交互式报告、PDF。',
            project_fact_stack_label: '技术栈',
            project_fact_stack: 'Python · Pandas · Jinja2 · Plotly · SQLite。',
            project_fact_status_label: '状态',
            project_fact_status: '持续维护 · v1.4.2',
            project_index_kicker: '项目索引',
            project_index_title: '进行中与归档项目',
            project_index_active: '进行中',
            project_index_archive: '归档',
            project_table_project: '项目',
            project_table_status: '状态',
            project_table_type: '类型',
            project_table_summary: '摘要',
            project_table_action: '动作',
            project_row_status: '持续维护',
            project_row_type: '个人数据工具',
            project_row_summary: '把个人睡眠记录转成结构化报告和洞察。',
            project_row_action: '打开 →',
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
        } catch (_error) {
            return null;
        }
    }

    function hasExplicitLanguage(url = window.location.href) {
        return !!getLanguageFromUrl(url);
    }

    function getStoredLanguage() {
        try {
            return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
        } catch (_error) {
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
        } catch (_error) {
            // Ignore storage failures.
        }
    }

    function updateUrlLanguage(language, replace = true) {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', language);
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
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
            } else {
                url.searchParams.delete('lang');
            }

            return url.origin === window.location.origin
                ? `${url.pathname}${url.search}${url.hash}`
                : url.toString();
        } catch (_error) {
            return href;
        }
    }

    function applyLanguageStateToInternalLinks(root: ParentNode = document) {
        root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
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

    function localizeDocument(root: ParentNode = document) {
        root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
            element.textContent = t(element.dataset.i18n);
        });

        root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
            element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
        });

        root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
            element.setAttribute('title', t(element.dataset.i18nTitle));
        });

        root.querySelectorAll<HTMLElement>('[data-date]').forEach((element) => {
            const style = element.dataset.dateFormat || 'medium';
            element.textContent = formatDate(element.dataset.date, style);
        });

        applyLanguageStateToInternalLinks(root);
    }

    function updateLanguageSwitcherState(root: ParentNode = document) {
        root.querySelectorAll<HTMLElement>('[data-site-language]').forEach((element) => {
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

    function setCurrentLanguage(language, options: { persist?: boolean; updateUrl?: boolean; replace?: boolean } = {}) {
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
        const languageButton = eventTarget ? eventTarget.closest<HTMLElement>('[data-site-language]') : null;
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

        const languageSwitchLink = eventTarget ? eventTarget.closest<HTMLElement>('[data-language-switch][data-target-language]') : null;
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
        localizeDocument,
        applyLanguageStateToInternalLinks,
        resolveLocalizedUrl,
        updateLanguageSwitcherState,
        normalizeLanguage
    };
})();
