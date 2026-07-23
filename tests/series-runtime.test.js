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

function anchorNodes(root) {
    const matches = [...root.innerHTML.matchAll(/<a\b[^>]*>/g)];
    return matches.map((match) => {
        let openTag = match[0];
        const attribute = (name) => {
            const found = openTag.match(new RegExp(`\\s${name}="([^"]*)"`));
            return found ? found[1] : null;
        };
        return {
            dataset: {
                seriesGroup: attribute('data-series-group') || undefined,
                skipLangRewrite: attribute('data-skip-lang-rewrite') || undefined
            },
            getAttribute: attribute,
            setAttribute(name, value) {
                const escapedValue = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                const nextTag = new RegExp(`\\s${name}="[^"]*"`).test(openTag)
                    ? openTag.replace(new RegExp(`(\\s${name}=)"[^"]*"`), `$1"${escapedValue}"`)
                    : openTag.replace(/>$/, ` ${name}="${escapedValue}">`);
                root.innerHTML = root.innerHTML.replace(openTag, nextTag);
                openTag = nextTag;
            }
        };
    });
}

async function renderSeries(payload, { language = 'en', fallback = '<li>Static fallback</li>', reject = null } = {}) {
    let currentLanguage = language;
    const pageUrl = new URL(`http://site.test/blogs.html?lang=${language}`);
    const seriesList = {
        innerHTML: fallback,
        querySelectorAll() {
            return anchorNodes(this);
        }
    };
    const errors = [];
    const listeners = {};
    const location = {
        origin: pageUrl.origin,
        pathname: pageUrl.pathname,
        get href() {
            return pageUrl.toString();
        }
    };
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
            location,
            SITE_I18N: {
                getCurrentLanguage: () => currentLanguage,
                t: (key) => key,
                formatPostCount: (count) => `${count} parts`,
                formatSeriesPart: (part) => `${currentLanguage === 'zh' ? '第' : 'Part '}${part}${currentLanguage === 'zh' ? '篇' : ''}`,
                formatSeriesCount: (count) => `${count} parts`,
                applyLanguageStateToInternalLinks(root) {
                    root.querySelectorAll('a[href]').forEach((anchor) => {
                        const rawHref = anchor.getAttribute('href');
                        const url = new URL(rawHref, pageUrl);
                        if (url.origin !== pageUrl.origin || !/\.html$/i.test(url.pathname)) return;
                        url.searchParams.set('lang', currentLanguage);
                        anchor.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
                    });
                }
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
        setTimeout,
        URL
    };

    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/js/load-series-page.js'), 'utf8'), context);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
        get html() {
            return seriesList.innerHTML;
        },
        errors,
        listeners,
        setLanguage(nextLanguage) {
            currentLanguage = nextLanguage;
            pageUrl.searchParams.set('lang', nextLanguage);
            listeners['site-language-change']();
            return seriesList.innerHTML;
        },
        setLinkHref(groupId, href) {
            const anchor = seriesList.querySelectorAll('a[href]').find((candidate) => candidate.dataset.seriesGroup === groupId);
            assert.ok(anchor, `missing link for series group ${groupId}`);
            anchor.setAttribute('href', href);
        }
    };
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

test('series runtime preserves fallback for deeply malformed active-language entries without partial rows', async () => {
    const fallback = '<li class="series-ledger-row">Static fallback</li>';
    const cases = [
        { title: '', file: 'redpiggy-part-two.en.html' },
        { title: 'Missing file', file: '' },
        { title: 'Traversal', file: '../outside.html' }
    ];

    for (const malformedEntry of cases) {
        const payload = JSON.parse(JSON.stringify(FIXTURE));
        payload.groups[0].languages.en = malformedEntry;
        const result = await renderSeries(payload, { fallback });
        assert.equal(result.html, fallback);
        assert.ok(result.errors.some((message) => message.includes('preserving static fallback')));
    }
});

test('series runtime preserves fallback for a series-free payload', async () => {
    const fallback = '<li class="series-ledger-row">Static fallback</li>';
    const result = await renderSeries({
        groups: [{
            id: 'standalone',
            series: null,
            languages: { en: { title: 'Standalone', file: 'standalone.en.html' } }
        }]
    }, { fallback });

    assert.equal(result.html, fallback);
    assert.ok(result.errors.some((message) => message.includes('preserving static fallback')));
});

test('series runtime rejects unsafe filename injection and preserves fallback', async () => {
    const fallback = '<li class="series-ledger-row">Static fallback</li>';
    const payload = JSON.parse(JSON.stringify(FIXTURE));
    payload.groups[0].languages.en.file = 'unsafe.html" onclick="alert(1)';

    const result = await renderSeries(payload, { fallback });

    assert.equal(result.html, fallback);
    assert.doesNotMatch(result.html, /onclick|alert/);
});

test('series runtime rerenders EN to ZH to EN without duplicate rows or parts', async () => {
    const result = await renderSeries(FIXTURE);

    const chinese = result.setLanguage('zh');
    assert.equal((chinese.match(/class="series-ledger-row"/g) || []).length, 2);
    assert.equal((chinese.match(/class="series-part-row"/g) || []).length, 3);
    assert.equal((chinese.match(/从深渊中浮现/g) || []).length, 1);
    assert.equal((chinese.match(/Emerging from the Abyss/g) || []).length, 1);
    assert.ok(chinese.indexOf('从深渊中浮现') < chinese.indexOf('跨过三个深渊'));

    const english = result.setLanguage('en');
    assert.equal((english.match(/class="series-ledger-row"/g) || []).length, 2);
    assert.equal((english.match(/class="series-part-row"/g) || []).length, 3);
    assert.equal((english.match(/Emerging from the Abyss/g) || []).length, 1);
    assert.equal((english.match(/从深渊中浮现/g) || []).length, 1);
});

test('series runtime preserves an existing query and hash through localized link rewrites', async () => {
    const result = await renderSeries(FIXTURE);
    result.setLinkHref('redpiggy-part-one', 'blogs/redpiggy-part-one.en.html?source=qa#focus');

    const chinese = result.setLanguage('zh');

    assert.match(chinese, /href="\/blogs\/redpiggy-part-one\.html\?source=qa&amp;lang=zh#focus"/);
});
