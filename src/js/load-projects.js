"use strict";
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
    const resolveVersionedPath = (relativePath) => {
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
    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }
    function isLocalized(value, allowPlain = false) {
        if (allowPlain && isNonEmptyString(value)) {
            return true;
        }
        return Boolean(value
            && typeof value === 'object'
            && isNonEmptyString(value.en)
            && isNonEmptyString(value.zh));
    }
    function isSafePath(value) {
        if (!isNonEmptyString(value) || /["'<>\r\n\t]/.test(value)) {
            return false;
        }
        if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
            return /^https?:\/\/[^/]+/i.test(value);
        }
        return !value.startsWith('//');
    }
    function hasLocalizedPaths(value) {
        return Boolean(value
            && typeof value === 'object'
            && isSafePath(value.en)
            && isSafePath(value.zh));
    }
    function validateProject(project, index) {
        const prefix = `projects[${index}]`;
        if (!project || typeof project !== 'object' || Array.isArray(project)) {
            return `${prefix} must be an object`;
        }
        for (const field of ['id', 'type', 'date', 'cover']) {
            if (!isNonEmptyString(project[field])) {
                return `${prefix}.${field} must be a non-empty string`;
            }
        }
        for (const field of ['title', 'subtitle', 'summary', 'status']) {
            if (!isLocalized(project[field])) {
                return `${prefix}.${field} must contain non-empty en and zh strings`;
            }
        }
        if (!hasLocalizedPaths(project.paths)) {
            return `${prefix}.paths must contain safe en and zh paths`;
        }
        if (typeof project.featured !== 'boolean') {
            return `${prefix}.featured must be a boolean`;
        }
        const detail = project.featuredDetail;
        if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
            return `${prefix}.featuredDetail must be an object`;
        }
        if (!isLocalized(detail.kicker) || !isLocalized(detail.body)) {
            return `${prefix}.featuredDetail copy must contain non-empty en and zh strings`;
        }
        const media = detail.media;
        if (!media || typeof media !== 'object' || Array.isArray(media) || !isNonEmptyString(media.src)) {
            return `${prefix}.featuredDetail.media must contain a source`;
        }
        for (const field of ['alt', 'kicker', 'title']) {
            if (!isLocalized(media[field])) {
                return `${prefix}.featuredDetail.media.${field} must contain non-empty en and zh strings`;
            }
        }
        if (!Array.isArray(detail.metrics) || !detail.metrics.length || detail.metrics.some((metric) => (!metric
            || typeof metric !== 'object'
            || !isLocalized(metric.label)
            || !isLocalized(metric.value, true)))) {
            return `${prefix}.featuredDetail.metrics must be a non-empty valid list`;
        }
        if (!Array.isArray(project.actions) || !project.actions.length) {
            return `${prefix}.actions must be a non-empty list`;
        }
        const actionIds = new Set();
        for (const action of project.actions) {
            if (!action || typeof action !== 'object' || !isNonEmptyString(action.id)) {
                return `${prefix}.actions must contain valid objects and ids`;
            }
            if (actionIds.has(action.id)) {
                return `${prefix}.action ids must be unique`;
            }
            actionIds.add(action.id);
            if (!isLocalized(action.label) || !hasLocalizedPaths(action.paths)) {
                return `${prefix}.actions must contain localized labels and safe paths`;
            }
        }
        if (!Array.isArray(project.facts) || !project.facts.length) {
            return `${prefix}.facts must be a non-empty list`;
        }
        for (const fact of project.facts) {
            if (!fact || typeof fact !== 'object' || !isLocalized(fact.label) || !isLocalized(fact.value)) {
                return `${prefix}.facts must contain localized objects`;
            }
            if (fact.meta !== undefined && !isLocalized(fact.meta, true)) {
                return `${prefix}.facts meta must be localized or a non-empty string`;
            }
            if (fact.actionId !== undefined && !actionIds.has(fact.actionId)) {
                return `${prefix}.facts contains an unknown actionId`;
            }
        }
        if (!Array.isArray(project.surfaces) || !project.surfaces.length) {
            return `${prefix}.surfaces must be a non-empty list`;
        }
        for (const surface of project.surfaces) {
            if (!surface
                || typeof surface !== 'object'
                || !isNonEmptyString(surface.label)
                || !isLocalized(surface.title)
                || !isLocalized(surface.summary)
                || !actionIds.has(surface.actionId)) {
                return `${prefix}.surfaces must contain localized objects with valid actionId references`;
            }
        }
        return '';
    }
    function validateProjectsPayload(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return 'payload must be an object';
        }
        if (!Array.isArray(payload.projects) || !payload.projects.length) {
            return 'projects must be a non-empty array';
        }
        if (!isNonEmptyString(payload.last_updated)) {
            return 'last_updated must be a non-empty string';
        }
        const projectIds = new Set();
        for (let index = 0; index < payload.projects.length; index += 1) {
            const error = validateProject(payload.projects[index], index);
            if (error) {
                return error;
            }
            const projectId = payload.projects[index].id;
            if (projectIds.has(projectId)) {
                return 'project ids must be unique';
            }
            projectIds.add(projectId);
        }
        return '';
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
        const projects = [...payload.projects]
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
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
        const validationError = validateProjectsPayload(payload);
        if (validationError) {
            throw new Error(`Invalid projects payload: ${validationError}`);
        }
        projectsPayload = payload;
        renderProjects(payload);
    })
        .catch((error) => {
        console.error('Failed to load projects data; preserving static fallback:', error);
    });
    window.addEventListener('site-language-change', function () {
        if (projectsPayload) {
            renderProjects(projectsPayload);
        }
    });
});
