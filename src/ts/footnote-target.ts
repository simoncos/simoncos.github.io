document.addEventListener('DOMContentLoaded', function () {
    const animatedClass = 'footnote-target-animate';
    const animatedRefClass = 'footnote-ref-target-animate';

    function retriggerHighlight(element: Element | null, className: string) {
        if (!element) return;
        element.classList.remove(className);
        void (element as HTMLElement).offsetWidth;
        element.classList.add(className);
        setTimeout(function () {
            element.classList.remove(className);
        }, 1600);
    }

    document.addEventListener('click', function (event) {
        const eventTarget = event.target instanceof Element ? event.target : null;
        const link = eventTarget ? eventTarget.closest<HTMLAnchorElement>('a[href^="#fn:"], a[href^="#fnref:"]') : null;
        if (!link) return;

        const href = link.getAttribute('href') || '';
        const target = document.querySelector(href);
        if (!target) return;

        const className = href.startsWith('#fnref:') ? animatedRefClass : animatedClass;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                retriggerHighlight(target, className);
            });
        });
    });
});
