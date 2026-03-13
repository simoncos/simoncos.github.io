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

    fetch(resolvePath('data/blog_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const posts = Array.isArray(data) ? data : (data.posts || []);
            const parser = new DOMParser();
            const backlinks = [];
            const seen = new Set();

            posts.forEach(function (post) {
                if (!post || !post.file || post.file === currentFile || !post.html_content) {
                    return;
                }

                const doc = parser.parseFromString(post.html_content, 'text/html');
                const hasLink = Array.from(doc.querySelectorAll('a[href]')).some(function (a) {
                    return a.getAttribute('href') === currentFile;
                });

                if (!hasLink || seen.has(post.file)) {
                    return;
                }

                seen.add(post.file);
                backlinks.push({
                    title: post.title,
                    file: post.file,
                    date: post.date || ''
                });
            });

            backlinks.sort(function (a, b) {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });

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
