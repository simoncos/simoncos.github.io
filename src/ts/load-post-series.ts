document.addEventListener('DOMContentLoaded', function () {
    const seriesList = document.getElementById('series-post-list');
    if (!seriesList) {
        return;
    }

    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const currentFile = window.location.pathname.split('/').pop();
    const seriesSection = seriesList.closest('.post-series') as HTMLElement | null;

    let articleGroupsData = null;

    function setSeriesVisible(visible: boolean) {
        if (seriesSection) {
            seriesSection.style.display = visible ? '' : 'none';
        }
    }

    function renderSeries() {
        const currentGroupInfo = articleGroupsApi.getGroupByFile(articleGroupsData, currentFile);
        const currentGroup = currentGroupInfo && currentGroupInfo.group;
        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';

        if (!currentGroup || !currentGroup.series || !currentGroup.series.name) {
            seriesList.innerHTML = '';
            setSeriesVisible(false);
            return;
        }

        const items = articleGroupsData.groups
            .filter((group) => group.series && group.series.name === currentGroup.series.name)
            .sort((a, b) => {
                const partA = parseInt((a.series && a.series.part) || '0', 10) || 0;
                const partB = parseInt((b.series && b.series.part) || '0', 10) || 0;
                return partA - partB;
            });

        seriesList.innerHTML = '';
        items.forEach((group) => {
            const li = document.createElement('li');
            const preferred = articleGroupsApi.getPreferredEntry(group, currentLanguage);
            const currentEntry = currentGroupInfo && group.id === currentGroup.id ? currentGroupInfo.entry : null;
            const entry = group.id === currentGroup.id && currentEntry ? currentEntry : preferred;
            if (!entry) {
                return;
            }

            const prefix = group.series && group.series.part
                ? `${i18n.formatSeriesPart(group.series.part)}: `
                : '';

            if (group.id === currentGroup.id) {
                const strong = document.createElement('strong');
                strong.textContent = `${prefix}${entry.title}`;
                li.appendChild(strong);
            } else {
                const a = document.createElement('a');
                a.href = entry.file;
                a.textContent = `${prefix}${entry.title}`;
                li.appendChild(a);
            }
            seriesList.appendChild(li);
        });

        setSeriesVisible(seriesList.children.length > 0);

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(seriesList);
        }
    }

    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
            articleGroupsData = data;
            renderSeries();
        })
        .catch((error) => {
            console.error('Error loading grouped series data:', error);
            seriesList.innerHTML = '';
            setSeriesVisible(false);
        });

    window.addEventListener('site-language-change', renderSeries);
});
