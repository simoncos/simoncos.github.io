**Product Design QA - Editorial Route Journal Homepage**

source visual truth path: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_05fdf17970bf6c67016a3e662189d88199838e5bfd176a2ca7.png`
implementation screenshot path: `/Users/simoncbot/Documents/simoncos.github.io/docs/product-design-audit-2026-06-25/verification/07-home-route-desktop-full-en.png`
mobile screenshot path: `/Users/simoncbot/Documents/simoncos.github.io/docs/product-design-audit-2026-06-25/verification/06-home-route-mobile-zh.png`
viewport: desktop 1440 x 2600, mobile 390 x 1400
state: local static homepage at `http://127.0.0.1:5199/index.html`, light theme, English desktop and Chinese mobile
full-view comparison evidence: `/Users/simoncbot/Documents/simoncos.github.io/docs/product-design-audit-2026-06-25/verification/08-route-journal-comparison.png`
focused region comparison evidence: not separately cropped; the full-view board renders the above-the-fold route map, reading paths, dispatch table, field note, and bottom links at sufficient size for this pass.

**Findings**

- No actionable P0/P1/P2 findings remain.
  Location: Home desktop and mobile.
  Evidence: the implementation preserves the selected Editorial Route Journal concept: compact publication chrome, large editorial lead, route-based featured nodes, reading lanes, dispatch table, and field-note side rail. Desktop and mobile captures both report `scrollWidth` equal to viewport width.
  Impact: the local homepage is usable for review at `5199` and no core layout or responsiveness issue blocks handoff.
  Fix: none required before handoff.

**Required Fidelity Surfaces**

- Fonts and typography: passed. The implementation uses the existing site sans for shell/navigation and a second serif stack for editorial headings, matching the source direction more closely after the QA patch.
- Spacing and layout rhythm: passed. The route map, reading paths, dispatch table, and bottom links follow the source hierarchy. The implementation is slightly more compact than the mock but retains the intended editorial-route rhythm.
- Colors and visual tokens: passed. The warm paper base, ink text, teal/cobalt/forest/rust accents, and low-contrast route texture are represented without reverting to the previous dark panel grid.
- Image quality and asset fidelity: passed. Visible feature media uses real site assets: Sleep Toolkit cover, HV analysis graphic, system architecture image, and hiking preview. No visible placeholder boxes are left.
- Copy and content: passed. Required homepage content, bilingual state, feature entries, reading paths, and latest dispatches are present.

**Patches Made Since Previous QA Pass**

- Reduced the route-journal desktop brand weight so the first viewport is closer to the source mock.
- Added a serif editorial type layer for hero, reading, dispatch, and field-note headings.
- Fixed mobile route-heading wrapping and confirmed mobile `scrollWidth` remains 390px.

**Follow-up Polish**

- P3: A later iteration could place the nav on the same horizontal line as the brand, as in the mock, if we want an even tighter masthead.
- P3: The dispatch table could gain a more deliberate date/action column treatment after reviewing real content density.

final result: passed

**Latest Visual QA Follow-up - 2026-06-26**

The previous `final result: passed` applies to the first Editorial Route Journal build captured in the comparison board above.

After user review, the layout was judged too visually messy. A targeted CSS tuning pass was applied to replace the scattered absolute-positioned route-node map with a bounded desktop grid, reduce foreground route decoration, standardize feature card media, and reset mobile feature cards to a true single-column stack.

Follow-up evidence note: after-fix Chrome screenshots could not be captured in this turn because escalated local Chrome rendering hit the current usage limit. See `/Users/simoncbot/Documents/simoncos.github.io/docs/product-design-audit-2026-06-25/visual-qa-2026-06-26/acceptance.md`.

latest visual qa result: targeted tuning applied; after-screenshot verification pending
