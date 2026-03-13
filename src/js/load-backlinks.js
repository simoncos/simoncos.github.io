document.addEventListener('DOMContentLoaded', function () {
    const backlinksList = document.getElementById('backlinks-list');
    if (!backlinksList) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    const currentFile = window.location.pathname.split('/').pop();

    fetch(resolvePath('data/backlinks.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(backlinksData => {
            const backlinks = backlinksData[currentFile] || [];

            if (backlinks.length === 0) {
                backlinksList.innerHTML = '<li>No backlinks found.</li>';
                return;
            }

            backlinksList.innerHTML = '';
            backlinks.forEach(function (link) {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = link.file;
                a.textContent = link.title;
                li.appendChild(a);
                backlinksList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error loading backlinks:', error);
            backlinksList.innerHTML = '<li>Error loading backlinks.</li>';
        });
});
