document.addEventListener('DOMContentLoaded', function () {
    const gallery = document.getElementById('gallery-grid');
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

    function t(key) {
        return typeof i18n.t === 'function' ? i18n.t(key) : key;
    }

    function getLocalizedValue(field, language) {
        if (!field) {
            return '';
        }
        return field[language] || field.en || field.zh || '';
    }

    function getLocalizedPath(item, language) {
        if (!item.paths) {
            return '#';
        }
        const target = item.paths[language] || item.paths.en || item.paths.zh || '#';
        return typeof i18n.resolveLocalizedUrl === 'function'
            ? i18n.resolveLocalizedUrl(target, language)
            : target;
    }

    function typeLabel(type) {
        const key = type ? `gallery_type_${type}` : '';
        return key ? t(key) : '';
    }

    function render(payload) {
        const language = getCurrentLanguage();
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!items.length) {
            gallery.innerHTML = `<p>${escapeHtml(t('no_gallery_items_found'))}</p>`;
            return;
        }

        const sorted = [...items].sort((a, b) => {
            const da = a.date ? new Date(a.date).getTime() : 0;
            const db = b.date ? new Date(b.date).getTime() : 0;
            return db - da;
        });

        gallery.innerHTML = sorted.map((item) => {
            const title = getLocalizedValue(item.title, language);
            const subtitle = getLocalizedValue(item.subtitle, language);
            const summary = getLocalizedValue(item.summary, language);
            const href = getLocalizedPath(item, language);
            const label = typeLabel(item.type);

            return `
                <article class="project-card gallery-card">
                    <a class="project-card-media" href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">
                        <img src="${escapeHtml(item.cover || '')}" alt="${escapeHtml(title)} cover">
                    </a>
                    <div class="project-card-body">
                        <div class="project-card-meta">
                            ${label ? `<span class="meta-pill meta-pill--gallery">${escapeHtml(label)}</span>` : ''}
                            ${item.date ? `<span>${escapeHtml(formatDate(item.date))}</span>` : ''}
                        </div>
                        <h3><a href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">${escapeHtml(title)}</a></h3>
                        ${subtitle ? `<p class="project-card-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                        ${summary ? `<p class="project-card-summary">${escapeHtml(summary)}</p>` : ''}
                        <a class="read-more" href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">${escapeHtml(t('open_gallery_item'))}</a>
                    </div>
                </article>
            `;
        }).join('\n');

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(gallery);
        }
    }

    gallery.innerHTML = `<p>${escapeHtml(t('loading_gallery_items'))}</p>`;
    fetch(resolvePath('data/gallery_data.json'))
        .then((response) => {
            if (!response.ok) {
                throw new Error(`gallery_data ${response.status}`);
            }
            return response.json();
        })
        .then(render)
        .catch((error) => {
            console.error('Error loading gallery:', error);
            gallery.innerHTML = `<p>${escapeHtml(t('error_loading_gallery_items'))}</p>`;
        });

    window.addEventListener('site-language-change', function () {
        fetch(resolvePath('data/gallery_data.json'))
            .then((response) => response.ok ? response.json() : { items: [] })
            .then(render)
            .catch(() => {});
    });
});
