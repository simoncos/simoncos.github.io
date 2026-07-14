document.addEventListener('DOMContentLoaded', function () {
    const backlinksList = document.getElementById('backlinks-list');
    if (!backlinksList) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const currentFile = window.location.pathname.split('/').pop();
    const backlinksSection = backlinksList.closest('.post-backlinks') as HTMLElement | null;

    function setBacklinksVisible(visible: boolean) {
        if (backlinksSection) {
            backlinksSection.style.display = visible ? '' : 'none';
        }
    }

    function hideBacklinks() {
        backlinksList.innerHTML = '';
        setBacklinksVisible(false);
    }
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;
    const parser = new DOMParser();

    let articleGroupsData = null;
    let backlinksData = null;

    function getCurrentLanguage() {
        return typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
    }

    function getPreferredEntry(languages, language) {
        if (!languages) {
            return null;
        }
        return languages[language] || languages.en || languages.zh || Object.values(languages)[0] || null;
    }

    function renderBacklinkItems(backlinks) {
        if (!backlinks.length) {
            hideBacklinks();
            return;
        }

        const currentLanguage = getCurrentLanguage();
        backlinksList.innerHTML = '';
        backlinks.forEach((item) => {
            const entry = getPreferredEntry(item.languages, currentLanguage);
            if (!entry || !entry.file) {
                return;
            }

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = entry.file;
            a.textContent = entry.title || entry.file;
            li.appendChild(a);
            backlinksList.appendChild(li);
        });

        if (!backlinksList.children.length) {
            hideBacklinks();
            return;
        }

        setBacklinksVisible(true);

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(backlinksList);
        }
    }

    function renderBacklinksFromData() {
        const backlinks = backlinksData && backlinksData.files
            ? backlinksData.files[currentFile] || []
            : [];
        renderBacklinkItems(backlinks);
    }

    function groupLinksToCurrentGroup(group: ArticleGroup, currentFiles: Set<string>) {
        return Object.values(group.languages || {}).some((entry) => {
            if (!entry || !entry.html_content) {
                return false;
            }

            const doc = parser.parseFromString(entry.html_content, 'text/html');
            return Array.from(doc.querySelectorAll('a[href]')).some((anchor) => {
                const href = anchor.getAttribute('href') || '';
                return currentFiles.has(href);
            });
        });
    }

    function renderBacklinksFromArticleGroups() {
        const currentGroupInfo = articleGroupsApi.getGroupByFile(articleGroupsData, currentFile);
        if (!currentGroupInfo || !currentGroupInfo.group) {
            hideBacklinks();
            return;
        }

        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
        const currentFiles = new Set(
            Object.values(currentGroupInfo.group.languages || {})
                .map((entry) => entry && entry.file)
                .filter(Boolean)
        );

        const backlinks = articleGroupsData.groups
            .filter((group) => group.id !== currentGroupInfo.group.id)
            .filter((group) => groupLinksToCurrentGroup(group, currentFiles))
            .map((group) => ({
                group,
                entry: articleGroupsApi.getPreferredEntry(group, currentLanguage),
                date: group.date || ''
            }))
            .filter((item) => item.entry && item.entry.file)
            .sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });

        if (!backlinks.length) {
            hideBacklinks();
            return;
        }

        backlinksList.innerHTML = '';
        backlinks.forEach((item) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.entry.file;
            a.textContent = item.entry.title;
            li.appendChild(a);
            backlinksList.appendChild(li);
        });

        setBacklinksVisible(backlinksList.children.length > 0);

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(backlinksList);
        }
    }

    function renderBacklinks() {
        if (backlinksData) {
            renderBacklinksFromData();
            return;
        }
        renderBacklinksFromArticleGroups();
    }

    function loadArticleGroupsFallback() {
        if (typeof articleGroupsApi.fetchArticleGroups !== 'function') {
            hideBacklinks();
            return;
        }

        articleGroupsApi.fetchArticleGroups()
            .then((data) => {
                articleGroupsData = data;
                renderBacklinksFromArticleGroups();
            })
            .catch((error) => {
                console.error('Error loading grouped backlinks:', error);
                hideBacklinks();
            });
    }

    fetch(resolvePath('data/backlinks_data.json'))
        .then((response) => {
            if (!response.ok) {
                throw new Error(`backlinks_data ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            backlinksData = data;
            renderBacklinksFromData();
        })
        .catch((error) => {
            console.warn('Error loading precomputed backlinks, falling back to article groups:', error);
            loadArticleGroupsFallback();
        });

    window.addEventListener('site-language-change', renderBacklinks);
});
