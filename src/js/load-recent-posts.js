/**
 * load-recent-posts.js
 * Merges blog posts (article_groups.json) and projects (projects_data.json)
 * into a unified recent-posts list on the homepage, sorted by date descending.
 */
document.addEventListener('DOMContentLoaded', function () {
    const postList = document.getElementById('post-list');
    const updatedEl = document.getElementById('post-list-updated');
    if (!postList) return;

    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (p) => p;

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

    function getCurrentLanguage() {
        return typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
    }

    function getLocalizedValue(field, language) {
        if (!field) return '';
        return field[language] || field.en || field.zh || '';
    }

    /**
     * Normalize a blog group into a unified post object.
     */
    function blogGroupToPost(group, language) {
        const primary = articleGroupsApi.getPreferredEntry(group, language);
        const secondary = articleGroupsApi.getSecondaryEntry(group, language);
        if (!primary || !primary.file) return null;

        return {
            type: 'blog',
            date: group.date,
            primaryTitle: primary.title || '',
            secondaryTitle: (secondary && secondary.title && secondary.title !== primary.title)
                ? secondary.title : '',
            href: 'blogs/' + primary.file,
            langAvail: [
                group.languages && group.languages.zh ? '中文' : null,
                group.languages && group.languages.en ? 'EN' : null,
            ].filter(Boolean).join(' / ')
        };
    }

    /**
     * Normalize a project entry into a unified post object.
     */
    function projectToPost(project, language) {
        if (!project.paths) return null;
        const href = project.paths[language] || project.paths.en || project.paths.zh || '#';
        const zhTitle = getLocalizedValue(project.title, 'zh');
        const enTitle = getLocalizedValue(project.title, 'en');
        const primaryTitle = getLocalizedValue(project.title, language);
        const secondaryTitle = language === 'zh' ? enTitle : (enTitle !== zhTitle ? zhTitle : '');

        const langAvail = [
            project.paths.zh ? '中文' : null,
            project.paths.en ? 'EN' : null,
        ].filter(Boolean).join(' / ');

        return {
            type: 'project',
            date: project.date,
            primaryTitle,
            secondaryTitle: secondaryTitle !== primaryTitle ? secondaryTitle : '',
            href,
            langAvail
        };
    }

    function typePillLabel(type, language) {
        if (type === 'project') return language === 'zh' ? '项目' : 'Project';
        return language === 'zh' ? '博客' : 'Blog';
    }

    function renderPosts(blogData, projectsPayload) {
        const language = getCurrentLanguage();
        const blogGroups = blogData ? blogData.groups : [];
        const projects = projectsPayload && Array.isArray(projectsPayload.projects)
            ? projectsPayload.projects : [];

        // Build unified post list
        const posts = [
            ...blogGroups.map(g => blogGroupToPost(g, language)).filter(Boolean),
            ...projects.map(p => projectToPost(p, language)).filter(Boolean),
        ].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        });

        // Update "last updated" — take the most recent date across both sources
        if (updatedEl) {
            const dates = [
                blogData && blogData.lastUpdated,
                projectsPayload && projectsPayload.last_updated,
            ].filter(Boolean).map(d => new Date(d).getTime());
            const latestMs = dates.length ? Math.max(...dates) : 0;
            if (latestMs) {
                const latestDate = new Date(latestMs).toISOString().slice(0, 10);
                updatedEl.textContent = `${i18n.t ? i18n.t('last_updated') : 'Last updated'}: ${formatDate(latestDate)}`;
            } else {
                updatedEl.textContent = '';
            }
        }

        if (!posts.length) {
            postList.innerHTML = `<li>${escapeHtml(i18n.t ? i18n.t('no_blog_posts') : 'No posts found.')}</li>`;
            return;
        }

        postList.innerHTML = '';
        posts.slice(0, 8).forEach(post => {
            const typeLabel = typePillLabel(post.type, language);
            const secondaryHtml = post.secondaryTitle
                ? `<span class="recent-post-secondary">${escapeHtml(post.secondaryTitle)}</span>`
                : '';
            const li = document.createElement('li');
            li.className = 'recent-post-card';
            li.innerHTML = `
                <a class="recent-post-link" href="${escapeHtml(post.href)}">
                    <span class="recent-post-main">
                        <span class="recent-post-meta">
                            <span class="meta-pill meta-pill--${escapeHtml(post.type)}">${escapeHtml(typeLabel)}</span>
                            ${post.langAvail ? `<span class="meta-pill">${escapeHtml(post.langAvail)}</span>` : ''}
                            <span>${escapeHtml(formatDate(post.date))}</span>
                        </span>
                        <span class="recent-post-title">${escapeHtml(post.primaryTitle)}</span>
                        ${secondaryHtml}
                    </span>
                </a>
            `;
            postList.appendChild(li);
        });

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(postList);
        }
    }

    function load() {
        postList.innerHTML = `<li>${escapeHtml(i18n.t ? i18n.t('loading_blog_posts') : 'Loading...')}</li>`;

        const blogPromise = articleGroupsApi.fetchArticleGroups
            ? articleGroupsApi.fetchArticleGroups()
            : Promise.resolve(null);

        const projectsPromise = fetch(resolvePath('data/projects_data.json'))
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);

        Promise.all([blogPromise, projectsPromise])
            .then(([blogData, projectsPayload]) => renderPosts(blogData, projectsPayload))
            .catch(err => {
                console.error('Error loading posts:', err);
                postList.innerHTML = `<li>${escapeHtml(i18n.t ? i18n.t('error_loading_blog_posts') : 'Error loading posts.')}</li>`;
            });
    }

    load();
    window.addEventListener('site-language-change', load);
});
