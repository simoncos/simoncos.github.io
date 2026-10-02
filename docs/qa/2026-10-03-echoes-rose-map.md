# Echoes map: petal-shaped routes and readable junctions

Baseline: `025fec4fdce136b4ba4b53533eeccb4640c56fc4`. Owner request: separate crowded lines and explore a rose-like overall network shape.

## Change and authoring

- Repositioned the existing 37 nodes into an abstract flower with curling petal routes and lower branching paths. Start and ending remain at opposite diagonal extremes. This is an interpretation of a rose, not a literal botanical tracing; aesthetic owner review remains open.
- Authored all 47 actual song connections independently through `map.routes` in `data/music-riddle.json`. Each key is `from-id:to-id`; its array contains intermediate `[x, y]` points. The generator joins them with continuous cubic curves and spreads incoming/outgoing ports. The schema and data validator reject nonexistent routes and out-of-canvas points. The template continues to work without optional route metadata.
- Song identities, order, clues, next-song relationships, source evidence, and saved-progress IDs are unchanged in parsed data after excluding map metadata and positions.
- Intersections have background-colored clearance strokes. Current outgoing paths render above other paths in the warm accent; incoming paths use blue. The legend explains both. Nodes, labels and travel effects remain above the routes.
- Title placement uses available space around the complete, eventually discovered graph. Added transparent label hit areas after browser QA caught clicks falling between a side-positioned title and its flower. Start-role/title overlap also fixed.
- Piano sample replay, reveal/hint behavior, terminal states, reduced-motion rules and saved progress remain intact.

## Evidence

- `make generate`, `make check-all`: PASS, 74 tests. Four new layout/data tests protect node spacing, unrelated-node clearance, converging arrow separation and invalid route metadata. Existing audio regression remains passing.
- Sampled route geometry: nearest node centers 107.4 map units; nearest unrelated node to a route 50.7; nearest two converging arrow tips 25.3. Source and target trim radii are 36 and 48. A diagnostic search found no remaining extended near-parallel route pair within 12 map units away from shared endpoints (sampled direction dot product above .94).
- Runtime IAB checks on the saved complete collection: 36/36 retained; zero title/title or title/role overlaps. Three outgoing and one incoming route highlighted when selecting the three-way rose node. Clicking the node group/label and keyboard Enter changed or revisited the correct song. Piano loading state returned normally. No browser warnings or errors.
- Actual DOM viewport dimensions, independent of requested emulation sizes: 1280×900, 768×1024, 390×844. Answer-input widths: 303, 658.7, 312.3 CSS pixels respectively; action widths match; input/action vertical gap is about 10 pixels. No document horizontal overflow. An additional actual 640×853 check also passed (562.3px input).
- Mobile: map defaults to readable enlargement, full-map toggle works, horizontal panning changed scrollLeft from 995.5 to 1222, and keyboard revisit re-centered the selected node. Temporary viewport override reset afterwards.

## Visual proof

Files are in the session's visualization folder, under `echoes/`:

- `rose-mobile-runtime.png`: isolated headless Chrome renders the actual live local page in a 390px iframe; dark theme, fresh progress, whole clue/input/help cluster and enlarged map. This avoids the headless Mac minimum-window-width limit.
- `rose-desktop-runtime.png`: isolated headless Chrome renders an exported, script-free IAB DOM with the full collection; original styles/assets and responsive layout retained. This verifies the artwork/labels in context, while the interaction evidence comes from IAB.
- `rose-geometry.json`: full DOM measurements.
- IAB screenshots (`rose-desktop-focus.png`, `rose-tablet-full.png`, `rose-mobile-overview.png`) exhibited scaled content with excess capture canvas after viewport changes. They are diagnostic only. No product CSS was changed to compensate for this capture issue. Independently rendered screenshots are the visual acceptance evidence.

Agent assessment: interaction and line-clearance changes accepted; abstract flower art direction is ready for owner review. Browser evidence does not claim physical-device touch or frame-pacing validation.
