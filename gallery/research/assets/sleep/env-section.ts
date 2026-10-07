import type { EnvSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderEnvSection(ctx: EnvSectionContext) {
    const { Plotly, THEME, plotDefaults, weatherData, envData } = ctx;
    if (!Plotly) return;

    // --- Weather Charts ---
    if (weatherData && global.document.getElementById('chart-weather-temp')) {
      const td = weatherData.temp_impact;
      Plotly.newPlot('chart-weather-temp', [
        { x: td.map(d => remapEnvironmentLabel(d.label)), y: td.map(d => d.snore), type: 'bar', name: copy.snoringMin, marker: { color: '#ffea00', opacity: 0.85 }, text: td.map(d => d.snore + ' min'), textposition: 'outside', yaxis: 'y' },
        { x: td.map(d => remapEnvironmentLabel(d.label)), y: td.map(d => d.bd), type: 'scatter', mode: 'lines+markers', name: copy.breathingInterruptionTimesHr, line: { color: THEME.accent3, width: 2.5 }, marker: { size: 8 }, yaxis: 'y2' }
      ], {
        ...plotDefaults, xaxis: { ...plotDefaults.xaxis, title: '' }, yaxis: { ...plotDefaults.yaxis, title: copy.snoringMin, range: [0, 45] }, yaxis2: { title: copy.breathingInterruption, overlaying: 'y', side: 'right', range: [0, 9], gridcolor: 'transparent' }, margin: { t: 20, r: 60, b: 40, l: 60 }, legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
      }, { responsive: true, displayModeBar: false });
    }

    if (weatherData && global.document.getElementById('chart-weather-rain')) {
      const rd = weatherData.rain_impact;
      Plotly.newPlot('chart-weather-rain', [
        { x: rd.map(d => remapEnvironmentLabel(d.label)), y: rd.map(d => d.snore), type: 'bar', name: copy.snoringMin, marker: { color: '#ffea00', opacity: 0.85 }, text: rd.map(d => d.snore + ' min'), textposition: 'outside', yaxis: 'y' },
        { x: rd.map(d => remapEnvironmentLabel(d.label)), y: rd.map(d => d.bad_pct), type: 'scatter', mode: 'lines+markers', name: copy.badMood, line: { color: THEME.red, width: 2.5 }, marker: { size: 8 }, yaxis: 'y2' }
      ], {
        ...plotDefaults, xaxis: { ...plotDefaults.xaxis, title: '' }, yaxis: { ...plotDefaults.yaxis, title: copy.snoringMin, range: [0, 40] }, yaxis2: { title: copy.bad2, overlaying: 'y', side: 'right', range: [0, 60], ticksuffix: '%', gridcolor: 'transparent' }, margin: { t: 20, r: 60, b: 40, l: 60 }, legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
      }, { responsive: true, displayModeBar: false });
    }

    // --- Location/Phase Chart ---
    if (envData && global.document.getElementById('chart-env-location')) {
      const ld = envData.locations;
      const dateRanges = ld.map(d => d.date_range);
      Plotly.newPlot('chart-env-location', [
        {
          x: ld.map(d => d.phase),
          y: ld.map(d => d.noise_tag_pct),
          customdata: dateRanges,
          type: 'bar',
          name: copy.subjectivelyNoisy,
          marker: { color: THEME.border, opacity: 0.75 },
          yaxis: 'y',
          hovertemplate: '<b>%{x}</b><br>%{customdata}<br>Noisy: %{y:.1f}%<extra></extra>'
        },
        {
          x: ld.map(d => d.phase),
          y: ld.map(d => d.plug_pct),
          customdata: dateRanges,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.earplugUseNoise,
          line: { color: THEME.muted, width: 2.5, dash: 'dot' },
          marker: { size: 7 },
          yaxis: 'y',
          hovertemplate: copy.earplugs
        },
        {
          x: ld.map(d => d.phase),
          y: ld.map(d => d.quality),
          customdata: dateRanges,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.avgSleepQuality,
          line: { color: THEME.accent, width: 2.5 },
          marker: { size: 7 },
          yaxis: 'y2',
          hovertemplate: copy.quality3
        },
        {
          x: ld.map(d => d.phase),
          y: ld.map(d => d.asleep_h),
          customdata: dateRanges,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.sleepHEffectiveSleep,
          line: { color: THEME.accent2, width: 2.5, dash: 'dot' },
          marker: { size: 7 },
          yaxis: 'y3',
          hovertemplate: '<b>%{x}</b><br>%{customdata}<br>sleep_h: %{y:.2f}h<extra></extra>'
        }
      ], {
        ...plotDefaults,
        barmode: 'group',
        xaxis: { ...plotDefaults.xaxis, title: '', tickangle: -25 },
        yaxis: { ...plotDefaults.yaxis, title: copy.frequency2, range: [0, 65], ticksuffix: '%' },
        yaxis2: { title: '', overlaying: 'y', side: 'right', range: [70, 95], gridcolor: 'transparent', tickfont: {color: THEME.accent}, showticklabels: false },
        yaxis3: { title: '', overlaying: 'y', side: 'right', position: 0.98, range: [5, 9], gridcolor: 'transparent', tickfont: { color: THEME.accent2 }, showticklabels: false },
        margin: { t: (english ? 80 : 40), r: 50, b: 80, l: 60 },
        legend: { x: 0.01, y: (english ? 1.22 : 1.15), orientation: 'h', bgcolor: 'rgba(22,27,34,0.8)', bordercolor: THEME.border, borderwidth: 1 },
        annotations: [
          {
            x: 'HK · Wan Chai',
            y: 57.6,
            yref: 'y',
            text: copy.startedHighFrequencyEarplugUseNoise,
            showarrow: true,
            arrowhead: 2,
            ax: -20,
            ay: -40,
            font: { color: '#e6edf3', size: 11 },
            arrowcolor: THEME.muted,
            bgcolor: THEME.surface,
            bordercolor: THEME.border,
            borderwidth: 1,
            borderpad: 4
          }
        ]
      }, { responsive: true, displayModeBar: false });
    }

    // --- Noise/Earplug Chart ---
    if (envData && global.document.getElementById('chart-env-noise')) {
      const nd = envData.noise_impact;
      Plotly.newPlot('chart-env-noise', [
        {
          x: nd.map(d => remapEnvironmentLabel(d.label)),
          y: nd.map(d => d.plug_pct),
          type: 'bar',
          name: copy.earplugUsage,
          marker: { color: THEME.muted, opacity: 0.8 },
          text: nd.map(d => d.plug_pct + '%'),
          textposition: 'auto',
          yaxis: 'y'
        }
      ], {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: '' },
        yaxis: { ...plotDefaults.yaxis, title: copy.earplugUsage2, range: [0, 80], ticksuffix: '%' },
        margin: { t: 20, r: 60, b: 40, l: 60 },
        legend: { x: 0.01, y: 1.15, orientation: 'h', bgcolor: 'rgba(22,27,34,0.8)', bordercolor: THEME.border, borderwidth: 1 },
      }, { responsive: true, displayModeBar: false });
    }

  }

  root.renderEnvSection = renderEnvSection;
})(window);
