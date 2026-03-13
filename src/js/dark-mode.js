function updateDarkModeToggleState() {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    const darkModeEnabled = document.body.classList.contains('dark-mode');

    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.theme-toggle-icon');
        const i18n = window.SITE_I18N || {};

        if (icon) {
            icon.textContent = darkModeEnabled ? '☀️' : '🌙';
        } else {
            toggleBtn.textContent = darkModeEnabled ? '☀️' : '🌙';
        }

        if (typeof i18n.t === 'function') {
            const label = darkModeEnabled ? i18n.t('switch_to_light_mode') : i18n.t('switch_to_dark_mode');
            toggleBtn.setAttribute('title', label);
            toggleBtn.setAttribute('aria-label', label);
        }
    }
}

// Check for saved dark mode preference
function initDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
    }

    updateDarkModeToggleState();
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    updateDarkModeToggleState();
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', initDarkMode); 
window.addEventListener('site-language-change', updateDarkModeToggleState);