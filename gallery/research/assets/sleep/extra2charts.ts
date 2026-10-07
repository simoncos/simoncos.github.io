import type { Extra2ChartsContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  root.renderExtra2Charts = function(ctx: Extra2ChartsContext) {
    const { Plotly, THEME, plotDefaults, extra2Data } = ctx;
    if (!Plotly || !extra2Data) return;

    // ── chart-bedtime-cost ───────────────────────────────────────────────
    if (global.document.getElementById('chart-bedtime-cost') && extra2Data.bedtime_cost) {
      const bc = extra2Data.bedtime_cost;
      const hours = Object.keys(bc).sort((a, b) => +a - +b);
      const labels = hours.map(h => bc[h].label);
      const diffs  = hours.map(h => bc[h].diff);
      const ns     = hours.map(h => bc[h].n);
      const colors = diffs.map(d => d >= 0 ? THEME.green : THEME.red);

      Plotly.newPlot('chart-bedtime-cost', [{
        x: labels,
        y: diffs,
        type: 'bar',
        marker: { color: colors, opacity: 0.85 },
        customdata: hours.map((h, i) => [bc[h].q, ns[i]]),
        hovertemplate: copy.vsBaselineAvgQualityNights,
        text: diffs.map(d => `${d > 0 ? '+' : ''}${d.toFixed(1)}%`),
        textposition: 'auto',
        textfont: { size: 11, color: '#ffffff' },
      }], {
        ...plotDefaults,
        yaxis: { ...plotDefaults.yaxis, title: copy.qualityDeltaVsBaseline, zeroline: true, zerolinecolor: THEME.border, zerolinewidth: 1, range: [-30, 12] },
        xaxis: { ...plotDefaults.xaxis, title: copy.bedtimeWindow },
        shapes: [{
          type: 'line', x0: -0.5, x1: labels.length - 0.5, y0: 0, y1: 0,
          line: { color: THEME.border, width: 1, dash: 'dot' },
        }],
        margin: { t: 30, r: 20, b: 60, l: 60 },
      }, { responsive: true, displayModeBar: false });
    }

    // ── chart-mood-quality ───────────────────────────────────────────────
    if (global.document.getElementById('chart-mood-quality') && extra2Data.mood_quality) {
      const mq: {buckets: string[]; matrix: Record<string, {Good: number; OK: number; Bad: number; n: number}>} = extra2Data.mood_quality;
      const buckets = mq.buckets;
      const bad  = buckets.map(b => mq.matrix[b] ? mq.matrix[b].Bad  : 0);
      const ok   = buckets.map(b => mq.matrix[b] ? mq.matrix[b].OK   : 0);
      const good = buckets.map(b => mq.matrix[b] ? mq.matrix[b].Good : 0);
      const ns   = buckets.map(b => mq.matrix[b] ? mq.matrix[b].n    : 0);

      const bucketLabels = buckets.map((b, i) => `Q ${b}<br>(n=${ns[i]})`);

      Plotly.newPlot('chart-mood-quality', [
        {
          x: bucketLabels, y: good,
          type: 'bar', name: 'Good',
          marker: { color: THEME.green, opacity: 0.85 },
          hovertemplate: '%{x}<br>Good: %{y:.1f}%<extra></extra>',
        },
        {
          x: bucketLabels, y: ok,
          type: 'bar', name: 'OK',
          marker: { color: '#c8b89a', opacity: 0.75 },
          hovertemplate: '%{x}<br>OK: %{y:.1f}%<extra></extra>',
        },
        {
          x: bucketLabels, y: bad,
          type: 'bar', name: copy.badMorningMood,
          marker: { color: THEME.red, opacity: 0.85 },
          hovertemplate: '%{x}<br>Bad: %{y:.1f}%<extra></extra>',
        },
      ], {
        ...plotDefaults,
        barmode: 'stack',
        yaxis: { ...plotDefaults.yaxis, title: copy.morningMood, ticksuffix: '%', range: [0, 105] },
        xaxis: { ...plotDefaults.xaxis, title: copy.sleepQualityRange },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        margin: { t: 20, r: 20, b: 70, l: 60 },
      }, { responsive: true, displayModeBar: false });
    }

    // ── chart-regularity-monthly ─────────────────────────────────────────
    if (global.document.getElementById('chart-regularity-monthly') && extra2Data.monthly_regularity) {
      const mr = extra2Data.monthly_regularity;
      const months = Object.keys(mr).sort();
      const qVals   = months.map(m => mr[m].q);
      const regVals = months.map(m => mr[m].reg);

      // 3-month rolling average smoothing helper
      const roll3 = (arr: Array<number | null>) => arr.map((_, i) => {
        const sl = arr.slice(Math.max(0, i-1), i+2).filter(v => v != null);
        return sl.length ? sl.reduce((a, b) => a + b, 0) / sl.length : null;
      });
      const regSmooth = roll3(regVals);
      const qSmooth   = roll3(qVals);

      Plotly.newPlot('chart-regularity-monthly', [
        {
          x: months, y: regVals,
          type: 'scatter', mode: 'lines', name: copy.regularityRaw,
          line: { color: THEME.border, width: 1 },
          hovertemplate: copy.regularityRaw2,
          opacity: 0.4,
          showlegend: false,
        },
        {
          x: months, y: regSmooth,
          type: 'scatter', mode: 'lines', name: copy.scheduleRegularity3moAvg,
          line: { color: THEME.muted, width: 2.5 },
          hovertemplate: copy.regularityAvg,
        },
        {
          x: months, y: qSmooth,
          type: 'scatter', mode: 'lines', name: copy.sleepCycleQualityScore3moAvg,
          line: { color: THEME.accent, width: 2.5 },
          hovertemplate: copy.qualityAvg,
          yaxis: 'y2',
        },
      ], {
        ...plotDefaults,
        yaxis: { ...plotDefaults.yaxis, title: copy.scheduleRegularity3, range: [55, 100], ticksuffix: '%' },
        yaxis2: { title: copy.sleepQuality4, overlaying: 'y', side: 'right', range: [55, 100], gridcolor: 'transparent', ticksuffix: '%' },
        xaxis: { ...plotDefaults.xaxis, title: copy.month, type: 'date' },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        hovermode: 'x unified',
        margin: { t: 20, r: 80, b: 60, l: 60 },
        annotations: [
          { x: '2020-04', y: 93.2, yref: 'y', text: copy.lockdownPeak93, showarrow: true,
            arrowhead: 2, arrowcolor: THEME.muted, font: { color: THEME.muted, size: 10 },
            ax: 50, ay: -30, bgcolor: 'rgba(13,17,23,0.85)', bordercolor: THEME.muted, borderwidth: 1, borderpad: 4 },
          { x: '2022-11', y: 80.8, yref: 'y', text: copy.afterCOVID1stScheduleRegularityBeganDeclining, showarrow: true,
            arrowhead: 2, arrowcolor: THEME.red, font: { color: THEME.red, size: 10 },
            ax: -65, ay: -35, bgcolor: 'rgba(13,17,23,0.85)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4 },
        ],
      }, { responsive: true, displayModeBar: false });
    }
  };

})(window);
