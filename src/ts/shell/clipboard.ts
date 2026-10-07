export function installClipboard() {
    // ---- Copy buttons ---------------------------------------------------

    // The older execCommand route still works where the async clipboard is
    // missing (plain http, older browsers) or refused.
    function copyByCommand(text: string): boolean {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (_error) {
            ok = false;
        }
        area.remove();
        return ok;
    }

    function copyText(text: string): Promise<boolean> {
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                return navigator.clipboard.writeText(text).then(() => true, () => copyByCommand(text));
            }
        } catch (_error) {
            // Fall through to the older route.
        }
        return Promise.resolve(copyByCommand(text));
    }

    document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => {
        let reset = 0;
        button.addEventListener('click', () => {
            copyText(button.getAttribute('data-copy') || '').then((ok) => {
                // Say "Copied" only when it was; otherwise say it failed and
                // leave the address, which is on the button, to copy by hand.
                button.classList.toggle('is-copied', ok);
                button.classList.toggle('is-failed', !ok);
                window.clearTimeout(reset);
                reset = window.setTimeout(() => button.classList.remove('is-copied', 'is-failed'), ok ? 1600 : 3200);
            });
        });
    });


}
