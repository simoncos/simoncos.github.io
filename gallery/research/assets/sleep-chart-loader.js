"use strict";
// Keep the essay readable before downloading its chart library and data.
// The bilingual renderers use only newPlot and do not consume its return value.
(() => {
    const scope = window;
    const runtime = document.querySelector('script[data-runtime]')?.dataset.runtime;
    const charts = Array.from(document.querySelectorAll('[id^="chart-"][style*="height"]'));
    if (!runtime || !charts.length)
        return;
    const en = document.documentElement.lang.startsWith('en');
    const messages = {
        waiting: en ? 'Chart loads as you read.' : '阅读到这里时加载图表。',
        loading: en ? 'Loading chart…' : '正在加载图表…',
        error: en ? 'Chart could not load. Retry' : '图表暂时未能加载，点击重试',
    };
    let loading;
    let initialized = false;
    let failed = false;
    const pending = new Map();
    function status(chart, text, retry) {
        chart.replaceChildren();
        const label = document.createElement(retry ? 'button' : 'p');
        label.textContent = text;
        label.style.cssText = 'padding:24px 12px;color:inherit;font:inherit;background:transparent;border:0;opacity:.7';
        if (retry) {
            label.type = 'button';
            label.style.cursor = 'pointer';
            label.addEventListener('click', retry);
        }
        else if (nearby(chart)) {
            label.setAttribute('role', 'status');
        }
        chart.appendChild(label);
    }
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
            document.head.appendChild(script);
        });
    }
    function nearby(chart) {
        const rect = chart.getBoundingClientRect();
        return rect.height > 0 && rect.bottom > -400 && rect.top < window.innerHeight + 400;
    }
    function draw(chart, args) {
        pending.delete(chart);
        observer?.unobserve(chart);
        chart.replaceChildren();
        Promise.resolve().then(() => scope.Plotly.newPlot(chart, ...args)).catch(error => {
            console.error(error);
            status(chart, messages.error, () => draw(chart, args));
        });
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (!entry.isIntersecting)
                continue;
            const chart = entry.target;
            const args = pending.get(chart);
            if (args)
                draw(chart, args);
            else if (!initialized && !failed)
                void start();
        }
    }, { rootMargin: '400px 0px' }) : undefined;
    scope.SleepEssayPlotly = {
        newPlot(target, ...args) {
            const chart = typeof target === 'string' ? document.getElementById(target) : target;
            if (!observer || nearby(chart))
                draw(chart, args);
            else {
                // A filter can change before its graph enters view: retain the latest data.
                pending.set(chart, args);
                status(chart, messages.waiting);
                observer.observe(chart);
            }
            return Promise.resolve();
        },
    };
    function start() {
        if (loading)
            return loading;
        failed = false;
        charts.forEach(chart => status(chart, messages.loading));
        loading = (async () => {
            if (!scope.Plotly)
                await loadScript('https://cdn.plot.ly/plotly-2.27.0.min.js');
            await loadScript(runtime);
            initialized = true;
        })().catch(error => {
            console.error(error);
            failed = true;
            loading = undefined;
            charts.forEach(chart => status(chart, messages.error, () => { void start(); }));
        });
        return loading;
    }
    charts.forEach(chart => {
        status(chart, messages.waiting);
        observer?.observe(chart);
    });
    if (!observer)
        void start();
})();
