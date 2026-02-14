function generateTOC() {
    const content = document.querySelector('.post-content');
    const headings = content.querySelectorAll('h2, h3, h4');
    
    if (headings.length === 0) {
        return null;
    }

    const toc = document.createElement('div');
    toc.className = 'table-of-contents';
    const title = document.createElement('h3');
    title.textContent = 'Table of Contents';
    toc.appendChild(title);

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
        link.className = `toc-${heading.tagName.toLowerCase()}`;
        
        // Smooth scroll to heading when clicking TOC link
        link.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
            // Update URL without scrolling
            history.pushState(null, null, link.href);
        });

        li.appendChild(link);
        list.appendChild(li);
    });

    toc.appendChild(list);
    return toc;
}

// Initialize TOC when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const toc = generateTOC();
    if (toc) {
        const container = document.querySelector('.post-content');
        container.insertBefore(toc, container.firstChild);
    }
}); 