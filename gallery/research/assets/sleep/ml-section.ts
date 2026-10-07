import type { MlSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  const FEATURE_LABELS = {
    bedtime_offset: copy.lateBedtime,
    break: copy.nightInterruption,
    bedtime_offset_x_tired: copy.lateBedtimeTired,
    tea_coffee: copy.teaCoffee2,
    holiday_night: copy.noAlarmNextDay,
    steps: copy.steps,
    quality_roll7_std: copy.recentVolatility,
    tag_count: copy.tagCount,
    after_0000: copy.afterMidnight2,
    quality_roll7: copy.recent7DayQuality,
    bedtime_bin: copy.bedtimeBucket,
    in_bed_lag1: copy.yesterdayInBedTime,
  };

  const SCENARIO_LABELS = {
    'bedtime 2h earlier': copy.bedtime2hEarlier,
    'bedtime 1h earlier': copy.bedtime1hEarlier,
    'holiday_night on vs off': copy.noAlarmVsAlarm,
    'massage on vs off': copy.massage2,
    'shower on vs off': copy.shower3,
    'tea_coffee on vs off': copy.teaCoffee2,
    'after_0000 on vs off': copy.afterMidnight2,
    'break on vs off': copy.nightInterruption,
    'bedtime 1h later': copy.bedtime1hLater,
  };

  const TAG_LABELS = {
    after_0000: copy.afterMidnight2,
    tired: copy.tired2,
    tea_coffee: copy.teaCoffee2,
    night_gaming: copy.nightGaming2,
  };

  function labelFor(map: Record<string, string>, key: string) {
    return map[key] || key;
  }

  function formatSigned(value: number, decimals: number, suffix: string) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}${suffix || ''}`;
  }

  function renderTopFeatures(ctx: MlSectionContext) {
    const { Plotly, THEME, plotDefaults, mlData } = ctx;
    if (!Plotly || !mlData || !global.document.getElementById('chart-ml-features')) return;

    const quality = mlData.top_features.quality || [];
    const mood = mlData.top_features.mood || [];
    const union: string[] = [];
    const seen = new Set();
    [...quality, ...mood].forEach(item => {
      if (!seen.has(item.feature)) {
        seen.add(item.feature);
        union.push(item.feature);
      }
    });

    const qualityMap = Object.fromEntries(quality.map(item => [item.feature, item.relative]));
    const moodMap = Object.fromEntries(mood.map(item => [item.feature, item.relative]));

    const rows = union.map(feature => ({
      feature,
      label: labelFor(FEATURE_LABELS, feature),
      quality: qualityMap[feature] || 0,
      mood: moodMap[feature] || 0,
      max: Math.max(qualityMap[feature] || 0, moodMap[feature] || 0),
    })).sort((a, b) => a.max - b.max);

    Plotly.newPlot('chart-ml-features', [
      {
        type: 'bar',
        orientation: 'h',
        y: rows.map(r => r.label),
        x: rows.map(r => r.quality),
        name: copy.sleepQuality5,
        marker: { color: THEME.accent, opacity: 0.9 },
        text: rows.map(r => r.quality > 0 ? `${r.quality.toFixed(0)}` : ''),
        textposition: 'outside',
        hovertemplate: copy.sleepQuality6,
      },
      {
        type: 'bar',
        orientation: 'h',
        y: rows.map(r => r.label),
        x: rows.map(r => r.mood),
        name: copy.wakeUpMood,
        marker: { color: THEME.accent2, opacity: 0.9 },
        text: rows.map(r => r.mood > 0 ? `${r.mood.toFixed(0)}` : ''),
        textposition: 'outside',
        hovertemplate: copy.wakeUpMood2,
      },
    ], {
      ...plotDefaults,
      barmode: 'group',
      margin: { t: 30, r: 40, b: 50, l: 170 },
      xaxis: { ...plotDefaults.xaxis, title: copy.relativeWeightTopFactor100, range: [0, 112] },
      yaxis: { ...plotDefaults.yaxis, automargin: true },
      legend: (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.softLegend(THEME, { y: 1.08, orientation: 'h' })
        : { x: 0.01, y: 1.08, orientation: 'h', bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
    }, { responsive: true, displayModeBar: false });
  }

  function renderCounterfactualChart(ctx: MlSectionContext, chartId: string, rows: Array<{scenario: string; delta: number}>, axisTitle: string, suffix: string, decimals: number) {
    const { Plotly, THEME, plotDefaults } = ctx;
    const target = global.document.getElementById(chartId);
    if (!Plotly || !target || !rows.length) return;

    const sorted = rows.slice().sort((a, b) => a.delta - b.delta);
    const labels = sorted.map(r => labelFor(SCENARIO_LABELS, r.scenario));
    const low = Math.min(0, ...sorted.map(r => r.delta));
    const high = Math.max(0, ...sorted.map(r => r.delta));
    const padding = (high - low || 1) * 0.3;
    // Give labels their own line above each bar, leaving the full card width
    // for signed values instead of a fixed 170px label margin on phones.
    target.style.height = `${sorted.length * 54 + 50}px`;
    const caption = global.document.createElement('p');
    caption.className = 'chart-axis-caption';
    caption.textContent = axisTitle;
    target.after(caption);
    Plotly.newPlot(chartId, [{
      type: 'bar',
      orientation: 'h',
      width: 0.32,
      y: sorted.map((_, i) => i),
      x: sorted.map(r => r.delta),
      customdata: labels,
      marker: {
        color: sorted.map(r => r.delta >= 0 ? THEME.green : THEME.red),
        opacity: 0.9,
      },
      text: sorted.map(r => formatSigned(r.delta, decimals, suffix)),
      textposition: 'outside',
      cliponaxis: false,
      hovertemplate: '%{customdata}<br>%{x:.2f}' + suffix + '<extra></extra>',
    }], {
      ...plotDefaults,
      margin: { t: 16, r: 12, b: 30, l: 12 },
      xaxis: { ...plotDefaults.xaxis, title: '', range: [low - padding, high + padding], nticks: 5, zeroline: true, zerolinecolor: THEME.border },
      yaxis: { ...plotDefaults.yaxis, range: [-0.5, sorted.length - 0.2], showticklabels: false, showgrid: false, zeroline: false },
      annotations: labels.map((text, i) => ({
        text, x: 0, xref: 'paper', xanchor: 'left', y: i + 0.26,
        yanchor: 'bottom', showarrow: false, font: { size: 12, color: THEME.text },
      })),
      showlegend: false,
    }, { responsive: true, displayModeBar: false });
  }

  function renderConfounding(ctx: MlSectionContext) {
    const { Plotly, THEME, plotDefaults, mlData } = ctx;
    if (!Plotly || !mlData || !global.document.getElementById('chart-ml-confounding')) return;
    const rows = mlData.confounding || [];
    if (!rows.length) return;

    Plotly.newPlot('chart-ml-confounding', [
      {
        type: 'bar',
        x: rows.map(r => labelFor(TAG_LABELS, r.tag)),
        y: rows.map(r => r.naive_delta),
        name: copy.naiveAssociation,
        marker: { color: THEME.accent3, opacity: 0.9 },
        hovertemplate: copy.naivePp,
      },
      {
        type: 'bar',
        x: rows.map(r => labelFor(TAG_LABELS, r.tag)),
        y: rows.map(r => r.model_delta),
        name: copy.afterControlSHAP,
        marker: { color: THEME.accent, opacity: 0.9 },
        hovertemplate: copy.controlledPp,
      },
    ], {
      ...plotDefaults,
      barmode: 'group',
      margin: { t: 30, r: 20, b: 60, l: 60 },
      xaxis: { ...plotDefaults.xaxis, title: '' },
      yaxis: { ...plotDefaults.yaxis, title: copy.impactOnOKMoodProbabilityPp, zeroline: true, zerolinecolor: THEME.border },
      legend: (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.softLegend(THEME, { y: 1.08, orientation: 'h' })
        : { x: 0.01, y: 1.08, orientation: 'h', bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
    }, { responsive: true, displayModeBar: false });
  }

  function fillGapStats(mlData: MlSectionContext['mlData']) {
    const gap = mlData && mlData.quality_mood_gap;
    if (!gap) return;
    const mapping = {
      'ml-gap-share': `${gap.share_pct}%`,
      'ml-gap-tired': `${gap.tired_pct}%`,
      'ml-gap-after-midnight': `${gap.after_midnight_pct}%`,
      'ml-gap-bedtime': `${gap.mean_bedtime_offset_h}h`,
    };
    Object.entries(mapping).forEach(([id, value]) => {
      const el = global.document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function renderMlSection(ctx: MlSectionContext) {
    const { mlData } = ctx;
    if (!mlData) return;
    renderTopFeatures(ctx);
    renderCounterfactualChart(ctx, 'chart-ml-quality-cf', mlData.counterfactuals.quality || [], copy.predictedChangeInSleepQualityPoints, '', 2);
    renderCounterfactualChart(ctx, 'chart-ml-mood-cf', mlData.counterfactuals.mood || [], copy.predictedChangeInOKMoodProbabilityPp, 'pp', 1);
    fillGapStats(mlData);
  }

  root.renderMlSection = renderMlSection;
})(window);
