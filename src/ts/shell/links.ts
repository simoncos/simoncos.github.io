// ---- External links -------------------------------------------------

export function markExternal(scope: ParentNode) {
        scope.querySelectorAll<HTMLAnchorElement>('a[href^="http"]').forEach((link) => {
            if (link.hasAttribute('data-ext') || link.hasAttribute('data-noext')) return;
            let host = '';
            try {
                host = new URL(link.href).host;
            } catch (_error) {
                return;
            }
            if (host === window.location.host) return;
            link.target = '_blank';
            link.rel = 'noopener';
            const text = link.textContent || '';
            if (/[↗→]/.test(text) || link.querySelector('img, canvas')) link.setAttribute('data-noext', '');
            else link.setAttribute('data-ext', '');
        });
    }
