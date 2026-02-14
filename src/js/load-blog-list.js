document.addEventListener('DOMContentLoaded', function() {
    const blogList = document.getElementById('blog-list');

    if (!blogList) {
        return;
    }
    
    // Show loading state
    blogList.innerHTML = '<li>Loading blog posts...</li>';
    
    const dataCandidates = ['data/blog_data.json', '/data/blog_data.json'];

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
            const posts = Array.isArray(data) ? data : [];
            const updateElement = document.getElementById('blog-list-updated');
            if (updateElement) {
                updateElement.textContent = `Last updated: ${new Date().toLocaleString()}`;
            }

            if (posts.length === 0) {
                blogList.innerHTML = '<li>No blog posts found.</li>';
                return;
            }

            blogList.innerHTML = '';
            posts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            })
                .forEach(post => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = `blogs/${post.file}`;
                    a.textContent = post.title;
                    li.appendChild(a);
                    blogList.appendChild(li);
                });
        })
        .catch(error => {
            console.error('Error loading blog data:', error);
            blogList.innerHTML = '<li>Error loading blog posts. Please try again later.</li>';
        });
});
