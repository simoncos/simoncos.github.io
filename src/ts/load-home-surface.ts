(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const siteConfig = window.SITE_CONFIG || {};
        const i18n = window.SITE_I18N || {};
        const resolvePath = typeof siteConfig.resolvePath === 'function'
            ? siteConfig.resolvePath.bind(siteConfig)
            : (relativePath: string) => relativePath;

        let cachedSurface: any = null;

        function getCurrentLanguage() {
            return typeof i18n.getCurrentLanguage === 'function'
                ? i18n.getCurrentLanguage()
                : 'en';
        }

        function getLocalizedValue(field: any, language: string) {
            if (!field) return '';
            if (typeof field === 'string') return field;
            return field[language] || field.en || field.zh || '';
        }

        function setText(id: string, value: string) {
            const element = document.getElementById(id);
            if (element && value) {
                element.textContent = value;
            }
        }

        function getLocalizedLines(field: any, language: string) {
            if (!field) return [];
            const value = field[language] || field.en || field.zh || field;
            return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
        }

        function setTitleLines(id: string, lines: string[], fallback: string) {
            const element = document.getElementById(id);
            if (!element) return;

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

        function resolveHref(item: any, language: string) {
            const href = getLocalizedValue(item.href, language) || item.href || '#';
            if (item.skipLangRewrite) {
                return href;
            }
            return typeof i18n.resolveLocalizedUrl === 'function'
                ? i18n.resolveLocalizedUrl(href, language)
                : href;
        }

        function applyLinkOptions(anchor: HTMLAnchorElement, item: any, language: string) {
            anchor.href = resolveHref(item, language);
            if (item.skipLangRewrite) {
                anchor.dataset.skipLangRewrite = 'true';
            } else {
                delete anchor.dataset.skipLangRewrite;
            }
        }

        function setAction(id: string, action: any, language: string) {
            const anchor = document.getElementById(id) as HTMLAnchorElement | null;
            if (!anchor || !action) return;
            anchor.textContent = getLocalizedValue(action.label, language);
            applyLinkOptions(anchor, action, language);
            anchor.classList.toggle('secondary', action.secondary === true);
        }

        function renderStatus(status: any, language: string) {
            setText('home-os-status-label', getLocalizedValue(status && status.label, language));
            const list = document.getElementById('home-os-status-list');
            const items = status && Array.isArray(status.items) ? status.items : [];
            if (!list || !items.length) return;

            list.textContent = '';
            items.forEach((item: any) => {
                const li = document.createElement('li');
                const label = document.createElement('span');
                const value = document.createElement('strong');
                label.textContent = getLocalizedValue(item.label, language);
                value.textContent = getLocalizedValue(item.value, language);
                li.append(label, value);
                list.appendChild(li);
            });
        }

        function createSystemCard(item: any, index: number, language: string) {
            const anchor = document.createElement('a');
            anchor.className = 'home-system-node';
            applyLinkOptions(anchor, item, language);

            const indexEl = document.createElement('span');
            indexEl.className = 'system-node-index';
            indexEl.textContent = String(index + 1).padStart(2, '0');

            const title = document.createElement('strong');
            title.textContent = getLocalizedValue(item.title || item.label, language);

            const description = document.createElement('span');
            description.textContent = getLocalizedValue(item.description, language);

            anchor.append(indexEl, title, description);
            return anchor;
        }

        function createTrailCard(item: any, language: string) {
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

            anchor.append(pill, title, description);
            return anchor;
        }

        function renderCardList(containerId: string, items: any[], language: string, kind: 'system' | 'trail') {
            const container = document.getElementById(containerId);
            if (!container || !items.length) return;

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

        function renderSurface(payload: any) {
            const language = getCurrentLanguage();
            const layout = payload.layout || 'signal-board';
            document.body.dataset.homeLayout = layout;

            if (payload.hero) {
                setText('home-os-kicker', getLocalizedValue(payload.hero.kicker, language));
                setTitleLines(
                    'home-os-title',
                    getLocalizedLines(payload.hero.title_lines, language),
                    getLocalizedValue(payload.hero.title, language)
                );
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
            fetch(resolvePath('data/home_surface.json'))
                .then(response => response.ok ? response.json() : null)
                .then(payload => {
                    if (!payload) return;
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
