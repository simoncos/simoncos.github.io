type SiteLanguage = "en" | "zh";
type TranslationParams = Record<string, string | number | boolean | null | undefined>;

interface SiteConfig {
    ownerName?: string;
    siteTitle?: string;
    siteVersion?: string;
    assetVersion?: string;
    basePath?: string;
    resolvePath?: (relativePath: string) => string;
}

interface ArticleEntry {
    file?: string;
    title?: string;
    excerpt?: string;
    html_content?: string;
    [key: string]: unknown;
}

interface ArticleSeries {
    name?: string;
    part?: string | number;
}

interface ArticleGroup {
    id?: string;
    date?: string;
    tags?: string[];
    languages?: Record<string, ArticleEntry>;
    series?: ArticleSeries;
    [key: string]: unknown;
}

interface ArticleGroupsData {
    lastUpdated: string | null;
    groups: ArticleGroup[];
    fileIndex: Map<string, ArticleGroupFileInfo>;
}

interface ArticleGroupFileInfo {
    group: ArticleGroup;
    language: string;
    entry: ArticleEntry;
}

interface SiteI18n {
    DEFAULT_LANGUAGE?: string;
    SUPPORTED_LANGUAGES?: readonly string[];
    getCurrentLanguage?: () => string;
    getLanguageFromUrl?: (url?: string) => string | null;
    getArticleLanguageFromPath?: (pathname?: string) => string | null;
    hasExplicitLanguage?: (url?: string) => boolean;
    setCurrentLanguage?: (
        language: string,
        options?: { persist?: boolean; updateUrl?: boolean; replace?: boolean }
    ) => string;
    t?: (key: string, params?: TranslationParams) => string;
    formatDate?: (dateValue: string, style?: "short" | "medium" | "long" | "month") => string;
    formatPostCount?: (count: number) => string;
    formatArchiveMonthNote?: (count: number) => string;
    formatSeriesPart?: (part: string | number) => string;
    localizeDocument?: (root?: ParentNode) => void;
    applyLanguageStateToInternalLinks?: (root?: ParentNode) => void;
    resolveLocalizedUrl?: (href: string, language?: string) => string;
    updateLanguageSwitcherState?: (root?: ParentNode) => void;
    normalizeLanguage?: (value: unknown) => string | null;
}

interface ArticleGroupsApi {
    fetchArticleGroups?: () => Promise<ArticleGroupsData>;
    getPreferredEntry?: (group: ArticleGroup, language: string) => ArticleEntry | null;
    getSecondaryEntry?: (group: ArticleGroup, language: string) => ArticleEntry | null;
    getGroupByFile?: (data: ArticleGroupsData | null, fileName: string | undefined) => ArticleGroupFileInfo | null;
}

interface Window {
    SITE_CONFIG?: SiteConfig;
    SITE_I18N?: SiteI18n;
    SITE_ARTICLE_GROUPS?: ArticleGroupsApi;
    initDarkMode?: () => void;
    toggleDarkMode?: () => void;
}
