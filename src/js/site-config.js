(function () {
    const currentScript = document.currentScript;
    const scriptSrc = currentScript ? currentScript.getAttribute('src') || '' : '';
    const scriptUrl = scriptSrc ? new URL(scriptSrc, window.location.href) : null;
    const scriptPathname = scriptUrl ? scriptUrl.pathname : '';
    const scriptMarker = '/src/js/site-config.js';
    const markerIndex = scriptPathname.indexOf(scriptMarker);
    const detectedBasePath = markerIndex >= 0 ? `${scriptPathname.slice(0, markerIndex)}/` : '/';

    const siteConfig = {
        ownerName: 'simoncos',
        siteTitle: 'simoncos\'s site',
        basePath: detectedBasePath,
        resolvePath(relativePath) {
            const normalized = relativePath.replace(/^\//, '');
            return `${this.basePath}${normalized}`;
        }
    };

    window.SITE_CONFIG = siteConfig;

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-owner-name]').forEach(function (element) {
            element.textContent = siteConfig.ownerName;
        });

        document.querySelectorAll('[data-site-title]').forEach(function (element) {
            element.textContent = siteConfig.siteTitle;
        });

        const pageTitleElement = document.querySelector('title[data-page-title]');
        if (pageTitleElement) {
            document.title = pageTitleElement.getAttribute('data-page-title').replace(/\[owner\]/g, siteConfig.ownerName);
        }

        const blogTitleElement = document.querySelector('title[data-blog-title]');
        if (blogTitleElement) {
            document.title = blogTitleElement.getAttribute('data-blog-title').replace(/\[owner\]/g, siteConfig.ownerName);
        }
    });
})();
