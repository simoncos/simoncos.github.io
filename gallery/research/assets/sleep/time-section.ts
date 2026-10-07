import type { TimeSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderTimeSection(ctx: TimeSectionContext) {
    const { Plotly, THEME, plotDefaults, baseData, extraData, eventsData } = ctx;
    if (!Plotly) return;

    if (global.document.getElementById('chart-duration') && extraData && extraData.yearly) {
      const d = extraData.yearly;
      const years = Object.keys(d).sort().map(y => Number(y));
      const asleep = years.map(y => d[y].asleep);
      const late = years.map(y => d[y].late_pct);
      const short_ = years.map(y => d[y].short_pct);
      const regularity = years.map(y => d[y].regularity_mean || null);

      Plotly.newPlot('chart-duration', [
        {
          x: years, y: asleep,
          type: 'bar', name: copy.actualSleepSleepH,
          marker: { color: THEME.border, opacity: 0.75 },
          hovertemplate: '%{x}<br>sleep_h: %{y:.2f}h<extra></extra>',
        },
        {
          x: years, y: late,
          type: 'scatter', mode: 'lines+markers', name: copy.after1AM,
          line: { color: THEME.red, width: 2, dash: 'dot' },
          marker: { size: 6, color: THEME.red },
          yaxis: 'y2',
          hovertemplate: copy.after1AM2,
        },
        {
          x: years, y: short_,
          type: 'scatter', mode: 'lines+markers', name: copy.shortSleep6h,
          line: { color: THEME.accent3, width: 2, dash: 'dash' },
          marker: { size: 5, color: THEME.accent3 },
          yaxis: 'y2',
          hovertemplate: copy.shortSleep,
        },
        {
          x: years, y: regularity,
          type: 'scatter', mode: 'lines+markers', name: copy.scheduleRegularity,
          line: { color: THEME.muted, width: 2, dash: 'dot' },
          marker: { size: 6, color: THEME.muted },
          yaxis: 'y3',
          hovertemplate: copy.scheduleRegularity2,
        },
      ], {
        ...plotDefaults,
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepHHours, range: [5.5, 9] },
        yaxis2: { title: copy.label, overlaying: 'y', side: 'right', range: [0, 55], gridcolor: 'transparent', ticksuffix: '%' },
        yaxis3: { title: '', overlaying: 'y', side: 'right', position: 0.98, range: [70, 100], gridcolor: 'transparent', tickfont: { color: THEME.muted }, showticklabels: false },
        xaxis: { ...plotDefaults.xaxis, title: copy.year, type: 'linear', dtick: 1, range: [2015.5, 2026.5] },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        hovermode: 'x unified',
        annotations: [
          { x: 2020, y: 7.8, text: copy.lockdownPeak78h37Over8h, showarrow: true, arrowhead: 2,
            arrowcolor: THEME.green, font: { color: THEME.green, size: 10 }, ax: -70, ay: -30,
            bgcolor: 'rgba(13,17,23,0.85)', bordercolor: THEME.green, borderwidth: 1, borderpad: 4 },
          { x: 2024, y: 6.55, text: copy.label29OfNightsUnder6Hours, showarrow: true, arrowhead: 2,
            arrowcolor: THEME.red, font: { color: THEME.red, size: 10 }, ax: 55, ay: -25,
            bgcolor: 'rgba(13,17,23,0.85)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4 },
        ],
      }, { responsive: true, displayModeBar: false });
    }

    if (global.document.getElementById('chart-bedtime-heat') && baseData && baseData.bedtime_hist) {
      const years = Object.keys(baseData.bedtime_hist).sort();
      const hours = Array.from({ length: 13 }, (_, i) => i + 19);
      const hourLabels = (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.hourLabels(19, 31)
        : hours.map(h => `${String(h % 24).padStart(2, '0')}:00`);
      const z = years.map(yr => hours.map(h => baseData.bedtime_hist[yr][String(h)] || 0));

      // Median bedtime per year as scatter overlay
      const medianTrace = baseData.bedtime_median ? {
        x: years.map(yr => {
          const med = baseData.bedtime_median[yr];
          if (med == null) return null;
          // map decimal hour (19–31) to hourLabels index position
          const idx = med - 19;
          // Use the label string at nearest integer index for category axis
          return hourLabels[Math.min(Math.round(idx), hourLabels.length - 1)];
        }),
        y: years,
        type: 'scatter',
        mode: 'lines+markers',
        name: copy.annualBedtimeMedian,
        line: { color: '#f8d25c', width: 2, dash: 'dot' },
        marker: { color: '#f8d25c', size: 6, symbol: 'diamond' },
        hovertemplate: copy.median,
      } : null;

      const traces = [
        {
          z, x: hourLabels, y: years, type: 'heatmap',
          colorscale: [[0, THEME.bg], [0.15, '#1c2128'], [0.4, '#2d333b'], [0.7, '#545d68'], [1.0, '#adbac7']],
          showscale: true,
          colorbar: { title: copy.count2, thickness: 12, tickfont: { size: 10 } },
          hovertemplate: copy.nights,
        },
        ...(medianTrace ? [medianTrace] : []),
      ];

      Plotly.newPlot('chart-bedtime-heat', traces, {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: copy.bedtime, tickangle: -30, type: 'category' },
        yaxis: { ...plotDefaults.yaxis, title: copy.year, type: 'category', autorange: 'reversed' },
        legend: { x: 0.01, y: -0.18, orientation: 'h', bgcolor: 'rgba(22,27,34,0.8)', bordercolor: THEME.border, borderwidth: 1 },
        margin: { t: 20, r: 80, b: 70, l: 60 },
      }, { responsive: true, displayModeBar: false });
    }

    // Quality heatmap: same grid, z = avg quality per year × hour
    if (global.document.getElementById('chart-bedtime-quality') && baseData && baseData.bedtime_quality_hist) {
      const years = Object.keys(baseData.bedtime_quality_hist).sort();
      const hours = Array.from({ length: 13 }, (_, i) => i + 19);
      const hourLabels = (global.SleepEssayCharts && global.SleepEssayCharts.common)
        ? global.SleepEssayCharts.common.hourLabels(19, 31)
        : hours.map(h => `${String(h % 24).padStart(2, '0')}:00`);
      const zq = years.map(yr => hours.map(h => {
        const v = baseData.bedtime_quality_hist[yr] && baseData.bedtime_quality_hist[yr][String(h)];
        return v != null ? v : null;
      }));

      Plotly.newPlot('chart-bedtime-quality', [{
        z: zq, x: hourLabels, y: years, type: 'heatmap',
        colorscale: [
          [0,    '#7f1d1d'],  // deep red   — low quality (~55%)
          [0.25, '#b45309'],  // amber
          [0.5,  '#c8b89a'],  // warm wheat — mid quality
          [0.75, '#166534'],  // forest green
          [1.0,  '#4ade80'],  // bright green — high quality (~95%)
        ],
        zmin: 55, zmax: 95,
        showscale: true,
        colorbar: { title: copy.quality2, thickness: 12, tickfont: { size: 10 } },
        hovertemplate: copy.avgQuality,
      }], {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: copy.bedtime, tickangle: -30, type: 'category' },
        yaxis: { ...plotDefaults.yaxis, title: copy.year, type: 'category', autorange: 'reversed' },
        margin: { t: 20, r: 80, b: 70, l: 60 },
      }, { responsive: true, displayModeBar: false });
    }

    if (eventsData && eventsData.short_sleep && global.document.getElementById('chart-short-bins')) {
      const S = eventsData.short_sleep;
      try {
        Plotly.newPlot('chart-short-bins', [
          { x: S.bins.map(d => d.label), y: S.bins.map(d => d.pct), type: 'bar', name: copy.ofNights, marker: { color: THEME.border, opacity: 0.75 }, yaxis: 'y' },
          { x: S.bins.map(d => d.label), y: S.bins.map(d => d.mean_quality), type: 'scatter', mode: 'lines+markers+text', name: copy.avgSleepQuality2, text: S.bins.map(d => d.mean_quality + '%'), textposition: 'top center', line: { color: THEME.accent, width: 2.5 }, marker: { size: 7 }, yaxis: 'y2' }
        ], {
          ...plotDefaults,
          xaxis: { ...plotDefaults.xaxis, title: copy.totalTimeInBedHours, type: 'category' },
          yaxis: { ...plotDefaults.yaxis, title: copy.ofNights, ticksuffix: '%', range: [0, 50] },
          yaxis2: { title: copy.avgSleepQuality2, ticksuffix: '%', overlaying: 'y', side: 'right', range: [50, 95], gridcolor: 'transparent' },
          hovermode: 'x unified',
          legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
          margin: { t: 10, r: 60, b: 45, l: 55 }
        }, { responsive: true, displayModeBar: false });

        const years = Object.keys(S.yearly_under7_pct).sort();
        const yearNums = years.map(y => Number(y));
        Plotly.newPlot('chart-short-yearly', [
          { x: yearNums, y: years.map(y => S.yearly_under7_pct[y]), type: 'bar', name: copy.label7h, marker: { color: THEME.border, opacity: 0.72 }, yaxis: 'y' },
          { x: yearNums, y: years.map(y => S.yearly_under7_quality[y]), type: 'scatter', mode: 'lines+markers', name: copy.shortNightQuality, line: { color: THEME.accent, width: 2.5 }, marker: { size: 6 }, yaxis: 'y2' },
          { x: yearNums, y: years.map(y => S.yearly_baseline_quality[y]), type: 'scatter', mode: 'lines', name: copy.annualBaseline, line: { color: THEME.muted, width: 1.5, dash: 'dot' }, yaxis: 'y2' }
        ], {
          ...plotDefaults,
          xaxis: { ...plotDefaults.xaxis, title: '', type: 'linear', tickmode: 'array', tickvals: yearNums, ticktext: years, range: [2015.5, 2026.5] },
          yaxis: { ...plotDefaults.yaxis, title: copy.label7h, ticksuffix: '%', range: [0, 30] },
          yaxis2: { title: copy.sleepQuality2, ticksuffix: '%', overlaying: 'y', side: 'right', range: [55, 100], gridcolor: 'transparent' },
          ...(global.SleepEssayCharts && global.SleepEssayCharts.common
            ? global.SleepEssayCharts.common.xUnifiedLayout({
                legend: global.SleepEssayCharts.common.softLegend(THEME),
              })
            : {
                hovermode: 'x unified',
                legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
              }),
          margin: { t: 10, r: 60, b: 45, l: 55 },
          shapes: [{ type: 'line', x0: 2024, x1: 2024, y0: 0, y1: 1, xref: 'x', yref: 'paper', line: { color: THEME.border, width: 1, dash: 'dash' } }],
          annotations: [{ x: 2024, y: 1.02, xref: 'x', yref: 'paper', showarrow: false, text: copy.shortNightsIncreasingAfter2024, font: { size: 10, color: THEME.muted } }]
        }, { responsive: true, displayModeBar: false });
      } catch (e) {
        console.error('short-sleep patch failed', e);
      }
    }
  }

  root.renderTimeSection = renderTimeSection;
})(window);
