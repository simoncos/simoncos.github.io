const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../src/js/work.js'), 'utf8');

function openWork(hash) {
    let focused = null;
    const frames = [];
    const listeners = {};
    const classList = () => {
        const values = new Set();
        return { add: c => values.add(c), remove: c => values.delete(c), contains: c => values.has(c),
            toggle: (c, on) => on ? values.add(c) : values.delete(c) };
    };
    const element = () => ({ classList: classList(), addEventListener() {}, removeAttribute() {}, setAttribute() {},
        focus() { focused = this; }, scrollIntoView() {}, offsetWidth: 100 });
    const card = { ...element(), id: 'problem-solving' };
    const topics = ['apps', 'research', 'sharing', 'games', 'music'].map(id => ({ ...element(), id,
        querySelector: selector => selector === '[data-work="problem-solving"]' && id === 'sharing' ? card : null }));
    const wheel = { ...element(), querySelectorAll: selector => selector === '.wheel-title' ? topics : [] };
    const work = { ...element(), querySelectorAll: selector => selector === 'section.topic' ? topics : [] };
    const location = new URL(`https://simoncos.github.io/gallery.html?lang=zh&utm_source=old${hash}`);
    const document = { activeElement: null, documentElement: { hasAttribute: () => false }, addEventListener() {},
        querySelector: selector => selector === '[data-work]' ? work : wheel };
    const window = { location, innerWidth: 1280, setTimeout() {}, scrollTo() {},
        addEventListener: (name, callback) => { listeners[name] = callback; } };
    const history = { replaceState: (_state, _unused, url) => { location.href = new URL(url, location).href; } };
    vm.runInNewContext(code, { window, document, history, location, CSS: { escape: s => s },
        requestAnimationFrame: cb => frames.push(cb), HTMLButtonElement: class {} });
    frames.forEach(cb => cb());
    return { location, focused, topics, listeners };
}

test('legacy Work arrival preserves the complete work address and focuses its card', () => {
    const page = openWork('#talks/problem-solving');
    assert.equal(page.location.hash, '#sharing/problem-solving');
    assert.equal(page.location.search, '?lang=zh&utm_source=old');
    assert.equal(page.focused.id, 'problem-solving');
    assert.equal(page.topics.find(t => t.classList.contains('is-current')).id, 'sharing');
});

test('all current categories and the old category-only alias open their intended section', () => {
    for (const [hash, expected] of [['#talks', 'sharing'], ['#visual', 'research'],
        ...['apps', 'research', 'sharing', 'games', 'music'].map(id => ['#' + id, id])]) {
        const page = openWork(hash);
        assert.equal(page.location.hash, '#' + expected);
        assert.equal(page.topics.find(t => t.classList.contains('is-current')).id, expected);
    }
});
