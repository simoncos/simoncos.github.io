import type { BehaviorSectionContext, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function renderBehaviorSection(ctx: BehaviorSectionContext) {
    const { Plotly, THEME, plotDefaults, baseData } = ctx;
    if (!Plotly || !baseData || !baseData.tag_impact) return;
    if (!global.document.getElementById('chart-tags')) return;

    const tags = Object.keys(baseData.tag_impact)
      .sort((a, b) => baseData.tag_impact[a].diff - baseData.tag_impact[b].diff);
    const diffs = tags.map(t => baseData.tag_impact[t].diff);
    const nWith = tags.map(t => baseData.tag_impact[t].n_with);
    const withMean = tags.map(t => baseData.tag_impact[t].with_mean);
    const withoutMean = tags.map(t => baseData.tag_impact[t].without_mean);

    const tagLabels: Record<string, string> = {
      'tea/coffee': copy.teaCoffee, 'break': copy.break, 'thinking': copy.thinking,
      'after 0000': copy.afterMidnight, 'plug': copy.earplugs2, 'noon nap': copy.noonNap,
      'HP feeling': copy.hPFeeling, 'sick': copy.sick, 'Stressful day': copy.stressfulDay,
      'Ate late': copy.ateLate, 'night gaming': copy.nightGaming, 'Worked out': copy.workedOut,
      'music': copy.music, 'tired': copy.tired, 'meditation': copy.meditation, 'massage': copy.massage,
      'fly': copy.mysteriousEvents, 'wine': copy.alcohol2, 'travel': copy.travel,
      'shower': copy.shower2, 'holiday night': copy.holidayNight2, 'sad': copy.preSleepSad, 'holy': copy.gutUneasy,
    };

    const colors = diffs.map(d => {
      // Diverging color scale based on magnitude
      if (d >= 0) {
        // Blend from neutral to bright green based on magnitude (up to +6%)
        const intensity = Math.min(d / 6.0, 1.0);
        return `rgba(59, 185, 80, ${0.4 + intensity * 0.5})`; // THEME.green base
      } else {
        // Blend from neutral to bright red based on magnitude (down to -10%)
        const intensity = Math.min(Math.abs(d) / 10.0, 1.0);
        return `rgba(248, 81, 73, ${0.4 + intensity * 0.5})`; // THEME.red base
      }
    });

    Plotly.newPlot('chart-tags', [{
      x: diffs,
      y: tags.map(t => tagLabels[t] || t),
      type: 'bar',
      orientation: 'h',
      marker: { color: colors },
      customdata: tags.map((t, i) => [withMean[i], withoutMean[i], nWith[i]]),
      hovertemplate: copy.deltaWithTagWithoutTagN,
      text: diffs.map(d => `${d > 0 ? '+' : ''}${d.toFixed(1)}%`),
      textposition: 'outside',
      textfont: { size: 11 },
    }], {
      ...plotDefaults,
      xaxis: { ...plotDefaults.xaxis, title: copy.qualityDeltaVsOverallBaseline, ticksuffix: '%', zeroline: true, zerolinecolor: THEME.muted, zerolinewidth: 2 },
      yaxis: { ...plotDefaults.yaxis, automargin: true },
      margin: { t: 20, r: 80, b: 55, l: 120 },
      showlegend: false,
    }, { responsive: true, displayModeBar: false });
  }

  root.renderBehaviorSection = renderBehaviorSection;
})(window);
