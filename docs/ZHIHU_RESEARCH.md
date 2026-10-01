# Zhihu 2015 research page

The Work → Research entry combines the two 2016 articles into an exploratory,
bilingual reading experience. The articles keep their URLs and historical text.

## Source and scope

`data/zhihu-2015.json` transcribes the published tables, including the summary
statistics embedded in the first article's image (also table 2 of the original
report). The five profile means and medians were verified against the recovered original
database. Coarse profile bins and anonymous network geometry were newly computed;
network summary tables and rankings remain the historical published results.
The 2026 exploratory research outputs are not substituted for these figures.

The graph uses all actual internal directed edges: Net50k has 375 users / 27,324
edges / 6,414 reciprocal pairs. Net10k has 1,896 users / 231,416 edges / 35,625
reciprocal pairs in the restored archive. Its node count differs from the
published 1,895 by one; the page discloses this rather than deleting a real node.
No claim about the reason for that historical difference is made.

## Visual contract

| Layer | Reading job / encoding | Interaction / fallback | Verification |
| --- | --- | --- | --- |
| Five profile metrics | Mean and median on a shared zero; eight disjoint magnitude bins show counts and shares of 26,161 records | Select a metric; original distribution image and full table remain in HTML | Values checked against original table and database; bins partition all records once |
| Real follow networks | Fixed force layout of anonymous users; structural grouping on the symmetrized network; circles grow with incoming follows | Switch cohorts and mutual/all/group views; select a node for its complete directed neighbourhood; zoom, reset, keyboard and numeric lookup | Edges and in/out degrees conserved; reciprocity and group totals checked; background sampling disclosed |
| Group network | Circle area encodes group population; lines count links in both directions between groups | Exact directed matrix in a disclosure | Matrix conserves every edge; colours do not name real-world social groups |
| Historical network statistics | Published density, population, giant SCC and path length | Tables and the clearly labelled four-node explanation in disclosures | Path metrics restricted to the giant SCC; reconstruction count difference disclosed |
| Influence rankings | Three adjacent published Top 5 lists, scores stay within their own metric | Cohort selector and person selection coordinate highlights; absence is “not in published Top 5” | All 30 ranking entries match article; no zero imputation |
| Question topics | Paired horizontal bars on one zero-based count axis | Sort by either cohort; retain every published topic and show missing as unreported | 30/20 source entries, union preserved; denominator and truncation caveats visible |

SVG supplies the real cover and no-script fallback; one Canvas2D scene renders
the interactive network. Its normalized coordinates are fixed offline, with no
runtime force simulation or new browser dependency. The selected cohort's static
JSON is fetched once and cached in memory. Context ink is deterministically
sampled to at most 12,000 lines; focused neighbourhoods are complete. DPR is
capped at 2. HTML owns exact values, controls and accessibility.
Primary colour is teal, comparison is ochre for the original statistics;
direct labels and values also identify the series. Rendering and interaction use
the existing static-page generator and TypeScript pipeline. All text and tables
exist without JavaScript; enhancement only changes selection, highlights and order.

Desktop gives the graph most of the width with a compact inspector. Mobile puts
the 420 px graph before the inspector; vertical touch scrolling and browser
pinch zoom remain available. Explicit zoom centres the selected node. Numeric
lookup and arrow-key stepping avoid tiny-node-only interaction. URL parameters
store metric, cohort, graph view, anonymous node, published person and topic
order; Back and reload restore
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
- Network preparation: `scripts/prepare_zhihu_networks.py --db <private archive>`;
  fingerprint-checked and read-only. NumPy is used only for this offline step.
- Graph assets: `gallery/research/assets/zhihu-net{10,50}k.{json,svg}`;
  `zhihu-network-card.svg` is the Work cover.
- Graph behaviour: `src/ts/zhihu-network.ts` → `src/js/zhihu-network.js`.
- Raw databases, account identifiers and profile URLs are not website assets.
  Only names already published in the original Top 5 lists can label a node,
  and only when the archive has exactly one matching profile in that cohort.
  These anchors link the ranking lists to the graph. Other nodes stay anonymous.
- The ten-year sleep study now belongs to Work → Research. The single-item
  Visual essays category is retired; old `#visual` links open Research.
