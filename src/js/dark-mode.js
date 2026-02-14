// Check for saved dark mode preference
function initDarkMode() {
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    if (darkModeEnabled) {
        document.body.classList.add('dark-mode');
    }
    
    // Update toggle button state
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = darkModeEnabled ? '☀️' : '🌙';
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update toggle button
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (toggleBtn) {
        toggleBtn.innerHTML = isDarkMode ? '☀️' : '🌙';
    }
}

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', initDarkMode); 