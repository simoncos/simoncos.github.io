const THEME_MODE_STORAGE_KEY = 'themeMode';
const LEGACY_DARK_MODE_KEY = 'darkMode';
const DARK_MODE_CLASS = 'dark-mode';

const systemThemeQuery =
    typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

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
        // ignore storage failures
    }

    return 'system';
}

function persistThemeMode(mode) {
    try {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
        localStorage.removeItem(LEGACY_DARK_MODE_KEY);
    } catch (_error) {
        // ignore storage failures
    }
}

function getEffectiveDarkMode(mode = getStoredThemeMode()) {
    if (mode === 'dark') {
        return true;
    }
    if (mode === 'light') {
        return false;
    }
    return !!(systemThemeQuery && systemThemeQuery.matches);
}

function applyThemeMode(mode = getStoredThemeMode()) {
    const isDarkMode = getEffectiveDarkMode(mode);
    document.documentElement.classList.toggle(DARK_MODE_CLASS, isDarkMode);
    document.documentElement.setAttribute('data-theme-mode', mode);
    document.documentElement.setAttribute('data-effective-theme', isDarkMode ? 'dark' : 'light');
    if (document.body) {
        document.body.classList.toggle(DARK_MODE_CLASS, isDarkMode);
    }
    updateDarkModeToggleState(mode, isDarkMode);
}

function getNextThemeMode(currentMode) {
    if (currentMode === 'system') return 'dark';
    if (currentMode === 'dark') return 'light';
    return 'system';
}

function updateDarkModeToggleState(mode = getStoredThemeMode(), isDarkMode = getEffectiveDarkMode(mode)) {
    const toggleBtn = document.getElementById('dark-mode-toggle');

    if (!toggleBtn) {
        return;
    }

    const icon = toggleBtn.querySelector('.theme-toggle-icon');
    const i18n = window.SITE_I18N || {};
    const nextMode = getNextThemeMode(mode);

    const icons = {
        system: '◐',
        dark: '🌙',
        light: '☀️'
    };

    const labelKeys = {
        system: 'theme_mode_system',
        dark: 'theme_mode_dark',
        light: 'theme_mode_light'
    };

    if (icon) {
        icon.textContent = icons[mode] || (isDarkMode ? '☀️' : '🌙');
    } else {
        toggleBtn.textContent = icons[mode] || (isDarkMode ? '☀️' : '🌙');
    }

    const currentLabel = typeof i18n.t === 'function'
        ? i18n.t(labelKeys[mode] || 'theme')
        : `Theme: ${mode}`;
    const nextLabel = typeof i18n.t === 'function'
        ? i18n.t(labelKeys[nextMode] || 'theme')
        : `Theme: ${nextMode}`;

    toggleBtn.setAttribute('title', `${currentLabel} → ${nextLabel}`);
    toggleBtn.setAttribute('aria-label', `${currentLabel} → ${nextLabel}`);
    toggleBtn.setAttribute('data-theme-mode', mode);
}

function initDarkMode() {
    applyThemeMode(getStoredThemeMode());
    bindDarkModeToggle();
}

function toggleDarkMode() {
    const nextMode = getNextThemeMode(getStoredThemeMode());
    persistThemeMode(nextMode);
    applyThemeMode(nextMode);
}

function bindDarkModeToggle() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (!toggleBtn || toggleBtn.dataset.themeToggleBound === 'true') {
        return;
    }

    toggleBtn.addEventListener('click', toggleDarkMode);
    toggleBtn.dataset.themeToggleBound = 'true';
}

if (systemThemeQuery) {
    const handleSystemThemeChange = function () {
        if (getStoredThemeMode() === 'system') {
            applyThemeMode('system');
        }
    };

    if (typeof systemThemeQuery.addEventListener === 'function') {
        systemThemeQuery.addEventListener('change', handleSystemThemeChange);
    } else if (typeof systemThemeQuery.addListener === 'function') {
        systemThemeQuery.addListener(handleSystemThemeChange);
    }
}

document.addEventListener('DOMContentLoaded', initDarkMode);
window.addEventListener('site-language-change', function () {
    applyThemeMode(getStoredThemeMode());
});

window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;
