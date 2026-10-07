import "./sleep/common";
import "./sleep/score-divergence";
import "./sleep/events-section";
import "./sleep/time-section";
import "./sleep/mood-section";
import "./sleep/env-section";
import "./sleep/exertion-charts";
import "./sleep/rebound-section";
import "./sleep/body-section";
import "./sleep/overview-section";
import "./sleep/behavior-section";
import "./sleep/extra2charts";
import "./sleep/travel-section";
import "./sleep/ml-section";
import rawData from "./sleep/data.json";
import type * as D from "./sleep/data-types";
const data: { DATA: D.DATA; DATA2: D.DATA2; DATA3: D.DATA3; DATA4: D.DATA4; DATA5: D.DATA5; DATA6: D.DATA6; DATA7: D.DATA7; DATA8: D.DATA8; DATA9: D.DATA9; DATA10: D.DATA10; DATA11: D.DATA11; DATA12: D.DATA12; DATA13: D.DATA13; DATA14: D.DATA14; DATA15: D.DATA15; DATA_TRAVEL: D.DATA_TRAVEL } = rawData;
const DATA = data.DATA;
const DATA2 = data.DATA2;
const DATA3 = data.DATA3;
const DATA4 = data.DATA4;
const DATA5 = data.DATA5;
const DATA6 = data.DATA6;
const DATA7 = data.DATA7;
const DATA8 = data.DATA8;
const DATA9 = data.DATA9;
const DATA10 = data.DATA10;
const DATA11 = data.DATA11;
const DATA12 = data.DATA12;
const DATA13 = data.DATA13;
const DATA14 = data.DATA14;
const DATA15 = data.DATA15;
const DATA_TRAVEL = data.DATA_TRAVEL;
const THEME = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#7d8590',
  accent: '#58a6ff',
  accent2: '#bc8cff',
  accent3: '#ffa657',
  green: '#3fb950',
  red: '#f85149',
  gold: '#d29922',
};

const plotDefaults = {
  paper_bgcolor: THEME.bg,
  plot_bgcolor: THEME.bg,
  font: { color: THEME.text, family: 'Inter, Noto Sans SC, PingFang SC, Microsoft YaHei, system-ui, sans-serif', size: 12 },
  margin: { t: 20, r: 20, b: 50, l: 55 },
  xaxis: { gridcolor: '#21262d', zerolinecolor: '#30363d', linecolor: '#30363d' },
  yaxis: { gridcolor: '#21262d', zerolinecolor: '#30363d', linecolor: '#30363d' },
};

// ─── Render all charts ───
// The small loader resolves the dependency and defers each plot until nearby.
function _renderAllCharts() {
  const Plotly = window.SleepEssayPlotly || window.Plotly;
  if (!Plotly) return;

  var C = window.SleepEssayCharts || {};

  if (typeof C.renderOverviewSection === 'function')
    C.renderOverviewSection({ Plotly, THEME, plotDefaults, baseData: DATA });

  if (typeof C.renderTimeSection === 'function')
    C.renderTimeSection({ Plotly, THEME, plotDefaults, baseData: DATA, extraData: DATA6, eventsData: DATA7 });

  if (typeof C.renderTravelSection === 'function')
    C.renderTravelSection({ Plotly, THEME, plotDefaults, travelData: DATA_TRAVEL });
  if (typeof C.renderEventsSection === 'function')
    C.renderEventsSection({ Plotly, THEME, plotDefaults, eventData: DATA8, extraData: DATA6, breakData: DATA9 });

  if (typeof C.renderBehaviorSection === 'function')
    C.renderBehaviorSection({ Plotly, THEME, plotDefaults, baseData: DATA });

  if (typeof C.renderBodySection === 'function')
    C.renderBodySection({ Plotly, THEME, plotDefaults, baseData: DATA, summaryData: DATA2, hpData: DATA4, recoveryData: DATA5, extraData: DATA6 });

  if (typeof C.renderScoreDivergence === 'function')
    C.renderScoreDivergence({ Plotly, scoreData: DATA3, THEME, plotDefaults });

  if (typeof C.renderMoodSection === 'function')
    C.renderMoodSection({ Plotly, THEME, plotDefaults, baseData: DATA });

  if (typeof C.renderEnvSection === 'function')
    C.renderEnvSection({ Plotly, THEME, plotDefaults, weatherData: DATA10, envData: DATA11 });

  if (typeof C.renderReboundSection === 'function')
    C.renderReboundSection({ Plotly, THEME, plotDefaults, data: DATA13 });

  if (typeof C.renderExertionCharts === 'function')
    C.renderExertionCharts({ Plotly, THEME, plotDefaults, data: DATA12 });

  if (typeof C.renderExtra2Charts === 'function')
    C.renderExtra2Charts({ Plotly, THEME, plotDefaults, extra2Data: DATA14 });

  if (typeof C.renderMlSection === 'function')
    C.renderMlSection({ Plotly, THEME, plotDefaults, mlData: DATA15 });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _renderAllCharts);
} else {
  _renderAllCharts();
}
