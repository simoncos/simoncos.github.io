# Real network presentation and Work research classification

## Change

- Replaced the numeric Work cover and page hero with the real anonymous
  Net50k network. Network exploration now comes before profile statistics.
- Added one Canvas2D graph with Net50k / Net10k selection, reciprocal / all /
  group views, complete directed neighbourhoods, numeric lookup, keyboard
  stepping, zoom and reset. Group counts have a directed matrix alternative.
- Moved the ten-year sleep study into Research. Work now has Projects, Talks,
  Research and Music. Old `#visual` links open Research; sleep page URLs stay.

## Data

- Verified archive fingerprint is unchanged. Preparation reads SQLite only.
- Net50k: 375 nodes, 27,324 directed links, 6,414 reciprocal pairs.
- Net10k: 1,896 nodes, 231,416 directed links, 35,625 reciprocal pairs.
  Its node count is one higher than the original 1,895; this difference is
  stated on the page. Historical tables preserve the original values.
- Nodes contain only normalized coordinates, structural group and in/out
  degrees. Edge endpoints use numeric indices. Original account IDs and URLs
  are never exported. Only names already printed in the original ranking
  lists label uniquely matched profiles; all other nodes stay anonymous.
- Colours identify computed structural groups. Neither colours nor layout
  distances establish real-world social communities or social distance.
- Overview ink samples at most 12,000 actual lines. Selected neighbourhoods
  preserve every incoming and outgoing link. Group matrices conserve edges.

## Verification

- Network asset tests check unique, valid directed edges; every in/out degree;
  reciprocal-pair counts; group memberships and each matrix cell; anonymous
  numeric geometry and bounded, finite coordinates.
- TypeScript compilation, generated-page freshness, site checks and all 56
  tests passed. The final diff has no whitespace errors.
- Browser inspection: 1440 px desktop Chinese/light; 390 px mobile Chinese;
  320 px mobile English/dark. No document overflow in these states.
- Lookup from group view opens the user's full directed neighbourhood and
  returns focus / mobile scroll to the graph. Small-group labels move outside
  their circles on mobile. Numeric counts remain in HTML.
- Arrow-key selection, URL persistence, reload and Back restore the node,
  cohort and graph view. Invalid parameters safely default.
- Direct graph clicking selected anonymous node 228 and updated its complete
  neighbour counts. Published-name selection opened Ma Boyong's node 3 and
  synchronized the ranking comparison; the ranking action opened Huang
  Jixin's node 4. The name selector also worked at 390 px without overflow
  and returned keyboard focus to the graph.
- Without JavaScript: both real SVG networks, all five profiles and both
  ranking cohorts remain readable; enhancement controls are hidden.
- With the interactive JSON request deliberately blocked: the real SVG
  remains visible, an explanatory state appears, and inert controls hide.
  The block and temporary browser settings were removed after the check.
- Research contains Hermes, sleep and Zhihu. Keyboard selection reveals the
  network cover; the retired Visual essays fragment resolves to Research.

Screenshots and deployment receipts are in the task's local visualization
folder. These are browser checks, not physical phone testing or owner aesthetic
acceptance. No claim about newer inferential research was added.
