export function installNavigation(shell: SiteShell, root: HTMLElement, language: () => SiteLanguage, store: (storage: Storage, key: string, value: string) => void, menu: {menuSheet: HTMLElement | null; setMenu: (open: boolean) => void}) {
    const EASE_IO = "cubic-bezier(0.76, 0, 0.24, 1)";
    const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
    const {menuSheet, setMenu} = menu;
    // ---- Page transitions -----------------------------------------------

    const main = document.querySelector<HTMLElement>('main');
    let curtain: HTMLElement | null = null;
    let covered = false;
    let timer = 0;

    function curtainEl() {
        if (!curtain) {
            curtain = document.createElement('div');
            curtain.className = 'curtain';
            curtain.setAttribute('aria-hidden', 'true');
            curtain.appendChild(document.createElement('span'));
            document.body.appendChild(curtain);
        }
        return curtain;
    }

    // Any navigation starts from a known state, so an interrupted
    // transition can never leave the overlay or a faded <main> behind.
    function reset() {
        window.clearTimeout(timer);
        covered = false;
        if (curtain) {
            curtain.style.transition = 'none';
            curtain.style.clipPath = 'inset(0 0 100% 0)';
        }
        if (main) {
            main.style.transition = 'none';
            main.style.opacity = '';
            main.style.transform = '';
        }
    }

    function leave(href: string, note: { mode: string; label?: string }) {
        store(sessionStorage, shell.navKey, JSON.stringify({
            mode: note.mode,
            label: note.label || '',
            href: new URL(href, window.location.href).href,
            t: Date.now(),
        }));
        window.location.href = href;
        // If nothing happens (a refused or aborted load), do not stay covered.
        timer = window.setTimeout(reset, 8000);
    }

    function go(href: string, dest: SiteRoute) {
        reset();
        const here = shell.here;
        if (!here || here.section !== dest.section) {
            const label = dest.label[language()];
            const cover = curtainEl();
            (cover.firstChild as HTMLElement).textContent = label;
            cover.style.transition = 'none';
            cover.style.clipPath = 'inset(100% 0 0 0)';
            void cover.offsetHeight;
            cover.style.transition = `clip-path 0.36s ${EASE_IO}`;
            cover.style.clipPath = 'inset(0 0 0 0)';
            covered = true;
            timer = window.setTimeout(() => leave(href, { mode: 'curtain', label }), 380);
            return;
        }
        if (!main) {
            window.location.href = href;
            return;
        }
        main.style.transition = 'opacity 0.14s ease, transform 0.14s ease';
        main.style.opacity = '0';
        main.style.transform = 'translate3d(0, 6px, 0)';
        timer = window.setTimeout(() => leave(href, { mode: 'fade' }), 150);
    }

    // In-page swaps within a section (Work's wheel and topic views) use the
    // same fade as a within-section navigation.
    shell.fade = (swap: () => void) => {
        reset();
        if (shell.reduced || !main) {
            swap();
            return;
        }
        main.style.transition = 'opacity 0.14s ease, transform 0.14s ease';
        main.style.opacity = '0';
        main.style.transform = 'translate3d(0, 6px, 0)';
        timer = window.setTimeout(() => {
            swap();
            main.style.transition = 'none';
            main.style.transform = 'translate3d(0, 10px, 0)';
            void main.offsetHeight;
            main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
            main.style.opacity = '1';
            main.style.transform = 'none';
        }, 150);
    };

    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = (event.target as Element | null)?.closest?.('a');
        if (!link || !link.href || link.hasAttribute('download')) return;
        if (link.target && link.target !== '_self') return;
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        const dest = shell.route(url.pathname);
        if (!dest || shell.reduced) return;
        event.preventDefault();
        if (menuSheet && !menuSheet.hidden) setMenu(false);
        go(url.href, dest);
    });

    window.addEventListener('pagehide', () => {
        store(sessionStorage, shell.lastKey, shell.here ? shell.here.section : 'none');
    });

    // A page restored from the back/forward cache comes back exactly as it
    // was left: covered or faded. Play the reveal instead of staying stuck.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        window.clearTimeout(timer);
        root.removeAttribute('data-arrive');
        if (curtain) {
            curtain.style.transition = covered ? `clip-path 0.42s ${EASE_IO}` : 'none';
            curtain.style.clipPath = 'inset(0 0 100% 0)';
        }
        covered = false;
        if (main) {
            main.style.transition = `opacity 0.28s ease, transform 0.4s ${EASE_OUT}`;
            main.style.opacity = '1';
            main.style.transform = 'none';
        }
        if (menuSheet) setMenu(false);
    });

    // The arrival overlay is a pseudo-element animated by CSS alone; drop the
    // attribute once it has played so it cannot replay. The arrival replaced
    // <main>'s own entrance (.enter), which would otherwise start over then.
    if (root.hasAttribute('data-arrive')) {
        window.setTimeout(() => {
            root.removeAttribute('data-arrive');
            root.removeAttribute('data-curtain');
            document.querySelectorAll('main.enter').forEach((el) => el.classList.remove('enter'));
        }, 900);
    }


    return {main};
}
