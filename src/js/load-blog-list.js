document.addEventListener('DOMContentLoaded', function() {
    const blogList = document.getElementById('blog-list');
    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};

    if (!blogList) {
        return;
    }

    let articleGroupsData = null;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(dateValue) {
        return typeof i18n.formatDate === 'function'
            ? i18n.formatDate(dateValue, 'short')
            : dateValue;
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

    function renderGroups() {
        const groups = articleGroupsData ? articleGroupsData.groups : [];
        const updateElement = document.getElementById('blog-list-updated');

        if (updateElement) {
            updateElement.textContent = articleGroupsData && articleGroupsData.lastUpdated
                ? `${i18n.t('last_updated')}: ${formatDate(articleGroupsData.lastUpdated)}`
                : '';
        }

        if (!groups.length) {
            blogList.innerHTML = `<li>${escapeHtml(i18n.t('no_blog_posts'))}</li>`;
            return;
        }

        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';

        blogList.innerHTML = '';
        groups.slice(0, 6).forEach((group) => {
            const primary = articleGroupsApi.getPreferredEntry(group, currentLanguage);
            const secondary = articleGroupsApi.getSecondaryEntry(group, currentLanguage);
            if (!primary || !primary.file) {
                return;
            }

            const secondaryTitle = secondary && secondary.title && secondary.title !== primary.title
                ? `<span class="recent-post-secondary">${escapeHtml(secondary.title)}</span>`
                : '';

            const li = document.createElement('li');
            li.className = 'recent-post-card';
            li.innerHTML = `
                <a class="recent-post-link" href="blogs/${primary.file}">
                    <span class="recent-post-main">
                        <span class="recent-post-meta">
                            <span class="meta-pill">${escapeHtml(getLanguageAvailability(group))}</span>
                            <span>${escapeHtml(formatDate(group.date))}</span>
                        </span>
                        <span class="recent-post-title">${escapeHtml(primary.title || 'Untitled')}</span>
                        ${secondaryTitle}
                    </span>
                </a>
            `;
            blogList.appendChild(li);
        });

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(blogList);
        }
    }

    blogList.innerHTML = `<li>${escapeHtml(i18n.t('loading_blog_posts'))}</li>`;

    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
            articleGroupsData = data;
            renderGroups();
        })
        .catch((error) => {
            console.error('Error loading article groups:', error);
            blogList.innerHTML = `<li>${escapeHtml(i18n.t('error_loading_blog_posts'))}</li>`;
        });

    window.addEventListener('site-language-change', renderGroups);
});
