document.addEventListener('DOMContentLoaded', function() {
    const siteConfig = window.SITE_CONFIG || {};
    const basePath = siteConfig.basePath || '/';
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => `${basePath}${relativePath.replace(/^\//, '')}`;
    const isBlogPage = window.location.pathname.includes('/blogs/');
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
                link.setAttribute('href', resolvePath(page));
            }

            if ((isBlogPage && page === 'blogs.html') || page === currentPage) {
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
                            <li><a href="#" data-page="index.html">Home</a></li>
                            <li><a href="#" data-page="blogs.html">Blogs</a></li>
                            <li><a href="#" data-page="tags.html">Tags</a></li>
                            <li><a href="#" data-page="series.html">Series</a></li>
                            <li><a href="#" data-page="about.html">About</a></li>
                        </ul>
                        <div class="dark-mode-container">
                            <button id="dark-mode-toggle" class="theme-toggle" type="button" onclick="toggleDarkMode()" title="Toggle dark mode" aria-label="Toggle dark mode">
                                <span class="theme-toggle-icon" aria-hidden="true">🌙</span>
                                <span class="theme-toggle-text">Theme</span>
                            </button>
                        </div>
                    </div>
                </nav>
            </div>
        `;
        applyActiveNavState();

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

            if (typeof initDarkMode === 'function') {
                initDarkMode();
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
            renderFallbackNav();
        });
});