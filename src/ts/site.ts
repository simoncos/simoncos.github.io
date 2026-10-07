import { installPreferences } from "./shell/preferences";
import { installMenu } from "./shell/menu";
import { installNavigation } from "./shell/navigation";
import { markExternal } from "./shell/links";
import { installPreview } from "./shell/preview";
import { installClipboard } from "./shell/clipboard";

(() => {
    const shell = window.SITE_SHELL;
    if (!shell) return;
    const root = document.documentElement;
    const WIDE = 860;
    const preferences = installPreferences(shell, root);
    const menu = installMenu(root, WIDE);
    const {main} = installNavigation(shell, root, () => preferences.lang, preferences.store, menu);
    installPreview(WIDE);
    installClipboard();
    // ---- Start ----------------------------------------------------------

    // The 404 page names the address that was not found.
    document.querySelectorAll<HTMLElement>('[data-bad-path]').forEach((el) => {
        let path = window.location.pathname;
        try {
            path = decodeURIComponent(path);
        } catch (_error) {
            // Keep the encoded form.
        }
        el.textContent = ` · ${path}`;
    });

    if (main) markExternal(main);
    preferences.applyLang(preferences.lang);
})();
