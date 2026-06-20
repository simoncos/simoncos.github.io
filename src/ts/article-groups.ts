(function () {
    const siteConfig = window.SITE_CONFIG || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    let cachedPromise: Promise<ArticleGroupsData> | null = null;

    function normalizePayload(payload: { last_updated?: string; groups?: ArticleGroup[] } | ArticleGroup[]): { lastUpdated: string | null; groups: ArticleGroup[] } {
        if (Array.isArray(payload)) {
            return { lastUpdated: null, groups: payload };
        }

        return {
            lastUpdated: payload && payload.last_updated ? payload.last_updated : null,
            groups: payload && Array.isArray(payload.groups) ? payload.groups : []
        };
    }

    async function fetchArticleGroups() {
        if (!cachedPromise) {
            cachedPromise = fetch(resolvePath('data/article_index.json'))
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`article_index ${response.status}`);
                    }
                    return response.json();
                })
                .catch((error) => {
                    console.warn('Error loading article index, falling back to article groups:', error);
                    return fetch(resolvePath('data/article_groups.json')).then((response) => {
                        if (!response.ok) {
                            throw new Error(`article_groups ${response.status}`);
                        }
                        return response.json();
                    });
                })
                .then((payload: { last_updated?: string; groups?: ArticleGroup[] } | ArticleGroup[]) => {
                    const normalized = normalizePayload(payload);
                    const fileIndex = new Map<string, ArticleGroupFileInfo>();

                    normalized.groups.forEach((group) => {
                        Object.entries(group.languages || {}).forEach(([language, entry]) => {
                            if (!entry || !entry.file) {
                                return;
                            }
                            fileIndex.set(entry.file, { group, language, entry });
                        });
                    });

                    return {
                        lastUpdated: normalized.lastUpdated,
                        groups: normalized.groups,
                        fileIndex
                    };
                });
        }

        return cachedPromise;
    }

    function getPreferredEntry(group: ArticleGroup, language: string) {
        if (!group || !group.languages) {
            return null;
        }

        if (group.languages[language]) {
            return group.languages[language];
        }

        return group.languages.en || group.languages.zh || Object.values(group.languages)[0] || null;
    }

    function getSecondaryEntry(group: ArticleGroup, language: string) {
        if (!group || !group.languages) {
            return null;
        }

        const alternateLanguage = language === 'en' ? 'zh' : 'en';
        if (group.languages[alternateLanguage]) {
            return group.languages[alternateLanguage];
        }

        const preferred = getPreferredEntry(group, language);
        return Object.values(group.languages).find((entry) => entry && entry.file !== (preferred && preferred.file)) || null;
    }

    function getGroupByFile(data: ArticleGroupsData | null, fileName: string | undefined) {
        if (!data || !data.fileIndex) {
            return null;
        }

        return data.fileIndex.get(fileName) || null;
    }

    window.SITE_ARTICLE_GROUPS = {
        fetchArticleGroups,
        getPreferredEntry,
        getSecondaryEntry,
        getGroupByFile
    };
})();
