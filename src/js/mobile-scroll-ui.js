function isMobileViewport() {
    return (
        typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(max-width: 899px)').matches
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const tocContainer = document.getElementById('toc-container');
    const backToTopButton = document.getElementById('back-to-top');

    const tocDetails = tocContainer ? tocContainer.querySelector('details.toc-details') : null;

    if (!tocContainer && !backToTopButton) {
        return;
    }

    let lastScrollY = window.scrollY;
    const minDelta = 8;
    let rafPending = false;

    function setScrollDirectionHidden(isHidden) {
        const className = 'scroll-direction-hidden';

        if (tocContainer) {
            // Never hide the TOC while it is expanded; users must be able to interact with it.
            const shouldHideToc = Boolean(isHidden) && !(tocDetails && tocDetails.open);
            tocContainer.classList.toggle(className, shouldHideToc);
        }

        if (backToTopButton) {
            backToTopButton.classList.toggle(className, isHidden);
        }
    }

    function update() {
        rafPending = false;

        if (!isMobileViewport()) {
            setScrollDirectionHidden(false);
            lastScrollY = window.scrollY;
            return;
        }

        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY;

        if (Math.abs(delta) < minDelta) {
            return;
        }

        const isScrollingDown = delta > 0;

        // Hide while scrolling down; show while scrolling up.
        // Keep visible near the very top for discoverability.
        if (currentScrollY < 50) {
            setScrollDirectionHidden(false);
        } else {
            setScrollDirectionHidden(isScrollingDown);
        }

        lastScrollY = currentScrollY;
    }

    function onScroll() {
        if (rafPending) {
            return;
        }
        rafPending = true;
        window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        lastScrollY = window.scrollY;
        update();
    });

    update();

    if (tocDetails) {
        tocDetails.addEventListener('toggle', () => {
            // Opening the TOC can cause small scroll adjustments on some browsers;
            // force it visible when expanded.
            if (tocDetails.open) {
                setScrollDirectionHidden(false);
                lastScrollY = window.scrollY;
            }
        });
    }
});
