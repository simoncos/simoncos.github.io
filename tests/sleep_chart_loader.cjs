const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function fixture({ observer = true, runtime = 'charts.js',
    loader = 'gallery/research/assets/sleep-chart-loader.js' } = {}) {
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
        querySelector: () => ({ dataset: { runtime } }),
        querySelectorAll: () => [...elements.values()],
        getElementById: id => elements.get(id),
        createElement: tag => element(tag),
        head: { appendChild: script => scripts.push(script) },
    };
    if (observer) window.IntersectionObserver = class {
        constructor(callback) { intersect = callback; }
        observe() {} unobserve() {}
    };
    vm.runInNewContext(fs.readFileSync(loader, 'utf8'), {
        window, document, IntersectionObserver: window.IntersectionObserver, console: { error() {} },
    });
    return {
        window, scripts, draws, elements,
        enter(id) { const target = elements.get(id); target.top = 100; intersect([{ target, isIntersecting: true }]); },
        plotly() { window.Plotly = { newPlot: (el, ...args) => { draws.push([el.id, ...args]); return Promise.resolve(); } }; },
    };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

async function ready() {
    const f = fixture();
    f.plotly();
    f.enter('chart-scatter');
    f.scripts[0].onload();
    await tick();
    const jobs = [];
    f.window.Plotly.newPlot = (chart, data) => new Promise((resolve, reject) => {
        jobs.push({ data, reject, resolve() {
            chart.replaceChildren();
            chart.appendChild({textContent: 'DRAWN:' + data});
            resolve();
        }});
    });
    return { f, jobs, chart: f.elements.get('chart-scatter') };
}

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

    const race = await ready();
    race.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'old filter');
    await tick();
    race.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'latest filter');
    await tick();
    race.jobs[1].resolve();
    await tick();
    race.jobs[0].reject(new Error('Earlier draw failed late'));
    await tick();
    assert.equal(race.chart.children[0].textContent, 'DRAWN:latest filter',
        'An old failure cannot erase a successful new filter');

    const offscreen = await ready();
    offscreen.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'old filter');
    await tick();
    offscreen.chart.top = 6000;
    offscreen.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'latest filter');
    offscreen.jobs[0].reject(new Error('Earlier visible draw failed late'));
    await tick();
    assert.ok(offscreen.chart.children[0].textContent.includes('加载图表'));
    offscreen.f.enter('chart-scatter');
    await tick();
    assert.equal(offscreen.jobs[1].data, 'latest filter',
        'A pending offscreen filter also supersedes an in-flight draw');

    const retryRace = await ready();
    retryRace.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'old filter');
    await tick();
    retryRace.jobs[0].reject(new Error('Draw failed'));
    await tick();
    const oldRetry = retryRace.chart.children[0].listeners.click;
    retryRace.f.window.SleepEssayPlotly.newPlot('chart-scatter', 'latest filter');
    await tick();
    oldRetry();
    await tick();
    assert.equal(retryRace.jobs[2].data, 'latest filter', 'Retry always uses the latest selection');
    retryRace.jobs[2].resolve();
    await tick();
    retryRace.jobs[1].reject(new Error('Earlier retry failed late'));
    await tick();
    assert.equal(retryRace.chart.children[0].textContent, 'DRAWN:latest filter',
        'Each retry has its own identity');

    for (const name of ['sleep-2016-2026.js', 'sleep-2016-2026.en.js']) {
        const cached = fixture({ runtime: 'assets/' + name + '?v=20261003',
            loader: 'tests/fixtures/sleep-chart-loader-legacy.js' });
        cached.plotly();
        cached.enter('chart-scatter');
        assert.equal(cached.scripts[0].src, 'assets/' + name + '?v=20261003');
        assert.ok(fs.existsSync('gallery/research/assets/' + name), 'Cached loader URL remains available');
        cached.scripts[0].onload();
        await tick();
        cached.window.SleepEssayPlotly.newPlot('chart-scatter', ['legacy chart']);
        await tick();
        assert.equal(cached.draws.length, 1, 'The cached loader still exposes the chart adapter');
    }
    console.log('PASS: lazy loading, retry, latest-filter races, fallback, cached loaders');
})();
