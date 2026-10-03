# Endless Echoes: mobile focus view

Baseline: `54534a9dfbc70ed1a3d8f503eb3521a8a209fdd4` on
`codex/reading-and-music-riddle`. A fresh fetch confirmed `origin/master`
matched that baseline. Existing untracked research and artwork were left alone.

## Behavior

- At widths up to 900 px, the clue is the primary page: current flower, song,
  walked incoming paths, outgoing neighbors, clue, answer, hint and reveal.
- Unknown neighbors expose only a question mark and a generic accessible name.
  Song names and artwork appear after discovery.
- Full map opens as a modal overview at its full extent; enlargement and current
  node positioning remain available. Selecting a discovered node or the bonus
  returns to the clue. Escape restores focus to the map button.
- Clicking the current flower replays its existing simultaneous piano chord.
- Desktop retains the original two-column clue and network layout.

## Browser evidence

Codex in-app browser, local server on port 5199. Browser viewport QA, not a real
iPhone or Safari test.

- PASS: 320 × 740 and 390 × 844, no document horizontal overflow; neighbor hit
  circle at 320 px measured 44.44 px.
- PASS: 768 × 1024 uses focused view; 1280 × 900 uses the desktop layout.
- PASS: resizing with overview open closes the modal, returns the map to the
  desktop grid and clears the scroll lock.
- PASS: physical-coordinate clicks, map → dead end → back, kept `scrollY=380`
  throughout. Native dialog focus and layout changes are handled explicitly.
  Locator clicks can scroll elements into view before dispatch, so those are not
  used as evidence for touch scroll stability.
- PASS: wrong answer feedback, hint, correct answer, back, and keyboard Enter on
  a discovered neighbor. Fresh trail displayed three generic unknown neighbors;
  discovering a song changed progress from 1 to 2 without leaking other names.
- PASS: full map enlargement permits panning; Escape closes it; bonus selection
  returns to its clue. Flower replay did not produce console errors.
- QA origin `127.0.0.1` progress was backed up before a fresh-trail test and
  restored afterward. The user's `localhost` discoveries were preserved.

Screenshots are in the task's local artifact directory under `echoes/`:
`focus-mobile-final.png`, `focus-mobile-overview-final.png`, `focus-320.png`,
and `focus-desktop-final.png`.

## Source and generated outputs

- `make generate` completed. Latest clue markup was regenerated after its final
  source change; TypeScript was rebuilt after interaction refinements.
- `make check-all` passed: all 20 TypeScript outputs current, generated pages and
  site checks current, 79 Python tests passed. Repeated after final UI changes.
- Shared JavaScript cache version advanced from `20261003d` to `20261003e`;
  the 145 other generated-page/template changes were verified to contain only
  that version update.
- RSS diffs contained only `lastBuildDate`; original feeds were restored after
  comparing the remaining bytes.
- Song data, graph routes, flower selections, chords and samples are unchanged.
