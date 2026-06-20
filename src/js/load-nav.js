"use strict";
document.addEventListener('DOMContentLoaded', function () {
    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const basePath = siteConfig.basePath || '/';
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => `${basePath}${relativePath.replace(/^\//, '')}`;
    const isBlogPage = window.location.pathname.includes('/blogs/');
    const isProjectPage = window.location.pathname.includes('/projects/');
    const navigationPlaceholder = document.getElementById('navigation-placeholder');
    function applyActiveNavState() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath === '/' || currentPath.endsWith('/')
            ? 'index.html'
            : currentPath.split('/').pop();
        const navLinks = document.querySelectorAll('#navigation-placeholder a');
        navLinks.forEach(link => {
            const page = link.dataset.page;
            if (page) {
                const resolvedHref = resolvePath(page);
                link.setAttribute('href', typeof i18n.resolveLocalizedUrl === 'function'
                    ? i18n.resolveLocalizedUrl(resolvedHref)
                    : resolvedHref);
            }
            if ((isBlogPage && page === 'blogs.html') || (isProjectPage && page === 'projects.html') || page === currentPage) {
                link.classList.add('active');
            }
        });
    }
    function renderFallbackNav() {
        navigationPlaceholder.innerHTML = `
            <div class="site-nav-shell">
                <nav aria-label="Primary navigation">
                    <div class="nav-inner">
                        <ul>
                            <li><a href="#" data-page="index.html" data-i18n="nav_home">Home</a></li>
                            <li><a href="#" data-page="projects.html" data-i18n="nav_projects">Projects</a></li>
                            <li><a href="#" data-page="blogs.html" data-i18n="nav_blogs">Essays</a></li>
                            <li><a href="#" data-page="gallery.html" data-i18n="nav_gallery">Gallery</a></li>
                            <li><a href="#" data-page="series.html" data-i18n="nav_series">Series</a></li>
                            <li><a href="#" data-page="tags.html" data-i18n="nav_tags">Index</a></li>
                            <li><a href="#" data-page="about.html" data-i18n="nav_about">About</a></li>
                        </ul>
                        <div class="site-nav-controls">
                            <div class="site-language-switch" data-i18n-aria-label="language_switcher" aria-label="Language switcher">
                                <button class="site-language-button" type="button" data-site-language="en">EN</button>
                                <button class="site-language-button" type="button" data-site-language="zh">中文</button>
                            </div>
                            <div class="dark-mode-container">
                                <button id="dark-mode-toggle" class="theme-toggle" type="button" title="Toggle theme" aria-label="Toggle theme">
                                    <span class="theme-toggle-icon" aria-hidden="true">🌙</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
        `;
        applyActiveNavState();
        if (typeof i18n.localizeDocument === 'function') {
            i18n.localizeDocument(navigationPlaceholder);
        }
        if (typeof i18n.updateLanguageSwitcherState === 'function') {
            i18n.updateLanguageSwitcherState(navigationPlaceholder);
        }
        if (typeof initDarkMode === 'function') {
            initDarkMode();
        }
    }
    fetch(resolvePath('navigation.html'))
        .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load navigation: ${response.status}`);
        }
        return response.text();
    })
        .then(data => {
        navigationPlaceholder.innerHTML = data;
        applyActiveNavState();
        if (typeof i18n.localizeDocument === 'function') {
            i18n.localizeDocument(navigationPlaceholder);
        }
        if (typeof i18n.updateLanguageSwitcherState === 'function') {
            i18n.updateLanguageSwitcherState(navigationPlaceholder);
        }
        if (typeof initDarkMode === 'function') {
            initDarkMode();
        }
    })
        .catch(error => {
        console.error('Error loading navigation:', error);
        renderFallbackNav();
    });
});
