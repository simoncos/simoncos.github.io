import type { TravelSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  root.renderTravelSection = function(ctx: TravelSectionContext) {
    const { Plotly, THEME, plotDefaults, travelData } = ctx;
    if (!travelData) return;

    const baseline = travelData.overview.baseline_quality_mean;

    // ── Chart 1: 旅行夜晚的高频伤害因素 ──────────────────────────────
    const containerDamage = document.getElementById('chart-travel-damage');
    if (containerDamage && travelData.damage_factors) {
      const factors = [...travelData.damage_factors].reverse(); // 从小到大，让最大在顶部

      const traceTravel = {
        x: factors.map(d => d.travel_pct),
        y: factors.map(d => d.tag),
        name: copy.travelNights,
        type: 'bar',
        orientation: 'h',
        marker: { color: THEME.bad || '#e05252', opacity: 0.85 },
        text: factors.map(d => d.travel_pct != null ? d.travel_pct.toFixed(1) + '%' : ''),
        textposition: 'outside',
        hovertemplate: copy.travelNightRate,
      };

      const traceBaseline = {
        x: factors.map(d => d.baseline_pct),
        y: factors.map(d => d.tag),
        name: 'Baseline',
        type: 'bar',
        orientation: 'h',
        marker: { color: THEME.muted || '#666', opacity: 0.6 },
        text: factors.map(d => d.baseline_pct != null ? d.baseline_pct.toFixed(1) + '%' : ''),
        textposition: 'outside',
        hovertemplate: copy.baselineRate,
      };

      const layoutDamage = {
        ...plotDefaults,
        barmode: 'group',
        xaxis: { ...plotDefaults.xaxis, title: copy.occurrenceRate, ticksuffix: '%' },
        yaxis: { ...plotDefaults.yaxis, title: '' },
        legend: { x: 0.6, y: 0.05, bgcolor: 'rgba(22,27,34,0.85)' },
        margin: { t: 20, r: 80, b: 60, l: 120 },
      };

      Plotly.newPlot(containerDamage, [traceTravel, traceBaseline], layoutDamage, { responsive: true, displayModeBar: false });
    }

    // ── Chart 2: 旅行后的恢复曲线 ──────────────────────────────
    const containerRecovery = document.getElementById('chart-travel-recovery');
    if (containerRecovery && travelData.recovery_by_length) {
      const shortData = travelData.recovery_by_length.short.filter(d => d.offset !== 99);
      const longData = travelData.recovery_by_length.long.filter(d => d.offset !== 99);
      const labels = shortData.map(d => d.label);

      const traceShort = {
        x: labels,
        y: shortData.map(d => d.quality),
        name: copy.shortTrip12Nights,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: THEME.accent || '#4a9eff', width: 2.5 },
        marker: { size: 7, color: THEME.accent || '#4a9eff' },
        hovertemplate: copy.quality4,
      };

      const traceLong = {
        x: labels,
        y: longData.map(d => d.quality),
        name: copy.longTrip3Nights,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: THEME.accent2 || '#f5a623', width: 2.5 },
        marker: { size: 7, color: THEME.accent2 || '#f5a623' },
        hovertemplate: copy.quality4,
      };

      const traceBaselineRecovery = {
        x: labels,
        y: labels.map(() => baseline),
        name: 'Baseline',
        type: 'scatter',
        mode: 'lines',
        line: { color: THEME.muted || '#666', width: 1.5, dash: 'dash' },
        hovertemplate: 'Baseline: %{y:.1f}%<extra></extra>',
      };

      // Find and annotate the peak
      const allVals = [...shortData.map(d => d.quality), ...longData.map(d => d.quality)].filter(v => v != null);
      const peakVal = Math.max(...allVals);
      const peakIdx = shortData.findIndex(d => d.quality === peakVal) !== -1
        ? shortData.findIndex(d => d.quality === peakVal)
        : longData.findIndex(d => d.quality === peakVal);
      const peakLabel = labels[peakIdx] || '';

      const layoutRecovery = {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: '' },
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepQuality, range: [60, 95] },
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)' },
        margin: { t: 30, r: 20, b: 60, l: 60 },
        annotations: [{
          x: peakLabel,
          y: peakVal,
          text: copy.homecomingRebound,
          showarrow: true,
          arrowhead: 2,
          arrowcolor: THEME.green || '#4caf50',
          font: { color: THEME.green || '#4caf50', size: 11 },
          ax: 0,
          ay: -30,
        }],
      };

      Plotly.newPlot(containerRecovery, [traceShort, traceLong, traceBaselineRecovery], layoutRecovery, { responsive: true, displayModeBar: false });
    }

    // ── Chart 3: 旅行长度与睡眠质量 ──────────────────────────────
    const containerLength = document.getElementById('chart-travel-length');
    if (containerLength && travelData.length_effect) {
      const le = travelData.length_effect.filter(d => d.n > 0);

      const barColors = le.map(d => {
        if (d.quality == null) return THEME.muted || '#666';
        if (d.quality >= baseline - 3) return THEME.green || '#4caf50';
        if (d.quality >= baseline - 8) return THEME.accent2 || '#f5a623';
        return THEME.bad || '#e05252';
      });

      const traceLength = {
        x: le.map(d => d.label),
        y: le.map(d => d.quality),
        type: 'bar',
        marker: { color: barColors, opacity: 0.85 },
        text: le.map(d => d.quality != null ? d.quality.toFixed(1) + '%' : ''),
        textposition: 'outside',
        customdata: le.map(d => d.n),
        hovertemplate: copy.qualityN,
      };

      const layoutLength = {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: copy.tripLength },
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepQuality, range: [60, 92] },
        showlegend: false,
        margin: { t: 30, r: 20, b: 60, l: 60 },
        shapes: [{
          type: 'line',
          x0: -0.5,
          x1: le.length - 0.5,
          y0: baseline,
          y1: baseline,
          line: { color: THEME.muted || '#666', width: 1.5, dash: 'dot' },
        }],
        annotations: [{
          x: le.length - 1,
          y: baseline,
          text: 'Baseline',
          showarrow: false,
          font: { color: THEME.muted || '#999', size: 10 },
          xanchor: 'right',
          yanchor: 'bottom',
        }],
      };

      Plotly.newPlot(containerLength, [traceLength], layoutLength, { responsive: true, displayModeBar: false });
    }
  };

})(window);
