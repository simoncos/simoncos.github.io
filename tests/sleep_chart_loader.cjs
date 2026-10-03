const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture({ observer = true } = {}) {
    const scripts = [], draws = [], elements = new Map();
    let intersect;
    const element = id => ({
        id, style: {}, children: [], listeners: {}, top: 6000,
        replaceChildren() { this.children = []; },
        appendChild(child) { this.children.push(child); },
        setAttribute() {}, remove() {},
        addEventListener(name, fn) { this.listeners[name] = fn; },
        getBoundingClientRect() { return { top: this.top, bottom: this.top + 360, height: 360 }; },
    });
    for (const id of ['chart-scatter', 'chart-mood']) elements.set(id, element(id));
    const window = { innerHeight: 844 };
    const document = {
        documentElement: { lang: 'zh' },
        querySelector: () => ({ dataset: { runtime: 'charts.js' } }),
        querySelectorAll: () => [...elements.values()],
        getElementById: id => elements.get(id),
        createElement: tag => element(tag),
        head: { appendChild: script => scripts.push(script) },
    };
    if (observer) window.IntersectionObserver = class {
        constructor(callback) { intersect = callback; }
        observe() {} unobserve() {}
    };
    vm.runInNewContext(fs.readFileSync('gallery/research/assets/sleep-chart-loader.js', 'utf8'), {
        window, document, IntersectionObserver: window.IntersectionObserver, console: { error() {} },
    });
    return {
        window, scripts, draws, elements,
        enter(id) { const target = elements.get(id); target.top = 100; intersect([{ target, isIntersecting: true }]); },
        plotly() { window.Plotly = { newPlot: (el, ...args) => { draws.push([el.id, ...args]); return Promise.resolve(); } }; },
    };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

(async () => {
    const f = fixture();
    assert.equal(f.scripts.length, 0, 'No heavy dependencies before the reader approaches a chart');
    f.enter('chart-scatter');
    f.enter('chart-scatter');
    assert.equal(f.scripts.length, 1, 'Concurrent intersections share one download');
    f.scripts[0].onerror();
    await tick();
    assert.equal(f.scripts.length, 1, 'A failed CDN does not start an endless retry loop');
    const retry = f.elements.get('chart-scatter').children[0];
    assert.ok(retry.textContent.includes('重试'));
    retry.listeners.click();
    assert.equal(f.scripts.length, 2);
    f.plotly();
    f.scripts[1].onload();
    await tick();
    assert.equal(f.scripts[2].src, 'charts.js');
    f.scripts[2].onload();
    await tick();
    f.window.SleepEssayPlotly.newPlot('chart-scatter', ['visible']);
    f.window.SleepEssayPlotly.newPlot('chart-mood', ['old filter']);
    f.window.SleepEssayPlotly.newPlot('chart-mood', ['new filter']);
    await tick();
    assert.equal(f.draws.length, 1, 'Offscreen charts do not render');
    f.enter('chart-mood');
    await tick();
    assert.equal(f.draws.length, 2);
    assert.equal(f.draws[1][1][0], 'new filter', 'Latest filter wins before first render');
    const fallback = fixture({ observer: false });
    assert.equal(fallback.scripts.length, 1, 'Browsers without IntersectionObserver still get charts');
    console.log('PASS: chart loading, deduplication, retry, visibility, filters, fallback');
})();
