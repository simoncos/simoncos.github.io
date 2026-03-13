document.addEventListener('DOMContentLoaded', function () {
    const archiveContainer = document.getElementById('blog-archive');
    if (!archiveContainer) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    const parser = new DOMParser();

    function inferLanguage(fileName) {
        return fileName && fileName.endsWith('.en.html') ? 'EN' : '中文';
    }

    function formatDate(dateValue) {
        if (!dateValue) {
            return 'Undated';
        }
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatMonth(dateValue) {
        if (!dateValue) {
            return 'Undated';
        }
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return 'Undated';
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildExcerpt(htmlContent) {
        if (!htmlContent) {
            return '';
        }

        const doc = parser.parseFromString(htmlContent, 'text/html');
        doc.querySelectorAll('.footnote, sup, h1, img, figure, pre, .embedded-page, iframe, table').forEach(el => el.remove());

        const previewRoot = doc.createElement('div');
        const candidates = doc.body ? Array.from(doc.body.children) : [];
        const allowed = new Set(['P', 'UL', 'OL', 'BLOCKQUOTE']);
        let count = 0;
        const maxBlocks = 3;

        const rewritePreviewLinks = (root) => {
            root.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                if (/^[a-z]+:/i.test(href) || href.startsWith('/') || href.startsWith('#')) {
                    return;
                }
                if (href.endsWith('.html')) {
                    a.setAttribute('href', `blogs/${href}`);
                }
            });
        };

        for (const el of candidates) {
            if (!allowed.has(el.tagName)) {
                continue;
            }

            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) {
                continue;
            }

            const clone = el.cloneNode(true);
            rewritePreviewLinks(clone);
            previewRoot.appendChild(clone);
            count += 1;
            if (count >= maxBlocks) {
                break;
            }
        }

        if (!count) {
            return '';
        }

        return previewRoot.innerHTML;
    }

    function renderTags(tags) {
        if (!Array.isArray(tags) || tags.length === 0) {
            return '';
        }
        const items = tags.map(tag =>
            `<li><a href="tags.html#${encodeURIComponent(tag)}">${escapeHtml(tag)}</a></li>`
        ).join('');
        return `<ul class="tag-list blog-preview-tags">${items}</ul>`;
    }

    fetch(resolvePath('data/blog_data.json'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const posts = Array.isArray(data) ? data : (data.posts || []);
            if (!posts.length) {
                archiveContainer.innerHTML = '<p>No blog posts found.</p>';
                return;
            }

            const sorted = [...posts].sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });

            const groups = new Map();
            sorted.forEach(post => {
                const month = formatMonth(post.date);
                if (!groups.has(month)) {
                    groups.set(month, []);
                }
                groups.get(month).push(post);
            });

            const html = [];
            groups.forEach((groupPosts, month) => {
                html.push('<section class="archive-month">');
                html.push(`<div class="archive-month-header"><h3 class="archive-month-title">${escapeHtml(month)}</h3><p class="archive-month-note">${groupPosts.length} post${groupPosts.length === 1 ? '' : 's'}</p></div>`);

                groupPosts.forEach(post => {
                    const excerpt = buildExcerpt(post.html_content || '');
                    const tagsHtml = renderTags(post.tags || []);
                    html.push(`
                    <article class="blog-preview">
                        <div class="blog-preview-header">
                            <div class="blog-preview-meta"><span class="meta-pill">${inferLanguage(post.file)}</span><span>${escapeHtml(formatDate(post.date))}</span></div>
                            <h4><a href="blogs/${post.file}">${escapeHtml(post.title || 'Untitled')}</a></h4>
                        </div>
                        ${tagsHtml}
                        <div class="blog-excerpt">${excerpt}</div>
                        <a href="blogs/${post.file}" class="read-more">Read more</a>
                    </article>
                    `);
                });

                html.push('</section>');
            });

            archiveContainer.innerHTML = html.join('\n');
        })
        .catch(error => {
            console.error('Error loading blog archive:', error);
            archiveContainer.innerHTML = '<p>Error loading blog archive.</p>';
        });
});
