document.addEventListener('DOMContentLoaded', () => {
    const backToTopButton = document.getElementById('back-to-top');
    if (!backToTopButton) {
        return;
    }

    const showAfterPixels = window.innerHeight;
    let isTicking = false;

    function updateVisibility() {
        const shouldShow = window.scrollY > showAfterPixels;
        backToTopButton.classList.toggle('hidden', !shouldShow);
        isTicking = false;
    }

    function onScroll() {
        if (isTicking) {
            return;
        }
        isTicking = true;
        window.requestAnimationFrame(updateVisibility);
    }

    backToTopButton.addEventListener('click', () => {
        try {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
            window.scrollTo(0, 0);
        }
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateVisibility);
    updateVisibility();
});
