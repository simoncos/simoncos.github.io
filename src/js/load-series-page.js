"use strict";
document.addEventListener('DOMContentLoaded', function () {
    const seriesList = document.getElementById('series-list');
    if (!seriesList) {
        return;
    }
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    let articleGroupsData = null;
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function renderSeriesPage() {
        const groups = articleGroupsData ? articleGroupsData.groups : [];
        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
        const seriesMap = new Map();
        groups.forEach((group) => {
            if (!group.series || !group.series.name) {
                return;
            }
            if (!seriesMap.has(group.series.name)) {
                seriesMap.set(group.series.name, []);
            }
            seriesMap.get(group.series.name).push(group);
        });
        if (!seriesMap.size) {
            seriesList.innerHTML = `<li>${escapeHtml(i18n.t('no_series_found'))}</li>`;
            return;
        }
        seriesList.innerHTML = [...seriesMap.entries()].map(([seriesName, seriesGroups]) => `
            <li class="series-card">
                <div class="series-meta"><span class="meta-pill">${escapeHtml(i18n.t('series'))}</span><span>${escapeHtml(i18n.formatPostCount(seriesGroups.length))}</span></div>
                <h3>${escapeHtml(seriesName)}</h3>
                <ul class="series-posts">
                    ${seriesGroups.sort((a, b) => {
            const partA = parseInt((a.series && a.series.part) || '0', 10) || 0;
            const partB = parseInt((b.series && b.series.part) || '0', 10) || 0;
            return partA - partB;
        }).map((group) => {
            const entry = articleGroupsApi.getPreferredEntry(group, currentLanguage);
            if (!entry || !entry.file) {
                return '';
            }
            const prefix = group.series && group.series.part
                ? escapeHtml(i18n.formatSeriesPart(group.series.part))
                : '';
            const secondary = articleGroupsApi.getSecondaryEntry(group, currentLanguage);
            const secondaryTitle = secondary && secondary.title && secondary.title !== entry.title
                ? `<span class="group-secondary-title">${escapeHtml(secondary.title)}</span>`
                : '';
            const partLabel = prefix
                ? `<span class="series-post-part">${prefix}</span>`
                : '';
            return `<li>${partLabel}<span class="series-post-entry"><a href="blogs/${entry.file}">${escapeHtml(entry.title)}</a>${secondaryTitle}</span></li>`;
        }).join('')}
                </ul>
            </li>
        `).join('');
        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(seriesList);
        }
    }
    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
        articleGroupsData = data;
        renderSeriesPage();
    })
        .catch((error) => {
        console.error('Error loading grouped series page:', error);
        seriesList.innerHTML = `<li>${escapeHtml(i18n.t('error_loading_series'))}</li>`;
    });
    window.addEventListener('site-language-change', renderSeriesPage);
});
