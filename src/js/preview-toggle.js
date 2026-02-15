document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('preview-toggle');
    if (!toggle) {
        return;
    }

    const stored = localStorage.getItem('previewEnabled');
    if (stored !== null) {
        toggle.checked = stored === 'true';
    }

    const updateState = () => {
        document.body.classList.toggle('previews-off', !toggle.checked);
        localStorage.setItem('previewEnabled', toggle.checked);
    };

    toggle.addEventListener('change', updateState);
    updateState();
});
