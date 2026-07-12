"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('preview-toggle');
    if (!toggle) {
        return;
    }
    const stored = localStorage.getItem('previewEnabled');
    if (stored !== null) {
        toggle.checked = stored === 'true';
    }
    else {
        toggle.checked = false;
    }
    const updateState = () => {
        document.body.classList.toggle('previews-off', !toggle.checked);
        localStorage.setItem('previewEnabled', String(toggle.checked));
    };
    toggle.addEventListener('change', updateState);
    updateState();
});
