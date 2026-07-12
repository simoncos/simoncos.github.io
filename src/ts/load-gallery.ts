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
    const resolveVersionedPath = (relativePath: string) => {
        const resolvedPath = resolvePath(relativePath);
        const assetVersion = siteConfig.assetVersion || '';
        if (!assetVersion) {
            return resolvedPath;
        }
        const separator = resolvedPath.includes('?') ? '&' : '?';
        return `${resolvedPath}${separator}v=${encodeURIComponent(assetVersion)}`;
    };
    const staticFallback = gallery.innerHTML;
    const galleryCardClassPattern = /^gallery-card--[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const gallerySectionIdPattern = /^gallery-[a-z0-9]+(?:-[a-z0-9]+)*$/;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function preserveStaticFallback(reason: string) {
        if (staticFallback.trim()) {
            if (gallery.innerHTML !== staticFallback) {
                gallery.innerHTML = staticFallback;
            }
            console.warn(`Gallery data unavailable; preserving static fallback: ${reason}`);
            return;
        }
        console.error(`Gallery data unavailable and no static fallback exists: ${reason}`);
    }

    function getCurrentLanguage() {
        return typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
    }

    function formatDate(dateValue) {
        if (/^\d{4}$/.test(dateValue)) {
            return dateValue;
        }
        return typeof i18n.formatDate === 'function'
            ? i18n.formatDate(dateValue, 'long')
            : dateValue;
    }

    function t(key) {
        return typeof i18n.t === 'function' ? i18n.t(key) : key;
    }

    function getLocalizedValue(field, language) {
        return field[language] || field.en || field.zh || '';
    }

    function isNonEmptyString(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    function isLocalized(value, allowEmpty = false) {
        return Boolean(
            value
            && typeof value === 'object'
            && typeof value.en === 'string'
            && typeof value.zh === 'string'
            && (allowEmpty || (value.en.trim() && value.zh.trim()))
        );
    }

    function isSafePath(value) {
        if (
            !isNonEmptyString(value)
            || value !== value.trim()
            || /["'<>\`\\\s]/.test(value)
            || /%(?![0-9a-f]{2})/i.test(value)
        ) {
            return false;
        }
        if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
            try {
                const parsed = new URL(value);
                return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
            } catch (_error) {
                return false;
            }
        }
        if (value.startsWith('//')) {
            return false;
        }
        const localPath = value.split(/[?#]/, 1)[0];
        const segments = localPath.split('/');
        return Boolean(localPath)
            && !segments.some((segment) => segment === '.' || segment === '..');
    }

    function hasLocalizedPaths(value) {
        return Boolean(
            value
            && typeof value === 'object'
            && isSafePath(value.en)
            && isSafePath(value.zh)
        );
    }

    function validateGalleryItem(item, index) {
        const prefix = `items[${index}]`;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return `${prefix} must be an object`;
        }
        for (const field of ['id', 'type', 'date']) {
            if (!isNonEmptyString(item[field])) {
                return `${prefix}.${field} must be a non-empty string`;
            }
        }
        if (!isSafePath(item.cover)) {
            return `${prefix}.cover must be a safe path or HTTP(S) URL`;
        }
        for (const field of ['title', 'summary', 'alt']) {
            if (!isLocalized(item[field])) {
                return `${prefix}.${field} must contain non-empty en and zh strings`;
            }
        }
        if (!isLocalized(item.subtitle, true)) {
            return `${prefix}.subtitle must contain en and zh strings`;
        }
        if (!hasLocalizedPaths(item.paths)) {
            return `${prefix}.paths must contain safe en and zh paths`;
        }
        if (!galleryCardClassPattern.test(item.galleryCardClass || '')) {
            return `${prefix}.galleryCardClass must be a safe gallery-card--* token`;
        }
        if (!Number.isInteger(item.galleryOrder) || item.galleryOrder < 1) {
            return `${prefix}.galleryOrder must be a positive integer`;
        }
        if (item.sectionId !== undefined && !gallerySectionIdPattern.test(item.sectionId)) {
            return `${prefix}.sectionId must be a safe gallery-* token`;
        }
        if (typeof item.featured !== 'boolean') {
            return `${prefix}.featured must be a boolean`;
        }
        return '';
    }

    function validateGalleryPayload(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return 'payload must be an object';
        }
        if (!isNonEmptyString(payload.last_updated)) {
            return 'last_updated must be a non-empty string';
        }
        if (!Array.isArray(payload.items) || !payload.items.length) {
            return 'items must be a non-empty array';
        }

        const ids = new Set();
        const orders = new Set();
        const sectionIds = new Set();
        for (let index = 0; index < payload.items.length; index += 1) {
            const item = payload.items[index];
            const error = validateGalleryItem(item, index);
            if (error) {
                return error;
            }
            if (ids.has(item.id)) {
                return 'item ids must be unique';
            }
            if (orders.has(item.galleryOrder)) {
                return 'gallery orders must be unique';
            }
            if (item.sectionId && sectionIds.has(item.sectionId)) {
                return 'gallery section ids must be unique';
            }
            ids.add(item.id);
            orders.add(item.galleryOrder);
            if (item.sectionId) {
                sectionIds.add(item.sectionId);
            }
        }
        return '';
    }

    function getLocalizedPath(item, language) {
        const target = item.paths[language] || item.paths.en || item.paths.zh;
        const resolved = typeof i18n.resolveLocalizedUrl === 'function'
            ? i18n.resolveLocalizedUrl(target, language)
            : target;
        if (!isSafePath(resolved)) {
            throw new Error('localized Gallery path is unsafe');
        }
        return resolved;
    }

    function typeLabel(type) {
        return type ? t(`gallery_type_${type}`) : '';
    }

    function galleryMarkup(payload) {
        const language = getCurrentLanguage();
        const sorted = [...payload.items].sort((a, b) => a.galleryOrder - b.galleryOrder);

        return sorted.map((item) => {
            const title = getLocalizedValue(item.title, language);
            const subtitle = getLocalizedValue(item.subtitle, language);
            const summary = getLocalizedValue(item.summary, language);
            const alt = getLocalizedValue(item.alt, language);
            const href = getLocalizedPath(item, language);
            const label = typeLabel(item.type);
            const cardClass = ` ${escapeHtml(item.galleryCardClass)}`;
            const anchorId = item.sectionId || '';

            return `
                <article${anchorId ? ` id="${escapeHtml(anchorId)}"` : ''} class="project-card gallery-card${cardClass}">
                    <a class="project-card-media" href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">
                        <img src="${escapeHtml(item.cover)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">
                    </a>
                    <div class="project-card-body">
                        <div class="project-card-meta">
                            ${label ? `<span class="meta-pill meta-pill--gallery">${escapeHtml(label)}</span>` : ''}
                            <span>${escapeHtml(formatDate(item.date))}</span>
                        </div>
                        <h3><a href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">${escapeHtml(title)}</a></h3>
                        ${subtitle ? `<p class="project-card-subtitle">${escapeHtml(subtitle)}</p>` : ''}
                        <p class="project-card-summary">${escapeHtml(summary)}</p>
                        <a class="read-more" href="${escapeHtml(href)}" data-skip-lang-rewrite="${item.skipLangRewrite ? 'true' : 'false'}">${escapeHtml(t('open_gallery_item'))}</a>
                    </div>
                </article>
            `;
        }).join('\n');
    }

    function loadGallery() {
        fetch(resolveVersionedPath('data/gallery_data.json'))
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`gallery_data ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                const validationError = validateGalleryPayload(payload);
                if (validationError) {
                    throw new Error(`Invalid Gallery payload: ${validationError}`);
                }
                const markup = galleryMarkup(payload);
                gallery.innerHTML = markup;
                if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
                    i18n.applyLanguageStateToInternalLinks(gallery);
                }
            })
            .catch((error) => {
                preserveStaticFallback(String(error));
            });
    }

    loadGallery();
    window.addEventListener('site-language-change', loadGallery);
});
