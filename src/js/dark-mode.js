// Check for saved dark mode preference
function initDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
    }
    
    // Update toggle button state
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.theme-toggle-icon');
        const text = toggleBtn.querySelector('.theme-toggle-text');
        if (icon) {
            icon.textContent = darkModeEnabled ? '☀️' : '🌙';
        } else {
            toggleBtn.textContent = darkModeEnabled ? '☀️' : '🌙';
        }
        if (text) {
            text.textContent = darkModeEnabled ? 'Light' : 'Dark';
        }
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update toggle button
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('.theme-toggle-icon');
        const text = toggleBtn.querySelector('.theme-toggle-text');
        if (icon) {
            icon.textContent = isDarkMode ? '☀️' : '🌙';
        } else {
            toggleBtn.textContent = isDarkMode ? '☀️' : '🌙';
        }
        if (text) {
            text.textContent = isDarkMode ? 'Light' : 'Dark';
        }
    }
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', initDarkMode); 