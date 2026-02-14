document.addEventListener('DOMContentLoaded', function() {
    const isBlogPage = window.location.pathname.includes('/blogs/');
    const basePrefix = isBlogPage ? '../' : './';

    fetch(`${basePrefix}navigation.html`)
        .then(response => response.text())
        .then(data => {
            document.getElementById('navigation-placeholder').innerHTML = data;

            const currentPath = window.location.pathname;
            const currentPage = currentPath === '/' || currentPath.endsWith('/')
                ? 'index.html'
                : currentPath.split('/').pop();
            const navLinks = document.querySelectorAll('#navigation-placeholder a');

            navLinks.forEach(link => {
                const page = link.dataset.page;

                if (page) {
                    link.setAttribute('href', `${basePrefix}${page}`);
                }

                if ((isBlogPage && page === 'blogs.html') || page === currentPage) {
                    link.classList.add('active');
                }
            });
        });
});