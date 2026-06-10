(function () {
    const THEME_MODE_STORAGE_KEY = 'themeMode';
    const LEGACY_DARK_MODE_KEY = 'darkMode';
    const DARK_MODE_CLASS = 'dark-mode';

    function getStoredThemeMode() {
        try {
            const explicit = localStorage.getItem(THEME_MODE_STORAGE_KEY);
            if (explicit === 'system' || explicit === 'dark' || explicit === 'light') {
                return explicit;
            }

            const legacy = localStorage.getItem(LEGACY_DARK_MODE_KEY);
            if (legacy === 'true') {
                return 'dark';
            }
            if (legacy === 'false') {
                return 'light';
            }
        } catch (_error) {
            // Ignore storage failures and use the system preference.
        }

        return 'system';
    }

    function getEffectiveDarkMode(mode) {
        if (mode === 'dark') {
            return true;
        }
        if (mode === 'light') {
            return false;
        }
        return (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
        );
    }

    const mode = getStoredThemeMode();
    const isDarkMode = getEffectiveDarkMode(mode);
    const root = document.documentElement;

    root.classList.toggle(DARK_MODE_CLASS, isDarkMode);
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-effective-theme', isDarkMode ? 'dark' : 'light');
})();
