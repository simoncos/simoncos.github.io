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
    let enableHideAfterPixels = Math.max(200, Math.floor(window.innerHeight * 0.6));
    const autoHideDelayMs = 5000;
    let autoHideTimeoutId = null;

    function clearAutoHideTimer() {
        if (autoHideTimeoutId !== null) {
            window.clearTimeout(autoHideTimeoutId);
            autoHideTimeoutId = null;
        }
    }

    function scheduleAutoHide() {
        clearAutoHideTimer();

        if (!isMobileViewport()) {
            return;
        }

        // Don't auto-hide while still near the top.
        if (window.scrollY < enableHideAfterPixels) {
            return;
        }

        // Don't auto-hide an expanded TOC.
        if (tocDetails && tocDetails.open) {
            return;
        }

        autoHideTimeoutId = window.setTimeout(() => {
            if (!isMobileViewport()) {
                return;
            }
            if (window.scrollY < enableHideAfterPixels) {
                return;
            }
            if (tocDetails && tocDetails.open) {
                return;
            }

            setScrollDirectionHidden(true);
        }, autoHideDelayMs);
    }

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

        if (!isHidden) {
            scheduleAutoHide();
        } else {
            clearAutoHideTimer();
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
        // Keep visible near the top (and generally within the first screen) for discoverability.
        if (currentScrollY < enableHideAfterPixels) {
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
    window.addEventListener('touchstart', scheduleAutoHide, { passive: true });
    window.addEventListener('click', scheduleAutoHide, { passive: true });
    window.addEventListener('resize', () => {
        enableHideAfterPixels = Math.max(200, Math.floor(window.innerHeight * 0.6));
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
                clearAutoHideTimer();
            } else {
                scheduleAutoHide();
            }
        });
    }
});
