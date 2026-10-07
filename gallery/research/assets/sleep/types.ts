import type * as D from "./data-types";
export type PlotObject = Record<string, unknown>;
export interface Plotter { newPlot(target: string | HTMLElement, traces: PlotObject[], layout: PlotObject, config?: PlotObject): unknown }
export interface Theme { bg: string; surface: string; border: string; text: string; muted: string; accent: string; accent2: string; accent3: string; green: string; red: string; gold: string; accent4?: string; bad?: string }
export interface Defaults { paper_bgcolor: string; plot_bgcolor: string; font: PlotObject; margin: PlotObject; xaxis: PlotObject; yaxis: PlotObject }
interface ChartBase { Plotly: Plotter; THEME: Theme; plotDefaults: Defaults }
export interface ScoreDivergenceContext extends ChartBase { scoreData: D.DATA3 }
export interface EventsSectionContext extends ChartBase { eventData: D.DATA8; extraData: D.DATA6; breakData: D.DATA9 }
export interface TimeSectionContext extends ChartBase { baseData: D.DATA; extraData: D.DATA6; eventsData: D.DATA7 }
export interface MoodSectionContext extends ChartBase { baseData: D.DATA }
export interface EnvSectionContext extends ChartBase { weatherData: D.DATA10; envData: D.DATA11 }
export interface ExertionChartsContext extends ChartBase { data: D.DATA12 }
export interface ReboundSectionContext extends ChartBase { data: D.DATA13 }
export interface BodySectionContext extends ChartBase { baseData: D.DATA; summaryData: D.DATA2; hpData: D.DATA4; recoveryData: D.DATA5; extraData: D.DATA6 }
export interface OverviewSectionContext extends ChartBase { baseData: D.DATA }
export interface BehaviorSectionContext extends ChartBase { baseData: D.DATA }
export interface Extra2ChartsContext extends ChartBase { extra2Data: D.DATA14 }
export interface TravelSectionContext extends ChartBase { travelData: D.DATA_TRAVEL }
export interface MlSectionContext extends ChartBase { mlData: D.DATA15 }
export interface Common { normalizeBedtime(v: number): number; hourLabels(start: number, end: number): string[]; rollingAverage(values: Array<number | null>, radius: number): Array<number | null>; yearAxis(years: Array<string | number>, extra?: PlotObject): PlotObject; softLegend(theme: Theme, extra?: PlotObject): PlotObject; xUnifiedLayout(extra?: PlotObject): PlotObject }
export interface Registry { common?: Common;
 renderScoreDivergence?: (ctx: ScoreDivergenceContext) => void;
 renderEventsSection?: (ctx: EventsSectionContext) => void;
 renderTimeSection?: (ctx: TimeSectionContext) => void;
 renderMoodSection?: (ctx: MoodSectionContext) => void;
 renderEnvSection?: (ctx: EnvSectionContext) => void;
 renderExertionCharts?: (ctx: ExertionChartsContext) => void;
 renderReboundSection?: (ctx: ReboundSectionContext) => void;
 renderBodySection?: (ctx: BodySectionContext) => void;
 renderOverviewSection?: (ctx: OverviewSectionContext) => void;
 renderBehaviorSection?: (ctx: BehaviorSectionContext) => void;
 renderExtra2Charts?: (ctx: Extra2ChartsContext) => void;
 renderTravelSection?: (ctx: TravelSectionContext) => void;
 renderMlSection?: (ctx: MlSectionContext) => void;
}
declare global { interface Window { SleepEssayCharts?: Registry; Plotly?: Plotter; SleepEssayPlotly?: Plotter } }
