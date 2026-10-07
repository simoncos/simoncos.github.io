// Keep the essay readable before downloading its chart library and data.
// The shared renderer uses only newPlot and does not consume its return value.
(() => {
  type Plotter = { newPlot: (target: HTMLElement | string, ...args: unknown[]) => Promise<unknown> };
  const scope = window as typeof window & { Plotly?: Plotter; SleepEssayPlotly?: Plotter };
  const runtime = document.querySelector<HTMLScriptElement>('script[data-runtime]')?.dataset.runtime;
  const charts = Array.from(document.querySelectorAll<HTMLElement>('[id^="chart-"][style*="height"]'));
  if (!runtime || !charts.length) return;
  const runtimeUrl = runtime;
  const en = document.documentElement.lang.startsWith('en');
  const messages = {
    waiting: en ? 'Chart loads as you read.' : '阅读到这里时加载图表。',
    loading: en ? 'Loading chart…' : '正在加载图表…',
    error: en ? 'Chart could not load. Retry' : '图表暂时未能加载，点击重试',
  };
  let loading: Promise<void> | undefined;
  let initialized = false;
  let failed = false;
  type DrawRequest = { args: unknown[] };
  const pending = new Map<HTMLElement, DrawRequest>();
  const latest = new Map<HTMLElement, DrawRequest>();

  function status(chart: HTMLElement, text: string, retry?: () => void) {
    chart.replaceChildren();
    const label = document.createElement(retry ? 'button' : 'p');
    label.textContent = text;
    label.style.cssText = 'padding:24px 12px;color:inherit;font:inherit;background:transparent;border:0;opacity:.7';
    if (retry) {
      (label as HTMLButtonElement).type = 'button';
      label.style.cursor = 'pointer';
      label.addEventListener('click', retry);
    } else if (nearby(chart)) {
      label.setAttribute('role', 'status');
    }
    chart.appendChild(label);
  }

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); reject(new Error(`Could not load ${src}`)); };
      document.head.appendChild(script);
    });
  }

  function nearby(chart: HTMLElement) {
    const rect = chart.getBoundingClientRect();
    return rect.height > 0 && rect.bottom > -400 && rect.top < window.innerHeight + 400;
  }

  function draw(chart: HTMLElement, request: DrawRequest) {
    if (latest.get(chart) !== request) return;
    pending.delete(chart);
    observer?.unobserve(chart);
    chart.replaceChildren();
    Promise.resolve().then(() => {
      if (latest.get(chart) !== request) return;
      if (!scope.Plotly) throw new Error('Chart library is unavailable');
      return scope.Plotly.newPlot(chart, ...request.args);
    }).catch(error => {
      if (latest.get(chart) !== request) return;
      console.error(error);
      status(chart, messages.error, () => {
        const current = latest.get(chart);
        if (current) requestPlot(chart, current.args);
      });
    });
  }

  function requestPlot(chart: HTMLElement, args: unknown[]) {
    const request = { args };
    latest.set(chart, request);
    if (!observer || nearby(chart)) draw(chart, request);
    else {
      // Pending filters also supersede an older draw that is still in flight.
      pending.set(chart, request);
      status(chart, messages.waiting);
      observer.observe(chart);
    }
  }

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const chart = entry.target as HTMLElement;
      const request = pending.get(chart);
      if (request) draw(chart, request);
      else if (!initialized && !failed) void start();
    }
  }, { rootMargin: '400px 0px' }) : undefined;

  scope.SleepEssayPlotly = {
    newPlot(target, ...args) {
      const chart = typeof target === 'string' ? document.getElementById(target) : target;
      if (!chart) throw new Error(`Chart target is missing: ${target}`);
      requestPlot(chart, args);
      return Promise.resolve();
    },
  };

  function start(): Promise<void> {
    if (loading) return loading;
    failed = false;
    charts.forEach(chart => status(chart, messages.loading));
    loading = (async () => {
      if (!scope.Plotly) await loadScript('https://cdn.plot.ly/plotly-2.27.0.min.js');
      await loadScript(runtimeUrl);
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
  if (!observer) void start();
})();
