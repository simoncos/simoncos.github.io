# Endless Echoes — portrait interaction QA

Baseline: `82f617be98ebc2e69df3d03d7e377217dd9dc7dd`.

## Changes

- Compact layouts keep the map and a sticky selected-song card together. The existing clue, input, hint and reveal controls move into a native modal sheet at widths up to 900px; desktop keeps its two columns.
- Selecting or replaying a discovered node does not scroll the page, center the map or transfer focus. Explicit locate/zoom controls center within the visible area above the card.
- The sheet supports Escape, backdrop dismissal, a sticky close control, keyboard focus restoration and the visual viewport when an on-screen keyboard reduces available height.
- The page has a fixed dark palette, including before JavaScript. Its theme toggle is omitted; saved preferences still apply elsewhere.
- Removed the redundant introduction CTA and shortened the mobile introduction.

## Browser evidence

IAB, served from the existing port 5199. Existing collections were preserved.

| Viewport | Result |
| --- | --- |
| 390 × 844 | Map → song card → clue sheet; no horizontal document overflow; input 340px wide, submit separated by 10px. |
| 375 × 600 | Long clue and expanded reveal scroll within the sheet. Close control stays visible; reveal choice remains reachable. |
| 768 × 1024 | 600px sheet, 550px input; no horizontal overflow. |
| 1280 × 900 | Original two-column layout, 303px input. Resizing an open sheet to desktop closes it, restores the clue column and releases the scroll lock. |

Final pointer-click measurement, red rose → salon → red rose: page `scrollY=64`, map `scrollLeft=724`, map `scrollTop=334.5` before and after. Selection changed and sound remained enabled. Opening the sheet also preserved page position. Locator click automation can scroll a target into view itself; the no-jump check used native pointer coordinates and DOM measurements.

Other exercised flows: wrong answer, hint, correct answer, reveal-and-follow, Escape, reopening from the collection, return focus to the current collection button, Chinese/English switching. No captured console errors or warnings. Home remained light after visiting the fixed-dark riddle page.

Screenshots in `/Users/simoncbot/.codex/visualizations/2026/10/01/01a0f573-b521-7b32-b54a-d7ec07582c36/echoes/`:

- `portrait-map-390.png`
- `portrait-clue-390.png`
- `portrait-clue-768.png`
- `portrait-desktop-1280.png`

Used viewport captures for final evidence: the IAB full-page capture displaces the fixed navigation. The short viewport checks layout constraints; a physical phone keyboard / Safari device was not tested.

## Repository checks

- `make generate`: passed. Feed changes were verified to contain only `lastBuildDate`, then restored to the baseline bytes.
- Final `make check-all`: passed, 74 tests.
- `git diff --check`: passed.
- All 145 other changed HTML files differ only by the shared JavaScript cache key. Song data, connections, generated flower assets and sampled piano audio are unchanged.

Visual review: agent reviewed; owner acceptance remains separate.
