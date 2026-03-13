document.addEventListener('DOMContentLoaded', function() {
    const blogList = document.getElementById('blog-list');
    const siteConfig = window.SITE_CONFIG || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    if (!blogList) {
        return;
    }
    
    // Show loading state
    blogList.innerHTML = '<li>Loading blog posts...</li>';
    
    const dataCandidates = [
        resolvePath('data/blog_data.json'),
        'data/blog_data.json',
        '/data/blog_data.json'
    ];

    const fetchBlogData = async () => {
        let lastError = null;

        for (const path of dataCandidates) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Failed to fetch blog data.');
    };

    fetchBlogData()
        .then(data => {
            const posts = Array.isArray(data) ? data : (data.posts || []);
            const lastUpdated = Array.isArray(data) ? null : data.last_updated;
            const updateElement = document.getElementById('blog-list-updated');
            if (updateElement) {
                const normalizedLastUpdated = lastUpdated ? String(lastUpdated).slice(0, 10) : '';
                updateElement.textContent = normalizedLastUpdated ? `Last updated: ${normalizedLastUpdated}` : '';
            }

            if (posts.length === 0) {
                blogList.innerHTML = '<li>No blog posts found.</li>';
                return;
            }

            blogList.innerHTML = '';
            const inferLanguage = (fileName) => fileName && fileName.endsWith('.en.html') ? 'EN' : '中文';
            const formatDate = (dateValue) => {
                if (!dateValue) {
                    return 'Undated';
                }
                const date = new Date(dateValue);
                if (Number.isNaN(date.getTime())) {
                    return dateValue;
                }
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            };
            posts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            })
                .slice(0, 6)
                .forEach(post => {
                    const li = document.createElement('li');
                    li.className = 'recent-post-card';
                    li.innerHTML = `
                        <a class="recent-post-link" href="blogs/${post.file}">
                            <span class="recent-post-main">
                                <span class="recent-post-meta">
                                    <span class="meta-pill">${inferLanguage(post.file)}</span>
                                    <span>${formatDate(post.date)}</span>
                                </span>
                                <span class="recent-post-title">${post.title}</span>
                            </span>
                            <span class="recent-post-summary">Open post</span>
                        </a>
                    `;
                    blogList.appendChild(li);
                });
        })
        .catch(error => {
            console.error('Error loading blog data:', error);
            blogList.innerHTML = '<li>Error loading blog posts. Please try again later.</li>';
        });
});
