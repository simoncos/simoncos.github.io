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

    function preserveStaticFallback(reason: string) {
        if (hasMeaningfulStaticFallback()) {
            seriesList.innerHTML = staticFallback;
            console.warn(`Series data unavailable; preserving static fallback: ${reason}`);
            return true;
        }
        return false;
    }

    function isValidLocalArticleFilename(value: unknown): value is string {
        return typeof value === 'string'
            && /^[a-z0-9][a-z0-9._-]*\.html$/i.test(value)
            && !value.includes('..');
    }

    function isCompleteEntry(entry: ArticleEntry | null): entry is ArticleEntry {
        return !!entry
            && typeof entry.title === 'string'
            && !!entry.title.trim()
            && isValidLocalArticleFilename(entry.file);
    }

    function partValue(group: ArticleGroup) {
        const value = Number(group.series && group.series.part);
        return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
    }

    function seriesGroupKey(group: ArticleGroup, seriesName: string) {
        return String(group.id || `${seriesName}:${group.series && group.series.part || ''}`);
    }

    function existingLinkSuffixes() {
        const suffixes = new Map<string, string>();
        if (typeof seriesList.querySelectorAll !== 'function') {
            return suffixes;
        }

        seriesList.querySelectorAll<HTMLAnchorElement>('a[data-series-group][href]').forEach((anchor) => {
            const groupKey = anchor.dataset.seriesGroup;
            const rawHref = anchor.getAttribute('href');
            if (!groupKey || !rawHref) {
                return;
            }
            try {
                const url = new URL(rawHref, window.location.href);
                suffixes.set(groupKey, `${url.search}${url.hash}`);
            } catch (_error) {
                // Ignore malformed pre-existing links and render the validated local target.
            }
        });
        return suffixes;
    }

    function seriesRows(data: ArticleGroupsData | null, currentLanguage: string) {
        if (!data || !Array.isArray(data.groups) || data.groups.length === 0) {
            return null;
        }

        if (typeof articleGroupsApi.getPreferredEntry !== 'function') {
            return null;
        }

        const seriesMap = new Map<string, Array<{
            group: ArticleGroup;
            entry: ArticleEntry;
            secondary: ArticleEntry | null;
            groupKey: string;
        }>>();
        let invalidSeriesGroup = false;
        data.groups.forEach((group) => {
            const seriesName = group && group.series && group.series.name;
            if (typeof seriesName !== 'string' || !seriesName.trim()) {
                return;
            }

            const entry = articleGroupsApi.getPreferredEntry(group, currentLanguage);
            if (!isCompleteEntry(entry)) {
                invalidSeriesGroup = true;
                return;
            }
            const secondary = typeof articleGroupsApi.getSecondaryEntry === 'function'
                ? articleGroupsApi.getSecondaryEntry(group, currentLanguage)
                : null;
            if (!seriesMap.has(seriesName)) {
                seriesMap.set(seriesName, []);
            }
            seriesMap.get(seriesName)?.push({
                group,
                entry: { ...entry, title: entry.title.trim(), file: entry.file.trim() },
                secondary,
                groupKey: seriesGroupKey(group, seriesName)
            });
        });

        if (invalidSeriesGroup || !seriesMap.size) {
            return null;
        }

        return [...seriesMap.entries()]
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
            .map(([seriesName, items]) => ({
                seriesName,
                items: items.sort((itemA, itemB) => (
                    partValue(itemA.group) - partValue(itemB.group)
                    || String(itemA.group.id || '').localeCompare(String(itemB.group.id || ''))
                ))
            }));
    }

    function renderSeriesPage() {
        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
        const rows = seriesRows(articleGroupsData, currentLanguage);
        if (!rows) {
            if (!preserveStaticFallback('invalid, empty, or series-free article groups payload')) {
                seriesList.innerHTML = `<li>${escapeHtml(i18n.t('no_series_found'))}</li>`;
            }
            return;
        }

        const linkSuffixes = existingLinkSuffixes();

        seriesList.innerHTML = rows.map(({ seriesName, items }) => `
            <li class="series-ledger-row">
                <div class="series-ledger-meta"><span class="meta-pill">${escapeHtml(i18n.t('series'))}</span><span>${escapeHtml(i18n.formatPostCount(items.length))}</span></div>
                <div class="series-ledger-body">
                    <h3>${escapeHtml(seriesName)}</h3>
                    <ol class="series-part-list">
                    ${items.map(({ group, entry, secondary, groupKey }) => {
                        const prefix = group.series && group.series.part
                            ? escapeHtml(i18n.formatSeriesPart(group.series.part))
                            : '';
                        const secondaryTitle = secondary && typeof secondary.title === 'string'
                            && secondary.title.trim() && secondary.title.trim() !== entry.title
                            ? `<span class="group-secondary-title">${escapeHtml(secondary.title.trim())}</span>`
                            : '';
                        const partLabel = prefix
                            ? `<span class="series-post-part">${prefix}</span>`
                            : '';
                        const href = `blogs/${entry.file}${linkSuffixes.get(groupKey) || ''}`;
                        return `<li class="series-part-row">${partLabel}<span class="series-post-entry"><a data-series-group="${escapeHtml(groupKey)}" href="${escapeHtml(href)}">${escapeHtml(entry.title)}</a>${secondaryTitle}</span></li>`;
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
