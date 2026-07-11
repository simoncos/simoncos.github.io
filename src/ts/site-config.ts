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
        siteTitle: 'simonc site',
        siteVersion: 'talk-2026-05-22-final-6-g538d434',
        assetVersion: scriptUrl ? scriptUrl.searchParams.get('v') || '' : '',
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

        document.querySelectorAll('[data-site-version="site-config"]').forEach(function (element) {
            element.textContent = siteConfig.siteVersion;
        });

        document.querySelectorAll('[data-current-year]').forEach(function (element) {
            element.textContent = String(new Date().getFullYear());
        });

        const pageTitleElement = document.querySelector('title[data-page-title]');
        if (pageTitleElement) {
            document.title = pageTitleElement.getAttribute('data-page-title').replace(/\[owner\]/g, siteConfig.ownerName).replace(/\[site\]/g, siteConfig.siteTitle);
        }

        const blogTitleElement = document.querySelector('title[data-blog-title]');
        if (blogTitleElement) {
            document.title = blogTitleElement.getAttribute('data-blog-title').replace(/\[owner\]/g, siteConfig.ownerName).replace(/\[site\]/g, siteConfig.siteTitle);
        }
    });
})();
