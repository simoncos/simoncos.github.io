export function installMenu(root: HTMLElement, WIDE: number) {
    // ---- Mobile menu ----------------------------------------------------

    const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
    const menuSheet = document.getElementById('menu-sheet');

    function setMenu(open: boolean) {
        if (!menuButton || !menuSheet) return;
        menuSheet.hidden = !open;
        menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        root.classList.toggle('menu-open', open);
        // The sheet covers the page, so Tab must not wander onto controls
        // hidden behind it.
        document.querySelectorAll('main, footer').forEach((el) => el.toggleAttribute('inert', open));
    }

    if (menuButton && menuSheet) {
        menuButton.addEventListener('click', () => setMenu(Boolean(menuSheet.hidden)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !menuSheet.hidden) {
                // The Escape is spent on the menu; page handlers (the Work
                // topic view) skip handled keys.
                event.preventDefault();
                setMenu(false);
                menuButton.focus();
            }
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth >= WIDE) setMenu(false);
        });
    }


    return {menuSheet, setMenu};
}
