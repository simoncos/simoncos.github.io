function isDesktopViewport() {
    return (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(min-width: 900px)').matches
    );
}

function generateTOC() {
    const content = document.querySelector('.post-content');
    if (!content) {
        return null;
    }

    const titleHeading = document.querySelector('.post-title');
    const contentHeadings = Array.from(content.querySelectorAll('h2, h3, h4'));
    const headings = titleHeading ? [titleHeading, ...contentHeadings] : contentHeadings;
    
    if (headings.length === 0) {
        return null;
    }

    const toc = document.createElement('div');
    toc.className = 'table-of-contents';

    const list = document.createElement('ul');
    
    headings.forEach((heading, index) => {
        // Add ID to heading if it doesn't have one
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }

        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent;
        link.title = heading.textContent;
        link.className = `toc-${heading.tagName.toLowerCase()}`;
        
        // Smooth scroll to heading when clicking TOC link
        link.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
            // Update URL without scrolling
            history.pushState(null, null, link.href);

            // Mobile UX: collapse TOC after navigation.
            if (!isDesktopViewport()) {
                const details = link.closest('details');
                if (details) {
                    details.open = false;
                }
            }
        });

        li.appendChild(link);
        list.appendChild(li);
    });

    toc.appendChild(list);

    const details = document.createElement('details');
    details.className = 'toc-details';
    // Desktop: expanded by default. Mobile: collapsed by default.
    details.open = Boolean(isDesktopViewport());

    const summary = document.createElement('summary');
    summary.className = 'toc-summary';
    summary.textContent = 'Table of Contents';

    details.appendChild(summary);
    details.appendChild(toc);
    return details;
}

// Initialize TOC when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const toc = generateTOC();
    if (toc) {
        const tocContainer = document.getElementById('toc-container');
        if (tocContainer) {
            tocContainer.appendChild(toc);
            return;
        }

        const container = document.querySelector('.post-content');
        if (container) {
            container.insertBefore(toc, container.firstChild);
        }
    }
}); 