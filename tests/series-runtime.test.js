const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/article_index_multiple_series.json'), 'utf8'));

function preferredEntry(group, language) {
    const languages = group.languages || {};
    return languages[language] || languages.en || languages.zh || null;
}

function secondaryEntry(group, language) {
    const languages = group.languages || {};
    const primary = preferredEntry(group, language);
    const alternate = language === 'en' ? 'zh' : 'en';
    return languages[alternate] || Object.values(languages).find((entry) => entry.file !== primary?.file) || null;
}

async function renderSeries(payload, { language = 'en', fallback = '<li>Static fallback</li>', reject = null } = {}) {
    const seriesList = { innerHTML: fallback };
    const errors = [];
    const listeners = {};
    const context = {
        console: { error: (...args) => errors.push(args.join(' ')), warn: (...args) => errors.push(args.join(' ')) },
        document: {
            addEventListener(name, callback) {
                if (name === 'DOMContentLoaded') callback();
            },
            getElementById(id) {
                return id === 'series-list' ? seriesList : null;
            }
        },
        window: {
            SITE_I18N: {
                getCurrentLanguage: () => language,
                t: (key) => key,
                formatPostCount: (count) => `${count} parts`,
                formatSeriesPart: (part) => `Part ${part}`,
                applyLanguageStateToInternalLinks: () => {}
            },
            SITE_ARTICLE_GROUPS: {
                fetchArticleGroups: () => reject ? Promise.reject(new Error(reject)) : Promise.resolve(payload),
                getPreferredEntry: preferredEntry,
                getSecondaryEntry: secondaryEntry
            },
            addEventListener(name, callback) {
                listeners[name] = callback;
            }
        },
        Promise,
        setTimeout
    };

    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/js/load-series-page.js'), 'utf8'), context);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { html: seriesList.innerHTML, errors, listeners };
}

test('series runtime renders separate compact rows with ordered bilingual parts', async () => {
    const result = await renderSeries(FIXTURE);

    assert.equal((result.html.match(/class="series-ledger-row"/g) || []).length, 2);
    assert.equal((result.html.match(/class="series-part-row"/g) || []).length, 3);
    assert.equal((result.html.match(/Emerging from the Abyss/g) || []).length, 1);
    assert.equal((result.html.match(/从深渊中浮现/g) || []).length, 1);
    assert.ok(result.html.indexOf('Emerging from the Abyss') < result.html.indexOf('Across Three Abysses'));
    assert.ok(result.html.indexOf('Field Notes') < result.html.indexOf('RedPiggy, an emerging AI existence'));
});

test('series runtime preserves meaningful fallback for rejected, malformed, and empty data', async () => {
    const fallback = '<li class="series-ledger-row">Static fallback</li>';
    const cases = [
        { payload: null, reject: 'network down' },
        { payload: { groups: null } },
        { payload: { groups: [] } }
    ];

    for (const scenario of cases) {
        const result = await renderSeries(scenario.payload, { fallback, reject: scenario.reject });
        assert.equal(result.html, fallback);
        assert.ok(result.errors.some((message) => message.includes('preserving static fallback')));
    }
});
