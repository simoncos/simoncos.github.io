import type { EventsSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  const DEFAULT_FLY_CO = [
    { tag: copy.shower, delta: 25.8 },
    { tag: copy.noonNap, delta: 12.2 },
    { tag: copy.holidayNight, delta: 8.9 },
    { tag: copy.workedOut, delta: 5.4 },
    { tag: copy.vacation, delta: 4.5 },
    { tag: copy.tired, delta: 4.2 },
  ];

  const DEFAULT_NG_SEGMENTS = [
    { label: copy.noNightGaming1am, quality: 85.1, bad: 29.9, n: 2212 },
    { label: copy.noNightGaming1am2, quality: 74.7, bad: 53.8, n: 303 },
    { label: copy.nightGaming1am, quality: 85.4, bad: 37.1, n: 722 },
    { label: copy.nightGaming1am2, quality: 76.6, bad: 71.9, n: 417 },
    { label: copy.nightGaming1am7h, quality: 67.4, bad: 87.8, n: 196 },
  ];

  function renderEventsSection(ctx: EventsSectionContext) {
    const { Plotly, THEME, plotDefaults, eventData, extraData, breakData } = ctx;
    const sel = global.document.getElementById('event-selector');
    if (!sel || !Plotly) return;

    const eventPanels = eventData || {};
    const EVENTS = eventPanels.events || {};
    const FLY_CO = (eventPanels.fly_co || DEFAULT_FLY_CO).map(d => ({ ...d, tag: remapTag(d.tag) }));
    const NG_SEGMENTS = eventPanels.night_gaming_segments || DEFAULT_NG_SEGMENTS;

    const baselines: Record<string, number> = {};
    if (extraData && extraData.yearly) {
      Object.entries(extraData.yearly).forEach(([y, v]) => {
        baselines[y] = v.quality || v.q || 83.3;
      });
    }

    function renderEvent(key: string) {
      global.document.querySelectorAll<HTMLElement>('.event-text-panel').forEach(el => el.style.display = 'none');
      const panel = global.document.getElementById('event-text-' + key);
      if (panel) panel.style.display = '';

      // Hide combo card by default; stimulants branch will show it
      const comboCardDefault = global.document.getElementById('chart-stimulants-combo-card');
      if (comboCardDefault) comboCardDefault.style.display = 'none';

      const title1 = global.document.getElementById('event-chart1-title');
      const title2 = global.document.getElementById('event-chart2-title');
      const chart2 = global.document.getElementById('chart-event-box');
      const chart2Card = chart2 ? chart2.closest<HTMLElement>('.chart-card') : null;

      if (key === 'stimulants') {
        const stim = eventPanels.stimulants || {};
        const wine = stim.wine || {};
        const caff = stim.caffeine || {};
        const comboCard = global.document.getElementById('chart-stimulants-combo-card');
        if (chart2Card) chart2Card.style.display = '';
        if (comboCard) comboCard.style.display = '';
        if (title1) title1.textContent = copy.annualFrequency;
        if (title2) title2.textContent = copy.qualityComparisonAlcoholVsCaffeineVsBaseline;

        // Chart 1: yearly frequency dual line
        const years = Object.keys(wine.yearly_pct || {}).sort();
        const yearNums = years.map(Number);
        Plotly.newPlot('chart-event-freq', [
          { x: yearNums, y: years.map(y => (wine.yearly_pct || {})[y] || 0), type: 'scatter', mode: 'lines+markers', name: copy.alcohol, line: { color: THEME.red, width: 2.5 }, marker: { size: 6 } },
          { x: yearNums, y: years.map(y => (caff.yearly_pct || {})[y] || 0), type: 'scatter', mode: 'lines+markers', name: copy.caffeineTeaCoffee, line: { color: THEME.gold, width: 2.5 }, marker: { size: 6 } }
        ], {
          ...plotDefaults,
          yaxis: { ...plotDefaults.yaxis, title: copy.frequency, ticksuffix: '%' },
          xaxis: { ...plotDefaults.xaxis, title: '', type: 'linear', tickmode: 'array', tickvals: yearNums, ticktext: years, range: [yearNums[0] - 0.5, yearNums[yearNums.length - 1] + 0.5] },
          legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
          margin: { t: 10, r: 70, b: 45, l: 55 },
          annotations: years.includes('2026') ? [{
            x: 2026, y: 0, xref: 'x', yref: 'paper',
            text: copy.dataThroughMarSpikeLikelyDrivenBy, showarrow: false,
            font: { color: THEME.muted, size: 10 }, xanchor: 'center', yanchor: 'bottom'
          }] : []
        }, { responsive: true, displayModeBar: false });

        // Chart 2: quality gap bar (wine vs caffeine vs baseline)
        const items = [
          { label: copy.alcohol, q: wine.quality_with, n: wine.n, color: THEME.red },
          { label: copy.caffeineTeaCoffee, q: (stim.caffeine || {}).quality_with, n: (stim.caffeine || {}).n, color: THEME.gold },
          { label: copy.neither, q: wine.quality_without, n: null, color: THEME.muted },
        ];
        Plotly.newPlot('chart-event-box', [
          { type: 'bar', x: items.map(d => d.label), y: items.map(d => d.q),
            marker: { color: items.map(d => d.color), opacity: 0.85 },
            text: items.map(d => d.n ? `${d.q}%<br>(n=${d.n})` : `${d.q}%`), textposition: 'outside',
            hovertemplate: copy.quality },
          { type: 'scatter', mode: 'lines', x: items.map(d => d.label), y: items.map(() => 83.3),
            line: { color: THEME.muted, width: 1.5, dash: 'dot' }, hoverinfo: 'none', showlegend: false }
        ], {
          ...plotDefaults,
          yaxis: { ...plotDefaults.yaxis, title: copy.avgSleepQuality, range: [60, 100], ticksuffix: '%' },
          xaxis: { ...plotDefaults.xaxis, title: '', type: 'category' },
          margin: { t: 10, r: 60, b: 60, l: 55 }, showlegend: false
        }, { responsive: true, displayModeBar: false });

        // Chart 3: combo effect (wine × late night)
        const combo = wine.combo || {};
        const groups = [
          { label: copy.alcoholLateNight, q: (combo.wine_and_late || {}).quality, n: (combo.wine_and_late || {}).n, color: '#b91c1c' },
          { label: copy.alcoholOnlyEarly, q: (combo.wine_only || {}).quality, n: (combo.wine_only || {}).n, color: THEME.red },
          { label: copy.neither, q: (combo.neither || {}).quality, n: (combo.neither || {}).n, color: THEME.muted },
        ];
        Plotly.newPlot('chart-event-combo', [
          { type: 'bar', x: groups.map(d => d.label), y: groups.map(d => d.q),
            marker: { color: groups.map(d => d.color), opacity: 0.85 },
            text: groups.map(d => `${d.q}%<br>(n=${d.n})`), textposition: 'outside',
            hovertemplate: copy.quality },
          { type: 'scatter', mode: 'lines', x: groups.map(d => d.label), y: groups.map(() => 83.3),
            line: { color: THEME.muted, width: 1.5, dash: 'dot' }, hoverinfo: 'none', showlegend: false }
        ], {
          ...plotDefaults,
          yaxis: { ...plotDefaults.yaxis, title: copy.avgSleepQuality, range: [60, 100], ticksuffix: '%' },
          xaxis: { ...plotDefaults.xaxis, title: '', type: 'category' },
          annotations: [{ x: copy.neither, y: 83.3, xref: 'x', yref: 'y', showarrow: false, text: copy.baseline833, font: { color: THEME.muted, size: 10 }, xanchor: 'left', yanchor: 'bottom' }],
          margin: { t: 10, r: 60, b: 60, l: 55 }, showlegend: false
        }, { responsive: true, displayModeBar: false });
        return;
      }

      const ev = EVENTS[key];
      if (!ev) return;
      const years = Object.keys(ev.yearly_pct).sort();

      if (chart2Card) chart2Card.style.display = '';

      if (key === 'hp_feeling') {
        if (title1) title1.textContent = copy.annualHPFeelingCount;
        if (chart2Card) chart2Card.style.display = 'none';
        const hpCountsMap = eventPanels.hp_counts || {};
        // Use hp_counts keys (includes 2025/2026 with 0) so x-axis always shows full range
        const hpYears = Object.keys(hpCountsMap).sort();
        const hpCounts = hpYears.map(y => hpCountsMap[y] ?? 0);
        const yearNums = hpYears.map(y => Number(y));
        Plotly.newPlot('chart-event-freq', [{
          x: yearNums, y: hpCounts, type: 'bar',
          marker: { color: hpCounts.map(n => n > 50 ? THEME.red : n > 20 ? THEME.muted : THEME.border), opacity: 0.9 },
          text: hpCounts.map(n => n > 0 ? String(n) : ''), textposition: 'outside',
          hovertemplate: copy.hPFeelingTimes
        }], {
          ...plotDefaults,
          yaxis: { ...plotDefaults.yaxis, title: copy.count },
          xaxis: { ...plotDefaults.xaxis, title: copy.year, type: 'linear', tickmode: 'array', tickvals: yearNums, ticktext: (english ? hpYears : years), range: [2015.5, 2026.5] },
          margin: { t: 10, r: 60, b: 45, l: 55 }, showlegend: false,
        }, { responsive: true, displayModeBar: false });
        return;
      }

      if (title1) title1.textContent = copy.annualFrequency;
      if (title2) {
        if (key === 'fly') title2.textContent = copy.coOccurringSignalsWithMysteriousEvents;
        else if (key === 'night_gaming') title2.textContent = copy.nightGamingLateSleepShortBedTime;
        else title2.textContent = copy.sleepQualityWithVsWithoutEvent;
      }

      Plotly.newPlot('chart-event-freq', [
        { x: years, y: years.map(y => ev.yearly_pct[y]), type: 'bar', name: copy.annualFrequency2, marker: { color: THEME.border, opacity: 0.7 }, yaxis:'y' },
        { x: years, y: years.map(y => ev.yearly_qual[y]), type: 'scatter', mode: 'lines+markers', name: copy.qualityOnEventNights, line: { color: THEME.accent, width: 2.5 }, marker: { size: 6 }, yaxis:'y2' },
        { x: years, y: years.map(y => baselines[y] || 83.3), type: 'scatter', mode: 'lines', name: copy.annualBaseline, line: { color: THEME.muted, width: 1.5, dash: 'dot' }, yaxis:'y2' }
      ], {
        ...plotDefaults,
        yaxis: { ...plotDefaults.yaxis, title: copy.frequency, range:[0,55], ticksuffix:'%' },
        yaxis2: { title:copy.sleepQuality, overlaying:'y', side:'right', range:[40,105], ticksuffix:'%', gridcolor:'transparent' },
        xaxis: { ...plotDefaults.xaxis, title:'', type:'category' }, hovermode:'x unified',
        legend: { x:0.01, y:0.99, bgcolor:'rgba(22,27,34,0.85)', bordercolor:THEME.border, borderwidth:1 },
        margin: { t:10, r:70, b:45, l:55 }
      }, { responsive:true, displayModeBar:false });

      if (key === 'fly') {
        Plotly.newPlot('chart-event-box', [{
          type:'bar', orientation:'h', y: FLY_CO.map(d => d.tag), x: FLY_CO.map(d => d.delta),
          marker:{ color: THEME.muted, opacity:0.85 }, text: FLY_CO.map(d => `+${d.delta.toFixed(1)}pp`), textposition:'outside',
          hovertemplate:copy.coOccurrenceLiftWithMysteriousEventsPp
        }], {
          ...plotDefaults,
          xaxis:{ ...plotDefaults.xaxis, title:copy.moreCommonOnMysteriousEventNightsPercentage, ticksuffix:'pp', zeroline:true, zerolinecolor:THEME.muted },
          yaxis:{ ...plotDefaults.yaxis, automargin:true }, margin:{ t:10, r:70, b:45, l:120 }, showlegend:false,
        }, { responsive:true, displayModeBar:false });
      } else if (key === 'night_gaming') {
        Plotly.newPlot('chart-event-box', [
          { type:'bar', x: NG_SEGMENTS.map(d => d.label), y: NG_SEGMENTS.map(d => d.quality), marker:{ color:[THEME.muted, THEME.accent3, THEME.muted, THEME.red, '#b91c1c'], opacity:0.85 }, text: NG_SEGMENTS.map(d => `${d.quality}%<br>(n=${d.n})`), textposition:'outside', hovertemplate:copy.quality },
          { type:'scatter', mode:'lines+markers', x: NG_SEGMENTS.map(d => d.label), y: NG_SEGMENTS.map(d => d.bad), line:{ color:THEME.red, width:2 }, marker:{ size:6 }, yaxis:'y2', name:copy.bad, hovertemplate:'%{x}<br>Bad: %{y:.1f}%<extra></extra>' }
        ], {
          ...plotDefaults,
          xaxis:{ ...plotDefaults.xaxis, title:'', type:'category' },
          yaxis:{ ...plotDefaults.yaxis, title:copy.avgSleepQuality, range:[60,100], ticksuffix:'%' },
          yaxis2:{ title:copy.bad2, overlaying:'y', side:'right', range:[20,95], ticksuffix:'%', gridcolor:'transparent' },
          margin:{ t:10, r:60, b:70, l:55 }, showlegend:false,
        }, { responsive:true, displayModeBar:false });
      } else {
        Plotly.newPlot('chart-event-box', [
          { type:'bar', x:[copy.withEvent,copy.withoutEvent], y:[ev.mean_with, ev.mean_without], marker:{ color:[ev.delta >= 0 ? THEME.green : THEME.red, THEME.muted], opacity:0.85 }, text:[`${ev.mean_with}%<br>(n=${ev.n})`, `${ev.mean_without}%`], textposition:'outside', width:0.4 },
          { type:'scatter', mode:'lines', x:[copy.withEvent,copy.withoutEvent], y:[83.3,83.3], line:{ color:THEME.muted, width:1.5, dash:'dot' }, hoverinfo:'none', showlegend:false }
        ], {
          ...plotDefaults,
          yaxis:{ ...plotDefaults.yaxis, title:copy.avgSleepQuality, range:[40,100], ticksuffix:'%' },
          xaxis:{ ...plotDefaults.xaxis, title:'', type:'category' },
          annotations:[{ x:copy.withoutEvent, y:83.3, xref:'x', yref:'y', showarrow:false, text:copy.baseline833, font:{ color:THEME.muted, size:10 }, xanchor:'left', yanchor:'bottom' }],
          margin:{ t:10, r:60, b:45, l:55 }, showlegend:false
        }, { responsive:true, displayModeBar:false });
      }
    }

    sel.querySelectorAll<HTMLElement>('.event-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        sel.querySelectorAll<HTMLElement>('.event-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderEvent(btn.dataset.eventKey || "fly");
      });
    });

    const activeBtn = sel.querySelector<HTMLElement>('.event-chip.active') || sel.querySelector<HTMLElement>('.event-chip');
    renderEvent(activeBtn?.dataset.eventKey || 'fly');

    const breakYearlyEl = global.document.getElementById('chart-break-yearly');
    const breakContinuityEl = global.document.getElementById('chart-break-continuity');
    const breakTrekEl = global.document.getElementById('chart-break-trek');
    if (!breakData || (!breakYearlyEl && !breakContinuityEl && !breakTrekEl)) return;

    const yearly = breakData.yearly || {};
    const yearlyKeys = Object.keys(yearly).filter(y => yearly[y] && yearly[y].break_n > 0).sort();
    if (breakYearlyEl && yearlyKeys.length) {
      Plotly.newPlot('chart-break-yearly', [
        {
          x: yearlyKeys,
          y: yearlyKeys.map(y => yearly[y].break_pct),
          type: 'bar',
          name: copy.breakNight,
          marker: { color: THEME.border, opacity: 0.75 },
          yaxis: 'y'
        },
        {
          x: yearlyKeys,
          y: yearlyKeys.map(y => yearly[y].quality_delta),
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.qualityDeltaVsNonBreak,
          line: { color: THEME.red, width: 2.5 },
          marker: { size: 6 },
          yaxis: 'y2'
        }
      ], {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: '', type: 'category' },
        yaxis: { ...plotDefaults.yaxis, title: copy.breakNight2, ticksuffix: '%', range: [0, 13] },
        yaxis2: { title: copy.qualityDelta, overlaying: 'y', side: 'right', range: [-15, 2], gridcolor: 'transparent' },
        hovermode: 'x unified',
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        margin: { t: 10, r: 70, b: 45, l: 55 }
      }, { responsive: true, displayModeBar: false });
    }

    if (breakContinuityEl && breakData.continuity && breakData.headline) {
      const metrics = [
        { label: copy.sleepQualityDelta, value: breakData.headline.quality.delta, color: THEME.red },
        { label: copy.badMoodDelta, value: breakData.headline.bad_pct.delta, color: THEME.red },
        { label: copy.awakeTimeDeltaHours, value: breakData.continuity.awake_h.delta, color: THEME.gold },
        { label: copy.efficiencyDeltaPp, value: breakData.continuity.efficiency_pct.delta, color: THEME.red },
        { label: copy.movementFreqDelta, value: breakData.body && breakData.body.movements_per_hour ? breakData.body.movements_per_hour.delta : null, color: THEME.muted },
      ].filter(d => d.value !== null && d.value !== undefined);
      Plotly.newPlot('chart-break-continuity', [{
        type: 'bar',
        orientation: 'h',
        y: metrics.map(d => d.label),
        x: metrics.map(d => d.value),
        marker: { color: metrics.map(d => d.color), opacity: 0.82 },
        text: metrics.map(d => typeof d.value === 'number' ? d.value.toFixed(1) : String(d.value)),
        textposition: 'outside',
        hovertemplate: '%{y}<br>%{x}<extra></extra>'
      }], {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: copy.breakVsNonBreakDelta, zeroline: true, zerolinecolor: THEME.muted },
        yaxis: { ...plotDefaults.yaxis, automargin: true },
        margin: { t: 10, r: 60, b: 45, l: 150 },
        showlegend: false,
      }, { responsive: true, displayModeBar: false });
    }

    if (breakTrekEl) {
      const trekRows = [
        { label: copy.label20201130PostYubengTrekNight, quality: 100.0, awake_h: 0.1665, efficiency: 98.0 },
        { label: copy.label20251003PostHabaTrekNight, quality: 45.0, awake_h: 3.3202, efficiency: 59.3 },
      ];
      Plotly.newPlot('chart-break-trek', [
        {
          x: trekRows.map(d => d.label),
          y: trekRows.map(d => d.quality),
          type: 'bar',
          name: copy.sleepQuality2,
          marker: { color: [THEME.green, THEME.red], opacity: 0.85 },
          text: trekRows.map(d => `${d.quality}%`),
          textposition: 'outside',
          yaxis: 'y'
        },
        {
          x: trekRows.map(d => d.label),
          y: trekRows.map(d => d.awake_h),
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.awakeTimeHours,
          line: { color: THEME.gold, width: 2.5 },
          marker: { size: 8 },
          yaxis: 'y2'
        },
        {
          x: trekRows.map(d => d.label),
          y: trekRows.map(d => d.efficiency),
          type: 'scatter',
          mode: 'lines+markers',
          name: copy.efficiency,
          line: { color: THEME.muted, width: 2.5, dash: 'dot' },
          marker: { size: 8 },
          yaxis: 'y3'
        }
      ], {
        ...plotDefaults,
        xaxis: { ...plotDefaults.xaxis, title: '', type: 'category' },
        yaxis: { ...plotDefaults.yaxis, title: copy.sleepQuality, range: [0, 105], ticksuffix: '%' },
        yaxis2: { title: copy.awakeTimeHours, overlaying: 'y', side: 'right', range: [0, 3.8], gridcolor: 'transparent' },
        yaxis3: { title: copy.efficiency, anchor: 'free', overlaying: 'y', side: 'right', position: 0.94, range: [50, 100], ticksuffix: '%', gridcolor: 'transparent' },
        legend: { x: 0.01, y: 0.99, bgcolor: 'rgba(22,27,34,0.85)', bordercolor: THEME.border, borderwidth: 1 },
        margin: { t: 10, r: 115, b: 60, l: 55 }
      }, { responsive: true, displayModeBar: false });
    }
  }

  root.renderEventsSection = renderEventsSection;
})(window);
