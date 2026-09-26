document.addEventListener('DOMContentLoaded', function () {
    const backlinksList = document.getElementById('backlinks-list');
    if (!backlinksList) {
        return;
    }

    const siteConfig = window.SITE_CONFIG || {};
    const i18n = window.SITE_I18N || {};
    const currentFile = window.location.pathname.split('/').pop();
    const backlinksSection = backlinksList.closest('.post-backlinks') as HTMLElement | null;

    function setBacklinksVisible(visible: boolean) {
        if (backlinksSection) {
            backlinksSection.style.display = visible ? '' : 'none';
        }
    }

    function hideBacklinks() {
        backlinksList.innerHTML = '';
        setBacklinksVisible(false);
    }
    const resolvePath = typeof siteConfig.resolvePath === 'function'
        ? siteConfig.resolvePath.bind(siteConfig)
        : (relativePath) => relativePath;

    let backlinksData = null;

    function getCurrentLanguage() {
        return typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
    }

    function getPreferredEntry(languages, language) {
        if (!languages) {
            return null;
        }
        return languages[language] || languages.en || languages.zh || Object.values(languages)[0] || null;
    }

    function renderBacklinkItems(backlinks) {
        if (!backlinks.length) {
            hideBacklinks();
            return;
        }

        const currentLanguage = getCurrentLanguage();
        backlinksList.innerHTML = '';
        backlinks.forEach((item) => {
            const entry = getPreferredEntry(item.languages, currentLanguage);
            if (!entry || !entry.file) {
                return;
            }

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = entry.file;
            a.textContent = entry.title || entry.file;
            li.appendChild(a);
            backlinksList.appendChild(li);
        });

        if (!backlinksList.children.length) {
            hideBacklinks();
            return;
        }

        setBacklinksVisible(true);

        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(backlinksList);
        }
    }

    function renderBacklinksFromData() {
        const backlinks = backlinksData && backlinksData.files
            ? backlinksData.files[currentFile] || []
            : [];
        renderBacklinkItems(backlinks);
    }

    function renderBacklinks() {
        if (!backlinksData) {
            hideBacklinks();
            return;
        }
        renderBacklinksFromData();
    }

    fetch(resolvePath('data/backlinks_data.json'))
        .then((response) => {
            if (!response.ok) {
                throw new Error(`backlinks_data ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            backlinksData = data;
            renderBacklinksFromData();
        })
        .catch((error) => {
            console.warn('Error loading precomputed backlinks:', error);
            hideBacklinks();
        });

    window.addEventListener('site-language-change', renderBacklinks);
});
