const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const GALLERY_PAYLOAD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/gallery_data.json'), 'utf8'));
const GALLERY_HTML = fs.readFileSync(path.join(ROOT, 'gallery.html'), 'utf8');
const STATIC_FALLBACK = GALLERY_HTML.match(
    /<!-- static-fallback:start gallery-grid -->([\s\S]*?)<!-- static-fallback:end gallery-grid -->/
)[1].trim();

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function runGallery(responses, { fallback = STATIC_FALLBACK } = {}) {
    let html = fallback;
    let language = 'en';
    let ready;
    let fetchIndex = 0;
    const writes = [];
    const errors = [];
    const listeners = {};
    const gallery = {};
    Object.defineProperty(gallery, 'innerHTML', {
        get() { return html; },
        set(value) { html = value; writes.push(value); }
    });

    const pageUrl = new URL('https://site.test/gallery.html?lang=en');
    const context = {
        console: {
            error: (...args) => errors.push(args.map(String).join(' ')),
            warn: (...args) => errors.push(args.map(String).join(' '))
        },
        document: {
            addEventListener(name, callback) {
                if (name === 'DOMContentLoaded') ready = callback;
            },
            getElementById(id) {
                return id === 'gallery-grid' ? gallery : null;
            }
        },
        fetch: async () => {
            const response = responses[Math.min(fetchIndex, responses.length - 1)];
            fetchIndex += 1;
            if (response.reject) throw new Error(response.reject);
            return {
                ok: response.status === undefined || response.status < 400,
                status: response.status || 200,
                json: async () => clone(response.payload)
            };
        },
        window: {
            SITE_CONFIG: {
                resolvePath: (target) => `/base/${target}`,
                assetVersion: 'fixture-v1'
            },
            SITE_I18N: {
                getCurrentLanguage: () => language,
                formatDate: (value) => `date:${value}`,
                resolveLocalizedUrl(target, currentLanguage) {
                    const url = new URL(target, pageUrl);
                    if (url.origin !== pageUrl.origin) return target;
                    url.searchParams.set('lang', currentLanguage);
                    return `${url.pathname.replace(/^\//, '')}${url.search}${url.hash}`;
                },
                applyLanguageStateToInternalLinks: () => {},
                t: (key) => key
            },
            addEventListener(name, callback) {
                listeners[name] = callback;
            }
        },
        Promise,
        URL,
        setTimeout
    };

    vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/js/load-gallery.js'), 'utf8'), context);
    ready();
    await settle();

    return {
        get html() { return html; },
        writes,
        errors,
        async setLanguage(nextLanguage) {
            language = nextLanguage;
            pageUrl.searchParams.set('lang', nextLanguage);
            listeners['site-language-change']();
            await settle();
            return html;
        }
    };
}

test('Gallery runtime renders the complete validated collection atomically with authored alt text', async () => {
    const result = await runGallery([{ payload: GALLERY_PAYLOAD }]);

    assert.equal((result.html.match(/class="project-card gallery-card/g) || []).length, GALLERY_PAYLOAD.items.length);
    assert.match(result.html, /alt="Climbers following a fixed rope on Haba Snow Mountain"/);
    assert.equal(result.writes.length, 1);
});

test('Gallery runtime preserves the six-card fallback for rejected, malformed, and empty responses', async () => {
    const scenarios = [
        { reject: 'network down' },
        { payload: null },
        { payload: {} },
        { payload: { items: {} } },
        { payload: { items: [] } },
        { payload: { items: [{}] } }
    ];

    for (const scenario of scenarios) {
        const result = await runGallery([scenario]);
        assert.equal(result.html, STATIC_FALLBACK);
        assert.equal(result.writes.length, 0);
        assert.ok(result.errors.some((message) => message.includes('preserving static fallback')));
    }
});

test('Gallery runtime rejects duplicate ids, orders, and section ids before mutation', async () => {
    for (const field of ['id', 'galleryOrder', 'sectionId']) {
        const payload = clone(GALLERY_PAYLOAD);
        payload.items[1][field] = payload.items[0][field] || 'gallery-duplicate';
        if (field === 'sectionId' && !payload.items[0].sectionId) payload.items[0].sectionId = 'gallery-duplicate';

        const result = await runGallery([{ payload }]);
        assert.equal(result.html, STATIC_FALLBACK, field);
        assert.equal(result.writes.length, 0, field);
    }
});

test('Gallery runtime rejects unsafe URL schemes and attribute-bearing paths before mutation', async () => {
    const unsafeValues = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'gallery/item.html" onclick="alert(1)',
        '../outside.html',
        'gallery\\outside.html',
        'gallery/item with spaces.html',
        '//example.com/protocol-relative'
    ];

    for (const unsafeValue of unsafeValues) {
        for (const target of ['paths.en', 'cover']) {
            const payload = clone(GALLERY_PAYLOAD);
            if (target === 'cover') payload.items[0].cover = unsafeValue;
            else payload.items[0].paths.en = unsafeValue;

            const result = await runGallery([{ payload }]);
            assert.equal(result.html, STATIC_FALLBACK, `${target}: ${unsafeValue}`);
            assert.equal(result.writes.length, 0, `${target}: ${unsafeValue}`);
        }
    }
});

test('Gallery runtime accepts safe HTTPS targets', async () => {
    const payload = clone(GALLERY_PAYLOAD);
    payload.items[0].paths = {
        en: 'https://example.com/gallery/item?source=qa#focus',
        zh: 'https://example.com/zh/gallery/item?source=qa#focus'
    };

    const result = await runGallery([{ payload }]);

    assert.match(result.html, /href="https:\/\/example\.com\/gallery\/item\?source=qa#focus"/);
});

test('Gallery runtime restores the captured fallback when a language refetch fails', async () => {
    const result = await runGallery([
        { payload: GALLERY_PAYLOAD },
        { reject: 'language fetch failed' }
    ]);
    assert.notEqual(result.html, STATIC_FALLBACK);

    const afterLanguageFailure = await result.setLanguage('zh');

    assert.equal(afterLanguageFailure, STATIC_FALLBACK);
    assert.ok(result.errors.some((message) => message.includes('preserving static fallback')));
});

test('Gallery runtime rerenders localized alt text and preserves local query/hash suffixes', async () => {
    const payload = clone(GALLERY_PAYLOAD);
    payload.items[0].paths.en = 'gallery/talk.html?source=qa#focus';
    payload.items[0].paths.zh = 'gallery/talk.html?source=qa#focus';
    const result = await runGallery([{ payload }, { payload }]);

    const chinese = await result.setLanguage('zh');

    assert.match(chinese, /alt="[^\"]*[\u3400-\u9fff][^\"]*"/);
    assert.doesNotMatch(chinese, /alt="[^\"]* cover"/);
    assert.match(chinese, /href="gallery\/talk\.html\?source=qa&amp;lang=zh#focus"/);
});
