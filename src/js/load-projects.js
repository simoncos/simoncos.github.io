document.addEventListener('DOMContentLoaded', function () {
    const gallery = document.getElementById('projects-gallery');
    if (!gallery) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getCurrentLanguage() {
        return typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
    }

    function formatDate(dateValue) {
        return typeof i18n.formatDate === 'function'
            ? i18n.formatDate(dateValue, 'long')
            : dateValue;
    }

    function getLocalizedValue(field, language) {
        if (!field) {
            return '';
        }
        return field[language] || field.en || field.zh || '';
    }

    function getLocalizedPath(project, language) {
        if (!project.paths) {
            return '#';
        }
        const target = project.paths[language] || project.paths.en || project.paths.zh || '#';
        return typeof i18n.resolveLocalizedUrl === 'function'
            ? i18n.resolveLocalizedUrl(target, language)
            : target;
    }

    function renderProjects(payload) {
        const language = getCurrentLanguage();
        const projects = Array.isArray(payload.projects) ? payload.projects : [];

        if (!projects.length) {
            gallery.innerHTML = `<p>${escapeHtml(i18n.t('no_projects_found'))}</p>`;
            return;
        }

        const sorted = [...projects].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        });

        gallery.innerHTML = sorted.map((project) => {
            const title = getLocalizedValue(project.title, language);
            const subtitle = getLocalizedValue(project.subtitle, language);
            const summary = getLocalizedValue(project.summary, language);
            const href = getLocalizedPath(project, language);
            const typeKey = project.type ? `project_type_${project.type}` : '';
            const typeLabel = typeKey && typeof i18n.t === 'function' ? i18n.t(typeKey) : project.type || '';

            return `
                <article class="project-card">
                    <a class="project-card-media" href="${escapeHtml(href)}">
                        <img src="${escapeHtml(project.cover || '')}" alt="${escapeHtml(title)} cover">
                    </a>
                    <div class="project-card-body">
                        <div class="project-card-meta">
                            ${typeLabel ? `<span class="meta-pill">${escapeHtml(typeLabel)}</span>` : ''}
                            ${project.date ? `<span>${escapeHtml(formatDate(project.date))}</span>` : ''}
                        </div>
                        <h3><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
                        ${subtitle ? `<p class="project-card-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                        ${summary ? `<p class="project-card-summary">${escapeHtml(summary)}</p>` : ''}
                        <a class="read-more" href="${escapeHtml(href)}">${escapeHtml(i18n.t('open_project'))}</a>
                    </div>
                </article>
            `;
        }).join('\n');

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(gallery);
        }
    }

    function loadProjects() {
        gallery.innerHTML = `<p>${escapeHtml(i18n.t('loading_projects'))}</p>`;
        fetch(resolvePath('data/projects_data.json'))
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`projects_data ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                renderProjects(payload);
            })
            .catch((error) => {
                console.error('Error loading projects:', error);
                gallery.innerHTML = `<p>${escapeHtml(i18n.t('error_loading_projects'))}</p>`;
            });
    }

    loadProjects();
    window.addEventListener('site-language-change', loadProjects);
});
