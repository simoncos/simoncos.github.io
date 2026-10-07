import type { MoodSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderMoodSection(ctx: MoodSectionContext) {
    const { Plotly, THEME, plotDefaults, baseData } = ctx;
    if (!Plotly || !baseData || !baseData.mood_by_year) return;
    if (!global.document.getElementById('chart-mood')) return;

    const years = Object.keys(baseData.mood_by_year).sort();
    const moodTypes = ['Good', 'OK', 'Bad', 'Not set'] as const;
    const moodColors = [THEME.green, '#c8b89a', THEME.red, THEME.muted];
    const moodLabels = { Good: copy.good, OK: copy.oK, Bad: copy.bad3, 'Not set': copy.notSet };

    const traces = moodTypes.map((mood, i) => ({
      x: years,
      y: years.map(yr => {
        const total = Object.values(baseData.mood_by_year[yr]).reduce((a, b) => a + b, 0);
        return Math.round((baseData.mood_by_year[yr][mood] || 0) / total * 100);
      }),
      name: moodLabels[mood],
      type: 'bar',
      marker: { color: moodColors[i], opacity: 0.85 },
      hovertemplate: copy.label2(moodLabels[mood]),
      text: years.map(yr => {
        const total = Object.values(baseData.mood_by_year[yr]).reduce((a, b) => a + b, 0);
        const pct = Math.round((baseData.mood_by_year[yr][mood] || 0) / total * 100);
        return pct > 8 ? `${pct}%` : '';
      }),
      textposition: 'inside',
      textfont: { size: 10, color: '#0d1117' },
    }));

    const badLine = {
      x: years,
      y: years.map(yr => {
        const total = Object.values(baseData.mood_by_year[yr]).reduce((a, b) => a + b, 0);
        return Math.round((baseData.mood_by_year[yr]['Bad'] || 0) / total * 100);
      }),
      name: copy.badMoodTrend,
      type: 'scatter', mode: 'lines+markers',
      line: { color: '#ffffff', width: 2.5, shape: 'spline', dash: 'dot' },
      marker: { size: 7, color: '#ffffff', symbol: 'circle' },
      hovertemplate: copy.bad4,
      showlegend: true,
    };

    Plotly.newPlot('chart-mood', [...traces, badLine], {
      ...plotDefaults,
      barmode: 'stack',
      yaxis: { ...plotDefaults.yaxis, title: copy.ofNights2, ticksuffix: '%' },
      xaxis: { ...plotDefaults.xaxis, title: copy.year },
      showlegend: true,
      legend: (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.softLegend(THEME, { y: 1.05, orientation: 'h', bgcolor: 'rgba(22,27,34,0.8)' })
        : { x: 0.01, y: 1.05, orientation: 'h', bgcolor: 'rgba(22,27,34,0.8)', bordercolor: THEME.border, borderwidth: 1 },
      annotations: [
        { x: '2021', y: 55, text: copy.label2021JumpBad48, showarrow: true, arrowhead: 2,
          arrowcolor: '#ffffff', font: { color: '#ffffff', size: 10 }, ax: -55, ay: -25,
          bgcolor: 'rgba(13,17,23,0.85)', bordercolor: '#ffffff', borderwidth: 1, borderpad: 4 },
        { x: '2026', y: 60, text: copy.label2026Bad54DecadeHigh, showarrow: true, arrowhead: 2,
          arrowcolor: '#ffffff', font: { color: '#ffffff', size: 10 }, ax: -65, ay: -15,
          bgcolor: 'rgba(13,17,23,0.85)', bordercolor: '#ffffff', borderwidth: 1, borderpad: 4 },
      ],
    }, { responsive: true, displayModeBar: false });
  }

  root.renderMoodSection = renderMoodSection;
})(window);
