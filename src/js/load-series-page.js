"use strict";
document.addEventListener('DOMContentLoaded', function () {
    const seriesList = document.getElementById('series-list');
    if (!seriesList) {
        return;
    }
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    let articleGroupsData = null;
    const staticFallback = seriesList.innerHTML;
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function hasMeaningfulStaticFallback() {
        return staticFallback.trim().length > 0;
    }
    function preserveStaticFallback(reason) {
        if (hasMeaningfulStaticFallback()) {
            console.warn(`Series data unavailable; preserving static fallback: ${reason}`);
            return true;
        }
        return false;
    }
    function hasRenderableEntry(group) {
        return Object.values(group.languages || {}).some((entry) => (entry && typeof entry.title === 'string' && entry.title.trim()
            && typeof entry.file === 'string' && entry.file.trim()));
    }
    function partValue(group) {
        const value = Number(group.series && group.series.part);
        return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    }
    function seriesRows(data) {
        if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
            return null;
        }
        const seriesMap = new Map();
        data.groups.forEach((group) => {
            const seriesName = group && group.series && group.series.name;
            if (typeof seriesName !== 'string' || !seriesName.trim() || !hasRenderableEntry(group)) {
                return;
            }
            if (!seriesMap.has(seriesName)) {
                seriesMap.set(seriesName, []);
            }
            seriesMap.get(seriesName)?.push(group);
        });
        if (!seriesMap.size) {
            return null;
        }
        return [...seriesMap.entries()]
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
            .map(([seriesName, groups]) => ({
            seriesName,
            groups: groups.sort((groupA, groupB) => (partValue(groupA) - partValue(groupB)
                || String(groupA.id || '').localeCompare(String(groupB.id || ''))))
        }));
    }
    function renderSeriesPage() {
        const rows = seriesRows(articleGroupsData);
        if (!rows) {
            if (!preserveStaticFallback('invalid, empty, or series-free article groups payload')) {
                seriesList.innerHTML = `<li>${escapeHtml(i18n.t('no_series_found'))}</li>`;
            }
            return;
        }
        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
        seriesList.innerHTML = rows.map(({ seriesName, groups }) => `
            <li class="series-ledger-row">
                <div class="series-ledger-meta"><span class="meta-pill">${escapeHtml(i18n.t('series'))}</span><span>${escapeHtml(i18n.formatPostCount(groups.length))}</span></div>
                <div class="series-ledger-body">
                    <h3>${escapeHtml(seriesName)}</h3>
                    <ol class="series-part-list">
                    ${groups.map((group) => {
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
            return `<li class="series-part-row">${partLabel}<span class="series-post-entry"><a href="blogs/${entry.file}">${escapeHtml(entry.title)}</a>${secondaryTitle}</span></li>`;
        }).join('')}
                    </ol>
                </div>
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
        if (!preserveStaticFallback(String(error))) {
            console.error('Error loading grouped series page:', error);
            seriesList.innerHTML = `<li>${escapeHtml(i18n.t('error_loading_series'))}</li>`;
        }
    });
    window.addEventListener('site-language-change', renderSeriesPage);
});
