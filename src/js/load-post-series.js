document.addEventListener('DOMContentLoaded', function () {
    const seriesList = document.getElementById('series-post-list');
    if (!seriesList) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    const currentFile = window.location.pathname.split('/').pop();

    Promise.all([
        fetch(resolvePath('data/blog_data.json')).then(r => {
            if (!r.ok) throw new Error(`blog_data ${r.status}`);
            return r.json();
        }),
        fetch(resolvePath('data/series_data.json')).then(r => {
            if (!r.ok) throw new Error(`series_data ${r.status}`);
            return r.json();
        })
    ])
        .then(([blogData, seriesData]) => {
            const posts = Array.isArray(blogData) ? blogData : (blogData.posts || []);
            const currentPost = posts.find(post => post.file === currentFile);
            const metadata = currentPost && currentPost.metadata ? currentPost.metadata : {};
            const seriesName = metadata.series;

            if (!seriesName || !seriesData[seriesName] || !seriesData[seriesName].length) {
                seriesList.innerHTML = '<li>No series.</li>';
                return;
            }

            const items = [...seriesData[seriesName]].sort((a, b) => {
                const partA = parseInt(a.part, 10) || 0;
                const partB = parseInt(b.part, 10) || 0;
                return partA - partB;
            });

            seriesList.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                const label = item.part ? `Part ${item.part}: ` : '';
                if (item.file === currentFile) {
                    li.innerHTML = `<strong>${label}${item.title}</strong>`;
                } else {
                    const a = document.createElement('a');
                    a.href = item.file;
                    a.textContent = `${label}${item.title}`;
                    li.appendChild(a);
                }
                seriesList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error loading series for post:', error);
            seriesList.innerHTML = '<li>Error loading series.</li>';
        });
});
