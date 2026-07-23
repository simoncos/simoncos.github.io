document.addEventListener('DOMContentLoaded', function () {
    const topicList = document.getElementById('topic-list');
    if (!topicList) {
        return;
    }

    const i18n = window.SITE_I18N || {};
    const articleGroupsApi = window.SITE_ARTICLE_GROUPS || {};
    const topicsCount = document.getElementById('essays-topics-count');
    const staticFallback = topicList.innerHTML;
    let articleGroupsData = null;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function displayTopic(tag) {
        const normalized = String(tag || '');
        if (/^(ai|km)$/i.test(normalized)) {
            return normalized.toUpperCase();
        }
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function activeTopic() {
        const match = window.location.hash.match(/^#topic-(.+)$/);
        if (!match) {
            return '';
        }
        try {
            return decodeURIComponent(match[1]);
        } catch (_error) {
            return '';
        }
    }

    function buildTopicMap() {
        const topicMap = new Map();
        (articleGroupsData ? articleGroupsData.groups : []).forEach((group) => {
            (group.tags || []).forEach((tag) => {
                topicMap.set(tag, (topicMap.get(tag) || 0) + 1);
            });
        });
        return new Map([...topicMap.entries()].sort(([tagA], [tagB]) => tagA.localeCompare(tagB)));
    }

    function preserveStaticFallback(reason) {
        if (!staticFallback.trim()) {
            return false;
        }
        topicList.innerHTML = staticFallback;
        console.warn(`Topic data unavailable; preserving static fallback: ${reason}`);
        return true;
    }

    function renderTopics() {
        const topicMap = buildTopicMap();
        if (!topicMap.size) {
            if (!preserveStaticFallback('empty or topic-free article groups payload')) {
                topicList.innerHTML = `<li>${escapeHtml(i18n.t('no_tags_found'))}</li>`;
            }
            return;
        }

        const selectedTopic = activeTopic();
        const allCount = topicMap.size + 1;
        if (topicsCount) {
            topicsCount.textContent = String(allCount);
        }

        const rows = [...topicMap.entries()].map(([tag, count]) => {
            const isActive = selectedTopic === tag;
            return `<li><a href="#topic-${encodeURIComponent(tag)}"${isActive ? ' class="active-topic" aria-current="true"' : ''}><span>${escapeHtml(displayTopic(tag))}</span><span>${escapeHtml(count)}</span></a></li>`;
        });
        rows.push(`<li><a href="#topics"${selectedTopic ? '' : ' class="active-topic" aria-current="true"'}><span>${escapeHtml(i18n.t('essays_all_topics'))}</span><span>${escapeHtml(allCount)}</span></a></li>`);
        topicList.innerHTML = rows.join('');
    }

    articleGroupsApi.fetchArticleGroups()
        .then((data) => {
            articleGroupsData = data;
            renderTopics();
        })
        .catch((error) => {
            if (!preserveStaticFallback(String(error))) {
                console.error('Error loading grouped topics:', error);
                topicList.innerHTML = `<li>${escapeHtml(i18n.t('error_loading_tags'))}</li>`;
            }
        });

    window.addEventListener('hashchange', renderTopics);
    window.addEventListener('site-language-change', renderTopics);
});
