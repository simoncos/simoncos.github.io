const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const redirects = JSON.parse(fs.readFileSync(path.join(root, 'data/redirects.json'), 'utf8'));

function redirectHref(target) {
    return target.startsWith('https://') || target.startsWith('http://') ? target : `/${target}`;
}

function expectedLocation(target, suffix) {
    if (target.startsWith('https://') || target.startsWith('http://')) {
        const url = new URL(target);
        const extra = new URL(`https://simoncos.github.io/${suffix}`);
        url.search = extra.search;
        url.hash = extra.hash;
        return url.href;
    }
    return `https://simoncos.github.io/${target}${suffix}`;
}

test('published URLs redirect once, preserving queries and chapter anchors', () => {
    for (const [old, target] of Object.entries(redirects)) {
        const html = fs.readFileSync(path.join(root, old), 'utf8');
        const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
        const href = redirectHref(target);
        const paths = [old];
        if (old.endsWith('/index.html')) paths.push(old.slice(0, -'index.html'.length));
        for (const source of paths) {
            for (const suffix of ['', '?lang=zh&utm_source=shared#chapter-3', '?slide=12#s12', '?q=%E8%AE%BE%E8%AE%A1#%E7%AB%A0%E8%8A%82']) {
                const location = new URL(`https://simoncos.github.io/${source}${suffix}`);
                const replacements = [];
                location.replace = url => replacements.push(url);
                vm.runInNewContext(script, { URL, window: { location } });
                assert.deepEqual(replacements, [expectedLocation(target, suffix)], source);
            }
        }
        assert.ok(html.includes(`<noscript><meta http-equiv="refresh" content="0; url=${href}"></noscript>`));
        assert.ok(html.includes(`<a href="${href}">`));
    }
});
