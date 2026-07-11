"use strict";
document.addEventListener('DOMContentLoaded', function () {
    const tagList = document.getElementById('tag-list');
    const tagSections = document.getElementById('tag-sections');
    const allTagsSection = document.getElementById('all-tags');
    if (!tagList || !tagSections || !allTagsSection) {
        return;
    }
    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    let articleGroupsData = null;
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function buildTagMap() {
        const tagMap = new Map();
        (articleGroupsData ? articleGroupsData.groups : []).forEach((group) => {
            (group.tags || []).forEach((tag) => {
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, []);
                }
                tagMap.get(tag).push(group);
            });
        });
        return new Map([...tagMap.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }
    function renderGroupItem(group, currentLanguage) {
        const primary = articleGroupsApi.getPreferredEntry(group, currentLanguage);
        const secondary = articleGroupsApi.getSecondaryEntry(group, currentLanguage);
        if (!primary || !primary.file) {
            return '';
        }
        const secondaryTitle = secondary && secondary.title && secondary.title !== primary.title
            ? `<span class="group-secondary-title">${escapeHtml(secondary.title)}</span>`
            : '';
        return `<li><a href="blogs/${primary.file}">${escapeHtml(primary.title)}</a>${secondaryTitle}</li>`;
    }
    function renderTagList(tagMap) {
        const currentHash = window.location.hash || '#all';
        const items = [`<li><a href="#all" class="${currentHash === '#all' ? 'active-tag' : ''}">${escapeHtml(i18n.t('all'))}</a></li>`];
        tagMap.forEach((_groups, tag) => {
            const isActive = currentHash === `#${tag}`;
            items.push(`<li><a href="#${encodeURIComponent(tag)}" class="${isActive ? 'active-tag' : ''}">${escapeHtml(tag)}</a></li>`);
        });
        tagList.innerHTML = items.join('');
    }
    function renderSections(tagMap) {
        const currentLanguage = typeof i18n.getCurrentLanguage === 'function'
            ? i18n.getCurrentLanguage()
            : 'en';
        const hash = decodeURIComponent((window.location.hash || '#all').slice(1));
        if (!tagMap.size) {
            tagSections.classList.remove('hidden');
            allTagsSection.classList.add('hidden');
            tagSections.innerHTML = `<p>${escapeHtml(i18n.t('no_tags_found'))}</p>`;
            return;
        }
        if (!hash || hash === 'all') {
            tagSections.classList.add('hidden');
            allTagsSection.classList.remove('hidden');
            allTagsSection.innerHTML = [...tagMap.entries()].map(([tag, groups]) => `
                <section class="tag-overview-block">
                    <div class="tag-meta"><span class="meta-pill">${escapeHtml(i18n.t('tags'))}</span><span>${escapeHtml(i18n.formatPostCount(groups.length))}</span></div>
                    <h3>${escapeHtml(tag)}</h3>
                    <ul>${groups.map((group) => renderGroupItem(group, currentLanguage)).join('')}</ul>
                </section>
            `).join('');
            if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
                i18n.applyLanguageStateToInternalLinks(allTagsSection);
            }
            return;
        }
        const groups = tagMap.get(hash);
        tagSections.classList.remove('hidden');
        allTagsSection.classList.add('hidden');
        if (!groups || !groups.length) {
            tagSections.innerHTML = `<p>${escapeHtml(i18n.t('no_tags_found'))}</p>`;
            return;
        }
        tagSections.innerHTML = `
            <section id="${escapeHtml(hash)}" class="tag-section">
                <div class="tag-meta"><span class="meta-pill">${escapeHtml(i18n.t('tags'))}</span><span>${escapeHtml(i18n.formatPostCount(groups.length))}</span></div>
                <h3>${escapeHtml(hash)}</h3>
                <ul>${groups.map((group) => renderGroupItem(group, currentLanguage)).join('')}</ul>
            </section>
        `;
        if (typeof i18n.applyLanguageStateToInternalLinks === 'function') {
            i18n.applyLanguageStateToInternalLinks(tagSections);
        }
    }
    function renderPage() {
        const tagMap = buildTagMap();
        renderTagList(tagMap);
        renderSections(tagMap);
    }
    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
        articleGroupsData = data;
        renderPage();
    })
        .catch((error) => {
        console.error('Error loading grouped tags:', error);
        tagSections.classList.remove('hidden');
        tagSections.innerHTML = `<p>${escapeHtml(i18n.t('error_loading_tags'))}</p>`;
    });
    window.addEventListener('hashchange', renderPage);
    window.addEventListener('site-language-change', renderPage);
});
