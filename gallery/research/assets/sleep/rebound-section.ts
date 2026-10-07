import type { ReboundSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  root.renderReboundSection = function(env: ReboundSectionContext) {
    const { Plotly, THEME, plotDefaults, data } = env;
    if (!data) return;

    // 1. Rebound Chart (Latency & Bedtime Shift)
    const containerRebound = document.getElementById('chart-rebound-effect');
    if (containerRebound && data.rebound_stats) {
      const stats = data.rebound_stats;

      const traceShift = {
        x: stats.map(d => d.label),
        y: stats.map(d => d.bedtime_shift_mins),
        name: copy.bedtimeDriftMin,
        type: 'bar',
        marker: {
          color: THEME.muted,
          opacity: 0.82
        },
        yaxis: 'y',
        text: stats.map(d => (d.bedtime_shift_mins > 0 ? '+' : '') + Math.round(d.bedtime_shift_mins) + 'm'),
        textposition: 'auto',
        hovertemplate: copy.bedtimeDriftMin2,
      };

      const traceLatency = {
        x: stats.map(d => d.label),
        y: stats.map(d => d.latency_mins),
        name: copy.sleepOnsetLatencyMin,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: THEME.accent2, width: 2, dash: 'dot' },
        marker: { size: 7, color: THEME.accent2 },
        yaxis: 'y2',
        hovertemplate: copy.sleepOnsetLatencyMin2,
      };

      const layoutRebound = {
        ...plotDefaults,
        barmode: 'group',
        xaxis: { ...plotDefaults.xaxis, title: copy.previousNightSleepDuration },
        yaxis: { ...plotDefaults.yaxis, title: copy.bedtimeDriftMin },
        yaxis2: {
          title: copy.sleepOnsetLatencyMin,
          overlaying: 'y',
          side: 'right',
          gridcolor: 'transparent',
          tickfont: { color: THEME.accent2 },
          titlefont: { color: THEME.accent2 },
          range: [0, 22]
        },
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)' },
        margin: { t: 20, r: 60, b: 60, l: 60 }
      };

      Plotly.newPlot(containerRebound, [traceShift, traceLatency], layoutRebound, {responsive: true, displayModeBar: false});
    }

    // 2. Streaks Chart
    const containerStreaks = document.getElementById('chart-rebound-streaks');
    if (containerStreaks && data.streak_stats) {
      const stats = data.streak_stats;

      const traceQual = {
        x: stats.map(d => d.label),
        y: stats.map(d => d.next_quality),
        name: copy.label3rdDaySleepQuality,
        type: 'bar',
        marker: {
          color: stats.map((_, i) => i < 2 ? THEME.red : (i === 2 ? THEME.border : THEME.green))
        },
        text: stats.map(d => d.next_quality.toFixed(1) + '%'),
        textposition: 'auto',
        hovertemplate: copy.label3rdDayQuality,
      };

      const layoutStreaks = {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: copy.twoConsecutiveNightsState },
        yaxis: { ...plotDefaults.yaxis, title: copy.label3rdDaySleepQuality2, range: [65, 95] },
        showlegend: false,
        margin: { t: 20, r: 20, b: 60, l: 60 }
      };

      Plotly.newPlot(containerStreaks, [traceQual], layoutStreaks, {responsive: true, displayModeBar: false});
    }
  };

})(window);
