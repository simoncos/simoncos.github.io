export function installPreview(WIDE: number) {
    // ---- Cursor-following preview ---------------------------------------

    let float: HTMLElement | null = null;
    let floatImg: HTMLImageElement | null = null;
    let floatHost: Element | null = null;

    function canFloat(event: PointerEvent) {
        return event.pointerType === 'mouse' && window.innerWidth >= WIDE;
    }

    function floatEl() {
        if (!float) {
            float = document.createElement('div');
            float.className = 'float';
            float.setAttribute('aria-hidden', 'true');
            floatImg = document.createElement('img');
            floatImg.alt = '';
            float.appendChild(floatImg);
            document.body.appendChild(float);
        }
        return float;
    }

    document.addEventListener('pointerover', (event) => {
        if (!canFloat(event)) return;
        const host = (event.target as Element | null)?.closest?.('[data-float]');
        if (!host || host === floatHost) return;
        floatHost = host;
        const el = floatEl();
        const src = host.getAttribute('data-float') || '';
        if (floatImg && floatImg.getAttribute('src') !== src) floatImg.src = src;
        el.classList.add('on');
    });

    document.addEventListener('pointerout', (event) => {
        if (!floatHost || !float) return;
        const next = event.relatedTarget as Node | null;
        if (next && floatHost.contains(next)) return;
        floatHost = null;
        float.classList.remove('on');
    });

    window.addEventListener('pointermove', (event) => {
        if (float && event.pointerType === 'mouse') {
            float.style.transform = `translate3d(${event.clientX + 28}px, ${event.clientY - 130}px, 0)`;
        }
    }, { passive: true });


}
