document.addEventListener('DOMContentLoaded', function () {
    const featuredTarget = document.getElementById('project-featured');
    const ledgerTarget = document.getElementById('projects-ledger');
    const summaryTarget = document.getElementById('projects-summary');
    const updatedTarget = document.getElementById('projects-updated');
    if (!featuredTarget || !ledgerTarget) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;
    const resolveVersionedPath = (relativePath: string) => {
        const resolvedPath = resolvePath(relativePath);
        const assetVersion = siteConfig.assetVersion || '';
        if (!assetVersion) {
            return resolvedPath;
        }
        const separator = resolvedPath.includes('?') ? '&' : '?';
        return `${resolvedPath}${separator}v=${encodeURIComponent(assetVersion)}`;
    };
    let projectsPayload = null;

    function escapeHtml(text) {
        return String(text || '')
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

    function t(key) {
        return typeof i18n.t === 'function' ? i18n.t(key) : key;
    }

    function localized(field, language) {
        if (typeof field === 'string') {
            return field;
        }
        if (!field) {
            return '';
        }
        return field[language] || field.en || field.zh || '';
    }

    function localizedPath(paths, language) {
        if (!paths) {
            return '#';
        }
        const target = paths[language] || paths.en || paths.zh || '#';
        return typeof i18n.resolveLocalizedUrl === 'function'
            ? i18n.resolveLocalizedUrl(target, language)
            : target;
    }

    function findAction(project, actionId) {
        return (project.actions || []).find((action) => action.id === actionId);
    }

    function renderAction(action, language, className = '') {
        if (!action) {
            return '';
        }
        const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
        return `<a${classAttribute} href="${escapeHtml(localizedPath(action.paths, language))}">${escapeHtml(localized(action.label, language))}</a>`;
    }

    function renderFeatured(project, language) {
        const detail = project.featuredDetail || {};
        const media = detail.media || {};
        const actions = (project.actions || [])
            .map((action) => renderAction(action, language, 'read-more'))
            .join('\n');
        const metrics = (detail.metrics || []).map((metric) => `
            <div>
                <dt>${escapeHtml(localized(metric.label, language))}</dt>
                <dd>${escapeHtml(localized(metric.value, language))}</dd>
            </div>
        `).join('');
        const mediaHtml = media.src ? `
            <figure class="project-report-card project-report-ledger">
                <figcaption>
                    <span>${escapeHtml(localized(media.kicker, language))}</span>
                    <strong>${escapeHtml(localized(media.title, language))}</strong>
                </figcaption>
                <img src="${escapeHtml(media.src)}" alt="${escapeHtml(localized(media.alt, language))}" loading="lazy" decoding="async">
                ${metrics ? `<dl class="project-report-metrics" aria-label="${escapeHtml(localized(project.title, language))} signals">${metrics}</dl>` : ''}
            </figure>
        ` : '';
        const facts = (project.facts || []).map((fact) => {
            const action = findAction(project, fact.actionId);
            const meta = action
                ? renderAction(action, language)
                : escapeHtml(localized(fact.meta, language));
            return `
                <div>
                    <dt>${escapeHtml(localized(fact.label, language))}</dt>
                    <dd>${escapeHtml(localized(fact.value, language))}</dd>
                    ${meta ? `<dd class="ledger-row-meta">${meta}</dd>` : ''}
                </div>
            `;
        }).join('');
        const surfaces = (project.surfaces || []).map((surface) => `
            <div class="project-surface-row">
                <span>${escapeHtml(surface.label)}</span>
                <strong>${escapeHtml(localized(surface.title, language))}</strong>
                <span>${escapeHtml(localized(surface.summary, language))}</span>
                ${renderAction(findAction(project, surface.actionId), language)}
            </div>
        `).join('');

        featuredTarget.innerHTML = `
            <section class="project-ledger-hero" aria-labelledby="project-feature-title">
                <div class="project-feature-number" aria-hidden="true">01</div>
                <div class="project-feature-copy">
                    <p class="section-kicker">${escapeHtml(localized(detail.kicker, language))}</p>
                    <h2 id="project-feature-title">${escapeHtml(localized(project.title, language))}</h2>
                    <p class="project-feature-subtitle">${escapeHtml(localized(project.subtitle, language))}</p>
                    <p>${escapeHtml(localized(detail.body, language))}</p>
                    <div class="project-feature-actions">${actions}</div>
                </div>
                ${mediaHtml}
            </section>
            ${facts ? `<section class="project-ledger-facts" aria-label="${escapeHtml(t('project_details_label'))}"><dl>${facts}</dl></section>` : ''}
            ${surfaces ? `<section class="project-surfaces-ledger" id="project-surfaces" aria-labelledby="project-surfaces-title"><h2 id="project-surfaces-title">${escapeHtml(t('project_surfaces_title'))}</h2>${surfaces}</section>` : ''}
        `;
    }

    function renderLedger(projects, language) {
        ledgerTarget.innerHTML = projects.map((project, index) => {
            const primaryAction = (project.actions || [])[0];
            return `
                <article class="project-ledger-row" data-project-id="${escapeHtml(project.id)}">
                    <span class="project-ledger-index">${String(index + 1).padStart(2, '0')}</span>
                    <div class="project-ledger-name">
                        <strong>${escapeHtml(localized(project.title, language))}</strong>
                        <span>${escapeHtml(localized(project.subtitle, language))}</span>
                    </div>
                    <span class="project-ledger-status">${escapeHtml(localized(project.status, language))}</span>
                    <p>${escapeHtml(localized(project.summary, language))}</p>
                    ${renderAction(primaryAction, language)}
                </article>
            `;
        }).join('');
    }

    function renderProjects(payload) {
        const language = getCurrentLanguage();
        const projects = Array.isArray(payload.projects)
            ? [...payload.projects].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
            : [];
        if (!projects.length) {
            featuredTarget.innerHTML = `<p>${escapeHtml(t('no_projects_found'))}</p>`;
            ledgerTarget.innerHTML = '';
            return;
        }

        const featured = projects.find((project) => project.featured) || projects[0];
        renderFeatured(featured, language);
        renderLedger(projects, language);

        if (summaryTarget) {
            summaryTarget.textContent = projects.length === 1
                ? t('projects_count_singular')
                : t('projects_count_plural').replace('{count}', String(projects.length));
        }
        if (updatedTarget && payload.last_updated) {
            const formatted = typeof i18n.formatDate === 'function'
                ? i18n.formatDate(payload.last_updated, 'long')
                : payload.last_updated;
            updatedTarget.textContent = `${t('projects_updated_prefix')} ${formatted}`;
        }
        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(featuredTarget);
            i18n.applyLanguageStateToInternalLinks(ledgerTarget);
        }
    }

    fetch(resolveVersionedPath('data/projects_data.json'))
        .then((response) => {
            if (!response.ok) {
                throw new Error(`projects_data ${response.status}`);
            }
            return response.json();
        })
        .then((payload) => {
            projectsPayload = payload;
            renderProjects(payload);
        })
        .catch((error) => {
            console.error('Error loading projects:', error);
        });

    window.addEventListener('site-language-change', function () {
        if (projectsPayload) {
            renderProjects(projectsPayload);
        }
    });
});
