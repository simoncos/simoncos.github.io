document.addEventListener('DOMContentLoaded', function () {
    const animatedClass = 'footnote-target-animate';
    const animatedRefClass = 'footnote-ref-target-animate';

    function retriggerAnimation(element, className) {
        if (!element) return;
        element.classList.remove(className);
        // Force reflow so the animation can replay reliably
        void element.offsetWidth;
        element.classList.add(className);
    }

    document.addEventListener('click', function (event) {
        const link = event.target.closest('a[href^="#fn:"], a[href^="#fnref:"]');
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const target = document.querySelector(href);
        if (!target) return;

        const className = href.startsWith('#fnref:') ? animatedRefClass : animatedClass;

        // wait until browser finishes the hash jump, then animate target
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                retriggerAnimation(target, className);
            });
        });
    });

    document.addEventListener('animationend', function (event) {
        if (event.target.classList.contains(animatedClass)) {
            event.target.classList.remove(animatedClass);
        }
        if (event.target.classList.contains(animatedRefClass)) {
            event.target.classList.remove(animatedRefClass);
        }
    });
});
