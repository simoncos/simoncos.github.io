import type { BodySectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function mean(values: Array<number | null | undefined>) {
    const xs = values.filter(v => v !== null && v !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  }

  function monthlyFromTimeline(timeline: BodySectionContext['summaryData']['timeline']) {
    const groups: Record<string, typeof timeline> = {};
    for (const row of timeline || []) {
      const ym = row.ym;
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(row);
    }
    const out: Record<string, {quality: number | null; snore_min: number | null; bd: number | null; cough: number | null}> = {};
    for (const ym of Object.keys(groups).sort()) {
      const rows = groups[ym];
      out[ym] = {
        quality: mean(rows.map(r => r.quality)),
        snore_min: mean(rows.map(r => r.snore_min)),
        bd: mean(rows.map(r => r.bd)),
        cough: mean(rows.map(r => r.cough)),
      };
    }
    return out;
  }

  const QUALITY_BAR = 'rgba(255, 255, 255, 0.05)';
  const HP_COLOR = '#fb7185';
  const COUGH_COLOR = '#e879f9';

  function renderBodySection(ctx: BodySectionContext) {
    const { Plotly, THEME, plotDefaults, summaryData, hpData, recoveryData, extraData } = ctx;
    if (!Plotly) return;

    const monthly = monthlyFromTimeline(summaryData && summaryData.timeline);

    // 06 / 主呼吸图：quality as background bars; respiratory signals as lines.
    if (global.document.getElementById('chart-snore')) {
      const months = Object.keys(monthly).filter(m => m >= '2019-01').sort();
      const qualMonths = months.filter(m => monthly[m].quality !== null);
      const qualVals = qualMonths.map(m => monthly[m].quality);
      const snoreMonths = months.filter(m => monthly[m].snore_min !== null);
      const snoreVals = snoreMonths.map(m => monthly[m].snore_min);
      const bdMonths = months.filter(m => monthly[m].bd !== null);
      const bdVals = bdMonths.map(m => monthly[m].bd);
      const coughMonths = months.filter(m => monthly[m].cough !== null);
      const coughVals = coughMonths.map(m => monthly[m].cough || 0);
      const coughMax = coughVals.length ? Math.max(...coughVals) : 0;
      const coughRangeMax = Math.max(1.5, Math.ceil(coughMax * 1.15 * 10) / 10);

      Plotly.newPlot('chart-snore', [
        {
          x: qualMonths,
          y: qualVals,
          type: 'bar',
          name: copy.sleepQuality,
          marker: { color: QUALITY_BAR },
          yaxis: 'y',
          hovertemplate: copy.sleepQuality3
        },
        {
          x: snoreMonths,
          y: snoreVals,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.snoringMin,
          line: { color: '#ffea00', width: 2.6, shape: 'spline' },
          marker: { size: 5, color: '#ffea00' },
          yaxis: 'y2',
          hovertemplate: copy.snoringMin2
        },
        {
          x: bdMonths,
          y: bdVals,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.breathingInterruptionTimesHr,
          line: { color: THEME.accent3, width: 2.5, shape: 'spline' },
          marker: { size: 5, color: THEME.accent3 },
          yaxis: 'y3',
          hovertemplate: copy.breathingInterruptionTimesHr3
        },
        {
          x: coughMonths,
          y: coughVals,
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.coughTimesHr,
          line: { color: COUGH_COLOR, width: 3.0, shape: 'spline' },
          marker: { size: 6, color: COUGH_COLOR },
          yaxis: 'y4',
          hovertemplate: copy.coughTimesHr2
        },
      ], {
        ...plotDefaults,
        barmode: 'overlay',
        xaxis: { ...plotDefaults.xaxis, title: '', type: 'category', tickangle: -45, nticks: 22 },
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepQuality, range: [55, 95], ticksuffix: '%' },
        yaxis2: { title: '', overlaying: 'y', side: 'right', range: [0, 130], gridcolor: 'transparent', tickfont: { color: THEME.gold }, showticklabels: false },
        yaxis3: { title: '', overlaying: 'y', side: 'right', position: 0.90, range: [0, 16], gridcolor: 'transparent', tickfont: { color: THEME.accent3 }, showticklabels: false },
        yaxis4: { title: '', overlaying: 'y', side: 'right', position: 0.97, range: [0, coughRangeMax], tickmode: 'array', tickvals: [0, 0.5, 1.0, 1.5].filter(v => v <= coughRangeMax), gridcolor: 'transparent', tickfont: { color: COUGH_COLOR }, showticklabels: false },
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.82)', bordercolor: THEME.border, borderwidth: 1 },
        hovermode: 'x unified',
        margin: { t: 20, r: 60, b: 75, l: 60 },
        annotations: [
          {
            x: '2020-02', y: 18.7, yref: 'y2', xref: 'x',
            text: copy.influenzaB202001,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: 65, ay: -15,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2023-01', y: 41.5, yref: 'y2', xref: 'x',
            text: copy.cOVID1st202212,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: -55, ay: 22,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2024-08', y: 60.4, yref: 'y2', xref: 'x',
            text: copy.cOVID2nd202408,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: -95, ay: -35,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2024-09', y: 39.0, yref: 'y2', xref: 'x',
            text: copy.influenzaA202409,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: 55, ay: -35,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
        ],
      }, { responsive: true, displayModeBar: false });
    }

    // 07b · 系统之间的接力：三系统年度趋势图（肠胃 / 呼吸 / 循环）
    if (global.document.getElementById('chart-hp-snore') && hpData) {
      const years = Object.keys(hpData).sort();
      const hp = years.map(y => hpData[y].hp_pct);
      const snore = years.map(y => hpData[y].snore_pct);
      const qualVals = years.map(y => (extraData && extraData.yearly && extraData.yearly[y]) ? (extraData.yearly[y].q ?? extraData.yearly[y].quality) : null);
      const hrVals = years.map(y => {
        const block = summaryData && summaryData.yearly_full ? summaryData.yearly_full[y] : null;
        return block ? block.hr_mean : null;
      });

      Plotly.newPlot('chart-hp-snore', [
        { x: years, y: qualVals, type: 'bar', name: copy.sleepCycleScore, marker: { color: QUALITY_BAR }, yaxis: 'y2', hovertemplate: copy.sleepScore },
        { x: years, y: hp, type: 'scatter', mode: 'lines+markers', name: copy.hPFeelingFrequency, line: { color: HP_COLOR, width: 2.6, shape: 'spline' }, marker: { size: 6, color: HP_COLOR }, yaxis: 'y', hovertemplate: '%{x}<br>HP: %{y:.1f}%<extra></extra>' },
        { x: years, y: snore, type: 'scatter', mode: 'lines+markers', name: copy.snoringFrequency, line: { color: '#ffea00', width: 2.6, shape: 'spline' }, marker: { size: 6, color: '#ffea00' }, yaxis: 'y', hovertemplate: copy.snoring },
        { x: years, y: hrVals, type: 'scatter', mode: 'lines+markers', name: copy.morningHeartRate, line: { color: THEME.muted, width: 2.6, shape: 'spline' }, marker: { size: 6, color: THEME.muted }, yaxis: 'y3', hovertemplate: copy.morningHeartRate2 },
      ], {
        ...plotDefaults,
        barmode: 'overlay',
        yaxis: { ...plotDefaults.yaxis, title: copy.systemSignal, range: [0, 115], ticksuffix: '%' },
        yaxis2: { title: '', overlaying: 'y', side: 'right', range: [55, 105], ticksuffix: '%', gridcolor: 'transparent', tickfont: { color: THEME.accent }, showticklabels: false },
        yaxis3: { title: '', overlaying: 'y', side: 'right', position: 0.94, range: [60, 75], gridcolor: 'transparent', tickfont: { color: THEME.muted }, showticklabels: false },
        xaxis: { ...plotDefaults.xaxis, title: copy.year },
        showlegend: true,
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        margin: { t: 20, r: 60, b: 60, l: 60 },
        hovermode: 'x unified',
        annotations: [
          {
            x: '2019', y: 2.2, yref: 'y', xref: 'x',
            text: copy.hPCuredEndOf2018,
            showarrow: true, arrowhead: 2, arrowcolor: HP_COLOR,
            ax: -60, ay: -35,
            font: { color: HP_COLOR, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: HP_COLOR, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2020', y: 62.7, yref: 'y', xref: 'x',
            text: copy.influenzaB202001,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: 55, ay: -35,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
        ],
      }, { responsive: true, displayModeBar: false });
    }

    // 07c · 诊断、治疗与恢复：quality as bar, recent signals as lines.
    if (global.document.getElementById('chart-recovery') && recoveryData) {
      const months = Object.keys(recoveryData).sort();
      Plotly.newPlot('chart-recovery', [
        { x: months, y: months.map(m => recoveryData[m].q), type: 'bar', name: copy.sleepQuality2, marker: { color: QUALITY_BAR }, yaxis: 'y' },
        { x: months, y: months.map(m => recoveryData[m].bd), type: 'scatter', mode: 'lines+markers', name: copy.breathingInterruption, line: { color: THEME.accent3, width: 2.3, shape: 'spline' }, marker: { size: 5, color: THEME.accent3 }, yaxis: 'y2' },
        { x: months, y: months.map(m => recoveryData[m].snore), type: 'scatter', mode: 'lines+markers', name: copy.snoringMin, line: { color: '#ffea00', width: 2.4, shape: 'spline' }, marker: { size: 5, color: '#ffea00' }, yaxis: 'y3' },
      ], {
        ...plotDefaults,
        barmode: 'overlay',
        xaxis: { ...plotDefaults.xaxis, title: '', type: 'date' },
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepQuality, range: [65, 90], ticksuffix: '%' },
        yaxis2: { title: '', overlaying: 'y', side: 'right', range: [0, 16], gridcolor: 'transparent', tickfont: { color: THEME.accent3 }, showticklabels: false },
        yaxis3: { title: '', overlaying: 'y', side: 'right', position: 0.94, range: [0, 130], gridcolor: 'transparent', tickfont: { color: '#ffea00' }, showticklabels: false },
        margin: { t: 20, r: 60, b: 70, l: 60 },
        annotations: [
          {
            x: '2024-08-15', y: 60.4, yref: 'y3', xref: 'x',
            text: copy.cOVID2nd202408,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: -65, ay: -35,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2024-09-15', y: 39.0, yref: 'y3', xref: 'x',
            text: copy.influenzaA202409,
            showarrow: true, arrowhead: 2, arrowcolor: THEME.red,
            ax: 60, ay: -30,
            font: { color: THEME.red, size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: THEME.red, borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2025-04-15', y: 12.84, yref: 'y2', xref: 'x',
            text: copy.startedSelfTreatingRhinitis20250415,
            showarrow: true, arrowhead: 2, arrowcolor: '#4ade80',
            ax: 0, ay: -50,
            font: { color: '#4ade80', size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: '#4ade80', borderwidth: 1, borderpad: 4,
            align: 'center',
          },
          {
            x: '2025-07-25', y: 7.05, yref: 'y2', xref: 'x',
            text: copy.diagnosedSinusitis20250725,
            showarrow: true, arrowhead: 2, arrowcolor: '#4ade80',
            ax: 65, ay: -35,
            font: { color: '#4ade80', size: 10 },
            bgcolor: 'rgba(13,17,23,0.88)', bordercolor: '#4ade80', borderwidth: 1, borderpad: 4,
            align: 'center',
          },
        ],
        ...(global.SleepEssayCharts && global.SleepEssayCharts.common
          ? global.SleepEssayCharts.common.xUnifiedLayout({
              legend: global.SleepEssayCharts.common.softLegend(THEME),
            })
          : {
              hovermode: 'x unified',
              legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
            }),
      }, { responsive: true, displayModeBar: false });
    }
  }

  root.renderBodySection = renderBodySection;
})(window);
