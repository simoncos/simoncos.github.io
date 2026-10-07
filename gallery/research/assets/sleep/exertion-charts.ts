import type { ExertionChartsContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(window.SleepEssayCharts ??= {}).renderExertionCharts = function(env: ExertionChartsContext) {
  const { Plotly, THEME, plotDefaults, data } = env;
  if (!data) return;

  // ── Chart 1: Exertion buckets — Quality bars + BD line ──
  const container = document.getElementById('chart-exertion-fatigue');
  if (container && data.exertion_buckets) {
    const buckets = data.exertion_buckets;

    const traceQuality = {
      x: buckets.map(b => b.label),
      y: buckets.map(b => b.quality),
      name: copy.sleepQuality,
      type: 'bar',
      marker: {
        // First bucket (sedentary/targeted) is positive — accent blue; others neutral
        color: buckets.map((_, i) => i === 0 ? THEME.green : THEME.border),
        opacity: 0.85,
      },
      yaxis: 'y',
      text: buckets.map(b => b.quality.toFixed(1) + '%'),
      textposition: 'outside',
      hovertemplate: copy.sleepQuality3,
    };

    const traceBD = {
      x: buckets.map(b => b.label),
      y: buckets.map(b => b.bd),
      name: copy.breathingInterruptionTimesHr,
      type: 'scatter',
      mode: 'lines+markers',
      // BD is a physiological signal — accent3 (orange) per body palette
      line: { color: THEME.accent3, width: 3 },
      marker: { size: 8, color: THEME.accent3 },
      yaxis: 'y2',
      hovertemplate: copy.breathingInterruptionTimesHr2,
    };

    Plotly.newPlot(container, [traceQuality, traceBD], {
      ...plotDefaults,
      barmode: 'group',
      xaxis: { ...plotDefaults.xaxis, title: '' },
      yaxis: {
        ...plotDefaults.yaxis,
        title: copy.sleepQuality,
        range: [75, 92],
        ticksuffix: '%',
      },
      yaxis2: {
        title: copy.breathingInterruptionTimesHr,
        overlaying: 'y',
        side: 'right',
        range: [0, 10],
        gridcolor: 'transparent',
        tickfont: { color: THEME.accent3 },
      },
      showlegend: true,
      legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
      margin: { t: 20, r: 70, b: 50, l: 60 },
      hovermode: 'x unified',
    }, { responsive: true, displayModeBar: false });
  }

  // ── Chart 2: Exertion type — quality delta bars + BD delta line ──
  const containerType = document.getElementById('chart-exertion-type');
  if (!containerType) return;

  const categories = [
    copy.targetedCardioSwimmingRingFit,
    copy.highIntensityHiking10kExercise,
    copy.travelFatigue10kTravel,
    copy.otherHighStep10kNoTag,
  ];
  // Strict location-isolated baseline-adjusted deltas
  const qData = [2.7, -2.9, -11.2, 0.3];
  const bdData = [-3.8, 0.7, 2.3, 0.6];

  const traceTypeQuality = {
    x: categories,
    y: qData,
    name: copy.sleepQualityDelta2,
    type: 'bar',
    marker: {
      // positive = accent, negative = red, near-zero = border
      color: qData.map(v => v > 1 ? THEME.green : v < -1 ? THEME.red : THEME.border),
      opacity: 0.85,
    },
    text: qData.map(v => (v > 0 ? '+' : '') + v.toFixed(1) + '%'),
    textposition: 'outside',
    yaxis: 'y',
    hovertemplate: copy.qualityDelta2,
  };

  const traceTypeBD = {
    x: categories,
    y: bdData,
    name: copy.breathingInterruptionDeltaTimesHr,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: THEME.accent3, width: 3 },
    marker: { size: 8, color: THEME.accent3 },
    yaxis: 'y2',
    hovertemplate: copy.bDDeltaTimesHr,
  };

  Plotly.newPlot(containerType, [traceTypeQuality, traceTypeBD], {
    ...plotDefaults,
    xaxis: { ...plotDefaults.xaxis, title: '' },
    yaxis: {
      ...plotDefaults.yaxis,
      title: copy.qualityDeltaVsLocalBaseline,
      range: [-15, 6],
      ticksuffix: '%',
      zeroline: true,
      zerolinecolor: THEME.muted,
      zerolinewidth: 2,
    },
    yaxis2: {
      title: copy.breathingInterruptionDeltaTimesHr,
      overlaying: 'y',
      side: 'right',
      range: [-5, 4],
      gridcolor: 'transparent',
      tickfont: { color: THEME.accent3 },
      zeroline: false,
    },
    showlegend: true,
    legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
    margin: { t: 20, r: 70, b: 70, l: 70 },
    hovermode: 'x unified',
  }, { responsive: true, displayModeBar: false });
};
