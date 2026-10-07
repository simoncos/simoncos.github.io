import type { Common, PlotObject, Theme } from "./types";
import { copy, english, remapTag, remapEnvironmentLabel } from "./localization";
(function(global: Window) {
  const root = global.SleepEssayCharts = global.SleepEssayCharts || {};

  function normalizeBedtime(v: number) {
    return v < 12 ? v + 24 : v;
  }

  function hourLabels(startHour: number, endHour: number) {
    const hours = [];
    for (let h = startHour; h <= endHour; h++) hours.push(h);
    return hours.map(h => `${String(h % 24).padStart(2, '0')}:00`);
  }

  function rollingAverage(values: Array<number | null>, radius: number) {
    return values.map((v, i) => {
      const slice = values.slice(Math.max(0, i - radius), i + radius + 1).filter(x => x !== null && x !== undefined);
      return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : v;
    });
  }

  function yearAxis(years: Array<string | number>, extra?: PlotObject) {
    const yearNums = years.map(y => Number(y));
    return {
      type: 'linear',
      tickmode: 'array',
      tickvals: yearNums,
      ticktext: years,
      range: [Math.min(...yearNums) - 0.5, Math.max(...yearNums) + 0.5],
      ...(extra || {}),
    };
  }

  function softLegend(THEME: Theme, extra?: PlotObject) {
    return {
      x: 0.01,
      y: 0.99,
      bgcolor: 'rgba(22,27,34,0.85)',
      bordercolor: THEME.border,
      borderwidth: 1,
      ...(extra || {}),
    };
  }

  function xUnifiedLayout(extra?: PlotObject) {
    return {
      hovermode: 'x unified',
      ...(extra || {}),
    };
  }

  root.common = {
    normalizeBedtime,
    hourLabels,
    rollingAverage,
    yearAxis,
    softLegend,
    xUnifiedLayout,
  };
})(window);
