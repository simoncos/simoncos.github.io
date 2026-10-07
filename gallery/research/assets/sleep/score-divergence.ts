import type { ScoreDivergenceContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderScoreDivergence(ctx: ScoreDivergenceContext) {
    const { Plotly, scoreData, THEME, plotDefaults } = ctx;
    if (!Plotly || !scoreData || !scoreData.monthly_cmp) return;
    if (!global.document.getElementById('chart-diverge')) return;

    const months = Object.keys(scoreData.monthly_cmp).sort();
    const validMonths = months.filter(m => scoreData.monthly_cmp[m].quality !== null);
    const validMonthsFmt = validMonths.map(m => m + '-01');
    const scVals = validMonths.map(m => scoreData.monthly_cmp[m].quality);
    const moodVals = validMonths.map(m => scoreData.monthly_cmp[m].mood_adjusted);
    const adjVals = validMonths.map(m => scoreData.monthly_cmp[m].adjusted);
    const asleepVals = validMonths.map(m => scoreData.monthly_cmp[m].asleep_h ?? null);

    const common = global.SleepEssayCharts?.common;
    const smooth = common
      ? ((arr: Array<number | null>) => common.rollingAverage(arr, 2))
      : ((arr: Array<number | null>) => arr.map((v, i) => {
          const s = arr.slice(Math.max(0, i - 2), i + 3).filter(x => x !== null);
          return s.length ? s.reduce((a, b) => a + b, 0) / s.length : v;
        }));

    const scSmooth = smooth(scVals);
    const adjSmooth = smooth(adjVals);

    // Shaded penalty gap: fill between raw score and fully-adjusted score
    // Only where adjusted is available (from 2022-12)
    const gapMonths = validMonthsFmt.filter((_, i) => adjVals[i] !== null);
    const gapTop    = scSmooth.filter((_, i) => adjVals[i] !== null);
    const gapBot    = adjSmooth.filter((_, i) => adjVals[i] !== null);

    Plotly.newPlot('chart-diverge', [
      // Shaded penalty area (fill between raw top and adjusted bottom)
      {
        x: [...gapMonths, ...gapMonths.slice().reverse()],
        y: [...gapTop, ...gapBot.slice().reverse()],
        fill: 'toself',
        fillcolor: 'rgba(88,166,255,0.12)',
        line: { color: 'transparent' },
        type: 'scatter',
        mode: 'none',
        name: copy.penaltyMagnitude,
        showlegend: true,
        hoverinfo: 'skip',
      },
      // Raw score
      {
        x: validMonthsFmt, y: scSmooth,
        type: 'scatter', mode: 'lines',
        name: copy.sleepCycleRawScore,
        line: { color: THEME.accent, width: 2.5, shape: 'spline' },
        hovertemplate: copy.rawScore,
      },
      // Mood-adjusted
      {
        x: validMonthsFmt, y: smooth(moodVals),
        type: 'scatter', mode: 'lines',
        name: copy.moodAdjustedScore,
        line: { color: THEME.muted, width: 1.5, shape: 'spline', dash: 'dash' },
        hovertemplate: copy.moodAdjustedScore2,
      },
      // Fully adjusted
      {
        x: validMonthsFmt, y: adjSmooth,
        type: 'scatter', mode: 'lines',
        name: copy.fullyAdjustedScore,
        line: { color: THEME.text, width: 2.5, shape: 'spline' },
        hovertemplate: copy.fullyAdjustedScore2,
        connectgaps: false,
      },
      // Asleep hours — right axis
      {
        x: validMonthsFmt, y: smooth(asleepVals),
        type: 'scatter', mode: 'lines',
        name: copy.sleepHEffectiveSleep,
        line: { color: THEME.accent2, width: 1.8, shape: 'spline', dash: 'dot' },
        yaxis: 'y2',
        hovertemplate: '%{x}<br>sleep_h: %{y:.2f}h<extra></extra>',
        opacity: 0.85,
      },
    ], {
      ...plotDefaults,
      yaxis: { ...plotDefaults.yaxis, title: copy.score0100, range: [20, 105] },
      yaxis2: {
        title: 'sleep_h (h)',
        overlaying: 'y', side: 'right',
        range: [4.5, 9.5],
        gridcolor: 'transparent',
        tickfont: { color: THEME.accent2 },
        titlefont: { color: (english ? THEME.green : THEME.accent4) },
      },
      xaxis: { ...plotDefaults.xaxis, title: '', type: 'date' },
      showlegend: true,
      legend: (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.softLegend(THEME, { y: 0.05 })
        : { x: 0.01, y: 0.05, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
      hovermode: 'x unified',
      margin: { t: 40, r: 60, b: 40, l: 60 },
      annotations: [
        { x: '2020-03-01', y: 1.02, yref: 'paper', xanchor: 'left', showarrow: false,
          text: copy.influenzaB, font: { color: THEME.accent3, size: 9 } },
        { x: '2022-12-01', y: 1.02, yref: 'paper', xanchor: 'left', showarrow: false,
          text: copy.cOVID1st, font: { color: THEME.red, size: 9 } },
        { x: '2023-01-01', y: 0.92, yref: 'paper', xanchor: 'left', showarrow: false,
          text: copy.gapWidening, font: { color: THEME.accent3, size: 9 } },
        { x: '2024-08-01', y: 1.02, yref: 'paper', xanchor: 'right', showarrow: false,
          text: copy.cOVID2nd, font: { color: THEME.red, size: 9 } },
        { x: '2024-09-01', y: 0.92, yref: 'paper', xanchor: 'right', showarrow: false,
          text: copy.influenzaA, font: { color: THEME.accent3, size: 9 } },
      ],
      shapes: [
        { type: 'line', xref: 'x', x0: '2020-03-01', x1: '2020-03-01', y0: 0, y1: 1, yref: 'paper',
          line: { color: THEME.accent3, width: 1, dash: 'dot' } },
        { type: 'line', xref: 'x', x0: '2022-12-01', x1: '2022-12-01', y0: 0, y1: 1, yref: 'paper',
          line: { color: THEME.red, width: 1, dash: 'dot' } },
        { type: 'line', xref: 'x', x0: '2024-08-01', x1: '2024-08-01', y0: 0, y1: 1, yref: 'paper',
          line: { color: THEME.red, width: 1, dash: 'dot' } },
        { type: 'line', xref: 'x', x0: '2024-09-01', x1: '2024-09-01', y0: 0, y1: 1, yref: 'paper',
          line: { color: THEME.accent3, width: 1, dash: 'dot' } },
      ],
    }, { responsive: true, displayModeBar: false });
  }

  root.renderScoreDivergence = renderScoreDivergence;
})(window);
