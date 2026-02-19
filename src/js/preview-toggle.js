document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('preview-toggle');
    if (!toggle) {
        return;
    }

    const isDesktop = window.matchMedia('(min-width: 900px)').matches;
    const stored = localStorage.getItem('previewEnabled');
    if (isDesktop) {
        toggle.checked = true;
    } else if (stored !== null) {
        toggle.checked = stored === 'true';
    }

    const updateState = () => {
        document.body.classList.toggle('previews-off', !toggle.checked);
        localStorage.setItem('previewEnabled', toggle.checked);
    };

    toggle.addEventListener('change', updateState);
    updateState();
});
