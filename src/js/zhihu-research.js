"use strict";
// Progressive enhancement: evidence and data tables are already in the HTML.
(function () {
    const root = document.querySelector('.zr-main');
    const source = document.getElementById('zr-data');
    if (!root || !source)
        return;
    let data;
    try {
        data = JSON.parse(source.textContent || '');
    }
    catch (_) {
        return;
    }
    const people = new Set(Object.values(data.rankings).flatMap(group => Object.values(group).flatMap(rows => rows.map(r => r.name))));
    const metricIds = data.metrics.map(m => m.id);
    const cohortIds = data.cohorts.map(c => c.id);
    const personSelect = document.querySelector('#zr-person');
    const topicSelect = document.querySelector('#zr-topic-sort');
    const topicBody = document.querySelector('.zr-topics tbody');
    const topicRows = Array.from(topicBody?.rows || []);
    const topicValues = Object.fromEntries(Object.entries(data.topics).map(([key, rows]) => [key, new Map(rows.map(r => [r.name, r.count]))]));
    let state = { metric: 'agree', cohort: 'Net50k', person: '', order: 'Net10k', path: 'D', view: 'mutual', node: '' };
    const t = (en, zh) => window.SITE_SHELL?.lang === 'zh' ? zh : en;
    function readURL() {
        const q = new URL(location.href).searchParams;
        const valid = (key, choices, fallback) => choices.includes(q.get(key) || '') ? q.get(key) : fallback;
        const cohort = valid('cohort', cohortIds, 'Net50k');
        const node = Number(q.get('node'));
        const nodeValid = Number.isInteger(node) && node >= 1 && node <= (cohort === 'Net50k' ? 375 : 1896);
        state = {
            metric: valid('metric', metricIds, 'agree'), cohort,
            person: people.has(q.get('person') || '') ? q.get('person') : '',
            order: valid('order', cohortIds, 'Net10k'), path: valid('path', ['B', 'C', 'D'], 'D'),
            view: nodeValid ? 'all' : valid('view', ['mutual', 'all', 'groups'], 'mutual'),
            node: nodeValid ? String(node) : ''
        };
    }
    function render() {
        root.querySelectorAll('[data-profile]').forEach(el => { el.hidden = el.dataset.profile !== state.metric; });
        root.querySelectorAll('[data-ranking-cohort]').forEach(el => { el.hidden = el.dataset.rankingCohort !== state.cohort; });
        root.querySelectorAll('[data-network]').forEach(el => { el.dataset.active = String(el.dataset.network === state.cohort); });
        ['metric', 'cohort', 'path', 'view'].forEach(key => {
            root.querySelectorAll(`button[data-${key}]`).forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === state[key])));
        });
        root.querySelectorAll('[data-ranking-person]').forEach(el => { el.dataset.selected = String(el.dataset.rankingPerson === state.person); });
        if (personSelect)
            personSelect.value = state.person;
        if (topicSelect)
            topicSelect.value = state.order;
        const result = document.getElementById('zr-person-result');
        if (result) {
            result.textContent = state.person ? state.person + ' · ' + Object.entries(data.rankings[state.cohort]).map(([key, rows]) => {
                const pos = rows.findIndex(r => r.name === state.person);
                const label = key === 'authority' ? t('Authority', '权威度') : key === 'hub' ? t('Hub', '枢纽度') : 'PageRank';
                return `${label}: ${pos < 0 ? t('not in published Top 5', '未列入原文前五') : '#' + (pos + 1)}`;
            }).join(' · ') : '';
        }
        const counts = topicValues[state.order];
        const sorted = [...topicRows].sort((a, b) => (counts.get(b.dataset.topicName) ?? -1) - (counts.get(a.dataset.topicName) ?? -1));
        sorted.forEach(row => topicBody?.appendChild(row));
        const hops = 'ABCD'.indexOf(state.path);
        root.querySelectorAll('[data-step]').forEach(el => { el.dataset.lit = String(Number(el.dataset.step) <= hops); });
        const pathResult = root.querySelector('.zr-path-result');
        if (pathResult)
            pathResult.textContent = 'ABCD'.slice(0, hops + 1).split('').join(' → ') + t(`: ${hops} following ${hops === 1 ? 'link' : 'links'}.`, `：经过 ${hops} 条关注连接。`);
        root.dataset.graphCohort = state.cohort;
        root.dataset.graphView = state.view;
        root.dataset.graphNode = state.node;
        root.dispatchEvent(new CustomEvent('zrstate'));
    }
    function change(next) {
        state = { ...state, ...next, ...(next.cohort && next.cohort !== state.cohort ? { node: '' } : {}) };
        const url = new URL(location.href);
        const defaults = { metric: 'agree', cohort: 'Net50k', person: '', order: 'Net10k', path: 'D', view: 'mutual', node: '' };
        Object.entries(state).forEach(([key, val]) => val === defaults[key] ? url.searchParams.delete(key) : url.searchParams.set(key, val));
        try {
            history.pushState(null, '', url.pathname + url.search + url.hash);
        }
        catch (_) { /* Local-file previews can reject history changes. */ }
        render();
    }
    root.querySelectorAll('button[data-metric]').forEach(b => b.addEventListener('click', () => change({ metric: b.dataset.metric })));
    root.querySelectorAll('button[data-cohort]').forEach(b => b.addEventListener('click', () => change({ cohort: b.dataset.cohort })));
    root.querySelectorAll('button[data-path]').forEach(b => b.addEventListener('click', () => change({ path: b.dataset.path })));
    root.querySelectorAll('button[data-view]').forEach(b => b.addEventListener('click', () => change({ view: b.dataset.view, node: '' })));
    root.addEventListener('zrnetworkchange', (event) => change(event.detail));
    personSelect?.addEventListener('change', () => change({ person: personSelect.value }));
    topicSelect?.addEventListener('change', () => change({ order: topicSelect.value }));
    window.addEventListener('popstate', () => { readURL(); render(); });
    window.SITE_SHELL?.onLang?.(() => render());
    readURL();
    render();
    root.classList.add('zr-ready');
})();
