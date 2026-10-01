# Zhihu 2015 research page

The Work → Research entry combines the two 2016 articles into an exploratory,
bilingual reading experience. The articles keep their URLs and historical text.

## Source and scope

`data/zhihu-2015.json` transcribes the published tables, including the summary
statistics embedded in the first article's image (also table 2 of the original
report). The five profile means and medians were verified against the recovered original
database. Only coarse distribution bins were newly computed; network metrics
and rankings remain the historical published results.
The 2026 exploratory research outputs are not substituted for these figures.

## Visual contract

| Layer | Reading job / encoding | Interaction / fallback | Verification |
| --- | --- | --- | --- |
| Five profile metrics | Mean and median on a shared zero; eight disjoint magnitude bins show counts and shares of 26,161 records | Select a metric; original distribution image and full table remain in HTML | Values checked against original table and database; bins partition all records once |
| Two follow networks | Compare published density, population, giant SCC and path length | Cohort selection highlights the relevant values; four-node directed schematic explains paths | Schematic labelled; path metrics restricted to the giant SCC |
| Influence rankings | Three adjacent published Top 5 lists, scores stay within their own metric | Cohort selector and person selection coordinate highlights; absence is “not in published Top 5” | All 30 ranking entries match article; no zero imputation |
| Question topics | Paired horizontal bars on one zero-based count axis | Sort by either cohort; retain every published topic and show missing as unreported | 30/20 source entries, union preserved; denominator and truncation caveats visible |

SVG/DOM owns these modest, fixed-size visuals; no new chart dependency, continuous
simulation or data fetch is needed. Primary colour is teal, comparison is ochre;
direct labels and values also identify the series. Rendering and interaction use
the existing static-page generator and TypeScript pipeline. All text and tables
exist without JavaScript; enhancement only changes selection, highlights and order.

Desktop has a question column and evidence column. Mobile stacks them, keeps
labels outside graphics and uses touch controls instead of hover. URL parameters
store metric, cohort, selected person and topic order; Back and reload restore
valid state. No storage or server is added. The shared shell owns language/theme.

Local specialist passes: data-visualization routing, SVG layout and statistical
visualization. No delegated work. QA includes generated-output checks, data
invariants, desktop/mobile screenshots, language/theme changes, keyboard controls,
URL restoration, invalid parameters and no-JavaScript reading.

## Maintenance

- Source: `scripts/build_zhihu_research.py`, `data/zhihu-2015.json`.
- Aggregate preparation: `scripts/prepare_zhihu_distributions.py --db <private archive>`;
  fingerprint-checked, read-only, outside normal builds. No identifiers are exported.
- Output: `gallery/research/zhihu-2015.html`, via `scripts/build_pages.py`.
- Styles: `gallery/research/assets/zhihu-2015.css`.
- Behaviour: `src/ts/zhihu-research.ts` → `src/js/zhihu-research.js`.
- Raw databases and person-level data are not website assets.
