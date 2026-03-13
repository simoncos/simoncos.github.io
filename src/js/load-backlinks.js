document.addEventListener('DOMContentLoaded', function () {
    const backlinksList = document.getElementById('backlinks-list');
    if (!backlinksList) {
        return;
    }

    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const currentFile = window.location.pathname.split('/').pop();
    const parser = new DOMParser();

    let articleGroupsData = null;

    function groupLinksToCurrentGroup(group, currentFiles) {
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

    function renderBacklinks() {
        const currentGroupInfo = articleGroupsApi.getGroupByFile(articleGroupsData, currentFile);
        if (!currentGroupInfo || !currentGroupInfo.group) {
            backlinksList.innerHTML = `<li>${i18n.t('no_backlinks_found')}</li>`;
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
            backlinksList.innerHTML = `<li>${i18n.t('no_backlinks_found')}</li>`;
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

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(backlinksList);
        }
    }

    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
            articleGroupsData = data;
            renderBacklinks();
        })
        .catch((error) => {
            console.error('Error loading grouped backlinks:', error);
            backlinksList.innerHTML = `<li>${i18n.t('error_loading_backlinks')}</li>`;
        });

    window.addEventListener('site-language-change', renderBacklinks);
});
