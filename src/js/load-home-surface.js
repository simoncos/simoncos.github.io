"use strict";
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const siteConfig = window.SITE_CONFIG || {};
        const i18n = window.SITE_I18N || {};
        const resolvePath = typeof siteConfig.resolvePath === 'function'
            ? siteConfig.resolvePath.bind(siteConfig)
            : (relativePath) => relativePath;
        let cachedSurface = null;
        function getCurrentLanguage() {
            return typeof i18n.getCurrentLanguage === 'function'
                ? i18n.getCurrentLanguage()
                : 'en';
        }
        function getLocalizedValue(field, language) {
            if (!field)
                return '';
            if (typeof field === 'string')
                return field;
            return field[language] || field.en || field.zh || '';
        }
        function setText(id, value) {
            const element = document.getElementById(id);
            if (element && value) {
                element.textContent = value;
            }
        }
        function getLocalizedLines(field, language) {
            if (!field)
                return [];
            const value = field[language] || field.en || field.zh || field;
            return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
        }
        function setTitleLines(id, lines, fallback, accessibleLabel) {
            const element = document.getElementById(id);
            if (!element)
                return;
            const label = accessibleLabel || fallback || lines.join(' ');
            if (label) {
                element.setAttribute('aria-label', label);
            }
            if (!lines.length) {
                element.textContent = fallback;
                return;
            }
            element.textContent = '';
            lines.forEach((line) => {
                const span = document.createElement('span');
                span.className = 'home-os-title-line';
                span.textContent = line;
                element.appendChild(span);
            });
        }
        function resolveHref(item, language) {
            const paths = item.paths && typeof item.paths === 'object' ? item.paths : null;
            const href = (paths && (paths[language] || paths.en || paths.zh))
                || getLocalizedValue(item.href, language)
                || item.href
                || '#';
            if (item.skipLangRewrite) {
                return href;
            }
            return typeof i18n.resolveLocalizedUrl === 'function'
                ? i18n.resolveLocalizedUrl(href, language)
                : href;
        }
        function resolveMediaSource(value) {
            return /^https?:\/\//i.test(value) ? value : resolvePath(value);
        }
        function applyLinkOptions(anchor, item, language) {
            anchor.href = resolveHref(item, language);
            if (item.skipLangRewrite) {
                anchor.dataset.skipLangRewrite = 'true';
            }
            else {
                delete anchor.dataset.skipLangRewrite;
            }
        }
        function setAction(id, action, language) {
            const anchor = document.getElementById(id);
            if (!anchor || !action)
                return;
            anchor.textContent = getLocalizedValue(action.label, language);
            applyLinkOptions(anchor, action, language);
            anchor.classList.toggle('secondary', action.secondary === true);
        }
        function renderStatus(status, language) {
            setText('home-os-status-label', getLocalizedValue(status && status.label, language));
            const list = document.getElementById('home-os-status-list');
            const items = status && Array.isArray(status.items) ? status.items : [];
            if (!list || !items.length)
                return;
            list.textContent = '';
            items.forEach((item) => {
                const li = document.createElement('li');
                const label = document.createElement('span');
                const value = document.createElement('strong');
                label.textContent = getLocalizedValue(item.label, language);
                value.textContent = getLocalizedValue(item.value, language);
                li.append(label, value);
                list.appendChild(li);
            });
        }
        function createSystemCard(item, index, language) {
            const anchor = document.createElement('a');
            anchor.className = `home-system-node route-node route-node-${index + 1}`;
            applyLinkOptions(anchor, item, language);
            const indexEl = document.createElement('span');
            indexEl.className = 'system-node-index';
            indexEl.textContent = String(index + 1).padStart(2, '0');
            const copy = document.createElement('span');
            copy.className = 'route-node-copy';
            const title = document.createElement('strong');
            title.textContent = getLocalizedValue(item.title || item.label, language);
            const description = document.createElement('span');
            description.textContent = getLocalizedValue(item.description, language);
            copy.append(title, description);
            const actionLabel = getLocalizedValue(item.action_label, language);
            if (actionLabel) {
                const action = document.createElement('span');
                action.className = 'route-node-action';
                action.textContent = actionLabel;
                copy.appendChild(action);
            }
            anchor.append(indexEl, copy);
            const mediaSrc = getLocalizedValue(item.media, language) || item.media;
            if (mediaSrc) {
                const media = document.createElement('span');
                media.className = 'route-node-media';
                const image = document.createElement('img');
                image.src = resolveMediaSource(mediaSrc);
                image.alt = getLocalizedValue(item.media_alt, language) || '';
                image.loading = 'lazy';
                image.decoding = 'async';
                media.appendChild(image);
                anchor.appendChild(media);
            }
            return anchor;
        }
        function createTrailCard(item, language) {
            const anchor = document.createElement('a');
            anchor.className = 'home-trail-card';
            applyLinkOptions(anchor, item, language);
            const pill = document.createElement('span');
            pill.className = 'meta-pill';
            pill.textContent = getLocalizedValue(item.pill || item.label, language);
            const title = document.createElement('strong');
            title.textContent = getLocalizedValue(item.title, language);
            const description = document.createElement('span');
            description.textContent = getLocalizedValue(item.description, language);
            const start = document.createElement('span');
            start.className = 'home-trail-start';
            start.textContent = language === 'zh' ? '探索' : 'Explore';
            anchor.append(pill, title, description, start);
            return anchor;
        }
        function renderCardList(containerId, items, language, kind) {
            const container = document.getElementById(containerId);
            if (!container || !items.length)
                return;
            container.textContent = '';
            items.forEach((item, index) => {
                container.appendChild(kind === 'system'
                    ? createSystemCard(item, index, language)
                    : createTrailCard(item, language));
            });
            if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
                i18n.applyLanguageStateToInternalLinks(container);
            }
        }
        function renderSurface(payload) {
            const language = getCurrentLanguage();
            const layout = payload.layout || 'signal-board';
            document.body.dataset.homeLayout = layout;
            if (payload.hero) {
                setText('home-os-kicker', getLocalizedValue(payload.hero.kicker, language));
                setTitleLines('home-os-title', getLocalizedLines(payload.hero.title_lines, language), getLocalizedValue(payload.hero.title, language), getLocalizedValue(payload.hero.accessible_title, language));
                setText('home-os-lede', getLocalizedValue(payload.hero.lede, language));
                const actions = Array.isArray(payload.hero.actions) ? payload.hero.actions : [];
                setAction('home-os-primary-action', actions[0], language);
                setAction('home-os-secondary-action', actions[1], language);
            }
            renderStatus(payload.status, language);
            if (payload.surface) {
                setText('home-system-kicker', getLocalizedValue(payload.surface.kicker, language));
                setText('system-map-title', getLocalizedValue(payload.surface.title, language));
                renderCardList('home-system-grid', payload.surface.items || [], language, 'system');
            }
            if (payload.trails) {
                renderCardList('home-trail-grid', payload.trails.items || [], language, 'trail');
            }
        }
        function load() {
            const assetVersion = siteConfig.assetVersion
                ? `?v=${encodeURIComponent(siteConfig.assetVersion)}`
                : '';
            fetch(`${resolvePath('data/home_surface.json')}${assetVersion}`)
                .then(response => response.ok ? response.json() : null)
                .then(payload => {
                if (!payload)
                    return;
                cachedSurface = payload;
                renderSurface(payload);
            })
                .catch(error => {
                console.warn('Error loading home surface:', error);
            });
        }
        load();
        window.addEventListener('site-language-change', function () {
            if (cachedSurface) {
                renderSurface(cachedSurface);
            }
        });
    });
})();
