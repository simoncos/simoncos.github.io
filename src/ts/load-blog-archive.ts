document.addEventListener('DOMContentLoaded', function () {
    const archiveContainer = document.getElementById('blog-archive');
    if (!archiveContainer) {
        return;
    }

    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const latestCount = document.getElementById('essays-latest-count');

    let articleGroupsData = null;

    function formatDate(dateValue) {
        return typeof i18n.formatDate === 'function'
            ? i18n.formatDate(dateValue, 'long')
            : dateValue;
    }

    function formatMonth(dateValue) {
        return typeof i18n.formatDate === 'function'
            ? i18n.formatDate(dateValue, 'month')
            : dateValue;
    }

    function formatDateParts(dateValue) {
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) {
            return { day: dateValue || '', year: '' };
        }

        return {
            day: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            year: String(parsed.getFullYear())
        };
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function monthKey(dateValue) {
        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) {
            return 'undated';
        }
        const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
        return `${parsed.getFullYear()}-${month}`;
    }

    function renderTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) {
            return '';
        }
        const items = tags.map(tag =>
            `<li><a href="#topic-${encodeURIComponent(tag)}">${escapeHtml(tag)}</a></li>`
        ).join('');
        return `<ul class="tag-list blog-preview-tags">${items}</ul>`;
    }

    function activeTopic() {
        const match = window.location.hash.match(/^#topic-(.+)$/);
        if (!match) {
            return '';
        }

        try {
            return decodeURIComponent(match[1]);
        } catch (_error) {
            return '';
        }
    }

    function getLanguageAvailability(group) {
        const labels = [];
        if (group.languages && group.languages.zh) {
            labels.push('中文');
        }
        if (group.languages && group.languages.en) {
            labels.push('EN');
        }
        return labels.join(' / ');
    }

    function renderArchive() {
        const groups = articleGroupsData ? articleGroupsData.groups : [];
        if (latestCount) {
            latestCount.textContent = String(groups.length);
        }
        if (!groups.length) {
            archiveContainer.innerHTML = `<p>${escapeHtml(i18n.t('no_blog_posts'))}</p>`;
            return;
        }

        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';

        const topic = activeTopic();
        const filteredGroups = topic
            ? groups.filter(group => Array.isArray(group.tags) && group.tags.includes(topic))
            : groups;
        const sorted = [...filteredGroups].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });

        if (!sorted.length) {
            archiveContainer.innerHTML = `<p>${escapeHtml(i18n.t('no_blog_posts'))}</p>`;
            return;
        }

        const groupsByMonth = new Map();
        sorted.forEach((group) => {
            const key = monthKey(group.date);
            if (!groupsByMonth.has(key)) {
                groupsByMonth.set(key, []);
            }
            groupsByMonth.get(key).push(group);
        });

        const html = [];
        groupsByMonth.forEach((monthGroups) => {
            const monthLabel = formatMonth(monthGroups[0].date);
            html.push('<section class="archive-month">');
            html.push(`<div class="archive-month-header"><h3 class="archive-month-title">${escapeHtml(monthLabel)}</h3><p class="archive-month-note">${escapeHtml(i18n.formatArchiveMonthNote(monthGroups.length))}</p></div>`);

            monthGroups.forEach((group) => {
                const primary = articleGroupsApi.getPreferredEntry(group, currentLanguage);
                const secondary = articleGroupsApi.getSecondaryEntry(group, currentLanguage);
                if (!primary || !primary.file) {
                    return;
                }

                const secondaryTitle = secondary && secondary.title && secondary.title !== primary.title
                    ? `<span class="group-secondary-title">${escapeHtml(secondary.title)}</span>`
                    : '';
                const excerpt = primary.excerpt ? escapeHtml(primary.excerpt) : '';
                const tagsHtml = renderTags(group.tags || []);
                const dateParts = formatDateParts(group.date);
                const languageLabel = currentLanguage === 'zh' ? '中文' : 'EN';
                html.push(`
                    <article class="blog-preview">
                        <time class="blog-preview-date" datetime="${escapeHtml(group.date || '')}"><span>${escapeHtml(dateParts.day)}</span><span>${escapeHtml(dateParts.year)}</span></time>
                        <span class="blog-preview-lang">${escapeHtml(languageLabel)}</span>
                        <div class="blog-preview-header">
                            <div class="blog-preview-meta"><span class="meta-pill">${escapeHtml(getLanguageAvailability(group))}</span><span>${escapeHtml(formatDate(group.date))}</span></div>
                            <h4><a href="blogs/${primary.file}">${escapeHtml(primary.title || 'Untitled')}</a></h4>
                            ${secondaryTitle}
                        </div>
                        ${tagsHtml}
                        <div class="blog-excerpt">${excerpt}</div>
                        <a href="blogs/${primary.file}" class="read-more">${escapeHtml(i18n.t('read_more'))} →</a>
                    </article>
                `);
            });

            html.push('</section>');
        });

        archiveContainer.innerHTML = html.join('\n');
        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(archiveContainer);
        }
    }

    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
            articleGroupsData = data;
            renderArchive();
        })
        .catch((error) => {
            console.error('Error loading article groups:', error);
            archiveContainer.innerHTML = `<p>${escapeHtml(i18n.t('error_loading_blog_posts'))}</p>`;
        });

    window.addEventListener('site-language-change', renderArchive);
    window.addEventListener('hashchange', () => {
        renderArchive();
        if (activeTopic() && window.matchMedia('(max-width: 820px)').matches) {
            document.getElementById('latest-essays')?.scrollIntoView({
                block: 'start',
                behavior: 'smooth'
            });
        }
    });
});
