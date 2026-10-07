import type { OverviewSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderOverviewSection(ctx: OverviewSectionContext) {
    const { Plotly, THEME, plotDefaults, baseData } = ctx;
    if (!Plotly || !baseData) return;

    if (global.document.getElementById('chart-monthly') && baseData.monthly_avg) {
      const months = Object.keys(baseData.monthly_avg).sort();
      const vals = months.map(m => baseData.monthly_avg[m]);
      const smoothed = vals.map((v, i) => {
        const slice = vals.slice(Math.max(0, i - 2), i + 3);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });

      Plotly.newPlot('chart-monthly', [
        { x: months, y: vals, type: 'scatter', mode: 'lines', line: { color: THEME.border, width: 1 }, name: copy.monthlyAverage, hovertemplate: '%{x}<br>%{y:.1f}%<extra></extra>' },
        { x: months, y: smoothed, type: 'scatter', mode: 'lines', line: { color: THEME.accent, width: 2.5, shape: 'spline' }, name: copy.label3MonthSmoothed, hovertemplate: copy.smoothed },
      ], {
        ...plotDefaults,

        yaxis: { ...plotDefaults.yaxis, range: [50, 105], ticksuffix: '%', title: copy.sleepQuality2 },
        xaxis: { ...plotDefaults.xaxis, title: '' },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.8)', bordercolor: THEME.border, borderwidth: 1 },
        hovermode: 'x unified',
      }, { responsive: true, displayModeBar: false });
    }

    if (global.document.getElementById('chart-scatter') && baseData.scatter) {
      const years = [...new Set(baseData.scatter.map(d => d.year))].sort();
      const colorMap: Record<number, string> = {
        2016: '#58a6ff', 2017: '#79c0ff', 2018: '#a5d6ff',
        2019: '#3fb950', 2020: '#56d364', 2021: '#c8b89a', 2022: '#f0883e',
        2023: '#bc8cff', 2024: '#d2a8ff', 2025: '#ffa657', 2026: '#ffb77b',
      };
      const normalizeBedtime = (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.normalizeBedtime
        : ((v: number) => (v < 12 ? v + 24 : v));

      const makeTrace = (pts: OverviewSectionContext['baseData']['scatter'], name: string, lineColor: string) => ({
        x: pts.map(d => normalizeBedtime(d.bedtime)),
        y: pts.map(d => d.duration),
        mode: 'markers', type: 'scatter', name,
        marker: {
          size: 5,
          color: pts.map(d => d.quality),
          colorscale: [[0, '#8b0000'], [0.5, '#c8b89a'], [1, '#3fb950']],
          cmin: 50, cmax: 100,
          opacity: 0.72,
          line: { color: lineColor, width: 0.5 },
        },
        text: pts.map(d => `${d.date}<br>${d.quality}%<br>${d.duration}h`),
        hovertemplate: '%{text}<extra>' + name + '</extra>',
      });

      const allTrace = makeTrace(baseData.scatter, copy.allYears, THEME.accent);
      const yearTraces = Object.fromEntries(years.map(yr => [String(yr), makeTrace(baseData.scatter.filter(d => d.year === yr), String(yr), colorMap[yr] || THEME.border)]));

      const selector = global.document.getElementById('scatter-selector');
      if (selector) {
        selector.innerHTML = '';
        const options = [copy.allYears, ...years.map(String)];
        const render = (key: string) => {
          const trace = key === copy.allYears ? allTrace : yearTraces[key];
          Plotly.newPlot('chart-scatter', [trace], {
            ...plotDefaults,
            xaxis: { ...plotDefaults.xaxis, title: copy.bedtime, tickmode: 'array', tickvals: [20,21,22,23,24,25,26,27,28,29], ticktext: ['20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00','05:00'], range: [19.5, 29.5], autorange: false, fixedrange: true },
            yaxis: { ...plotDefaults.yaxis, title: copy.actualSleepDurationHours, range: [3.5, 10.5] },
            margin: { t: 20, r: 40, b: 60, l: 60 },
          }, { responsive: true, displayModeBar: false });
          [...selector.querySelectorAll<HTMLElement>('.scatter-chip')].forEach(btn => btn.classList.toggle('active', btn.dataset.scatterKey === key));
        };
        options.forEach(key => {
          const btn = global.document.createElement('button');
          btn.className = 'scatter-chip';
          btn.type = 'button';
          btn.dataset.scatterKey = key;
          btn.textContent = key;
          btn.addEventListener('click', () => render(key));
          selector.appendChild(btn);
        });
        render(copy.allYears);
      } else {
        Plotly.newPlot('chart-scatter', [allTrace], {
          ...plotDefaults,
          xaxis: { ...plotDefaults.xaxis, title: copy.bedtime, tickmode: 'array', tickvals: [20,21,22,23,24,25,26,27,28,29], ticktext: ['20:00','21:00','22:00','23:00','00:00','01:00','02:00','03:00','04:00','05:00'], range: [19.5, 29.5], autorange: false, fixedrange: true },
          yaxis: { ...plotDefaults.yaxis, title: copy.actualSleepDurationHours, range: [3.5, 10.5] },
          margin: { t: 20, r: 40, b: 60, l: 60 },
        }, { responsive: true, displayModeBar: false });
      }
    }
  }

  root.renderOverviewSection = renderOverviewSection;
})(window);
