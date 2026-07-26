function isDesktopViewport() {
    return (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(min-width: 900px)').matches
    );
}

/* Highlight the section currently being read. The `.table-of-contents a.active`
   styling already existed but nothing ever set the class, so a twelve-entry
   contents list gave no sense of position in a long essay. */
function trackActiveSection(tocRoot: HTMLElement) {
    const links = Array.from(tocRoot.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const byId = new Map<string, HTMLAnchorElement>();
    const headings: HTMLElement[] = [];

    links.forEach((link) => {
        const id = decodeURIComponent(link.getAttribute('href') || '').slice(1);
        const heading = id ? document.getElementById(id) : null;
        if (heading) {
            byId.set(id, link);
            headings.push(heading);
        }
    });

    if (!headings.length || typeof IntersectionObserver !== 'function') {
        return;
    }

    let current: HTMLAnchorElement | null = null;

    function setActive(link: HTMLAnchorElement | null) {
        if (link === current) {
            return;
        }
        if (current) {
            current.classList.remove('active');
            current.removeAttribute('aria-current');
        }
        if (link) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'true');
        }
        current = link;
    }

    // Decide purely from live geometry: the active section is the last heading
    // scrolled past. Deriving it from the observer's own bookkeeping meant a
    // stale entry could keep winning whenever callbacks were delayed or
    // coalesced; the observer is only a cheap trigger.
    function refresh() {
        const threshold = 120;
        let best = headings[0];
        headings.forEach((heading) => {
            if (heading.getBoundingClientRect().top <= threshold) {
                best = heading;
            }
        });
        setActive(byId.get(best.id) || null);
    }

    const observer = new IntersectionObserver(refresh, { threshold: 0 });

    headings.forEach((heading) => observer.observe(heading));
    window.addEventListener('scroll', refresh, { passive: true });
    refresh();
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
            link.title = heading.textContent || '';
        link.className = `toc-${heading.tagName.toLowerCase()}`;
        
        // Smooth scroll to heading when clicking TOC link
        link.addEventListener('click', (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
            // Update URL without scrolling
            history.pushState(null, '', link.href);

            // Mobile UX: collapse TOC after navigation.
            if (!isDesktopViewport()) {
                const details = link.closest<HTMLDetailsElement>('details');
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
            trackActiveSection(tocContainer);

            const tocDetails = tocContainer.querySelector<HTMLDetailsElement>('details.toc-details');
            if (tocDetails) {
                document.addEventListener('click', (e) => {
                    if (isDesktopViewport()) {
                        return;
                    }

                    if (!tocDetails.open) {
                        return;
                    }

                    const target = e.target;
                    if (!(target instanceof Node)) {
                        return;
                    }

                    // Collapse TOC when tapping/clicking anywhere outside the TOC.
                    if (!tocDetails.contains(target)) {
                        tocDetails.open = false;
                    }
                }, true);
            }
            return;
        }

        const container = document.querySelector('.post-content');
        if (container) {
            container.insertBefore(toc, container.firstChild);
        }
    }
}); 
