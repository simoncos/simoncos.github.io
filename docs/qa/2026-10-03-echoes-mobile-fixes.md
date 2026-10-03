# Endless Echoes: phone and loading fixes

Baseline: `5039424` (`origin/master`). Six fixes the site QA session asked for after its pass over the live page on a phone and a
desktop, made on their own branch, apart from the audio batch. The author agreed to ship them with the next site release.

## What changed

- **(a) Replay cue.** One unscoped rule in the stacked layout, `:root.js .echo-clue-flower span{position:absolute;top:100%}`, meant for
  the cue also caught the two language `<span>`s inside it. Each was placed against the cue's ~7 px box, so the Chinese words wrapped one
  character per line (5 lines, 60 px) over the 「1 / 36 首已点亮」 line, and the English words sat off the flower's axis. The rule now
  targets the cue itself (`.echo-clue-flower>.echo-replay-cue`: absolute, centred, `white-space:nowrap`).
- **(b) Tap targets.** On a touch device or a narrow window the page's own links (the three source links) and the new tip's close mark get a
  44 px touch area from a `::after` box. The links look the same; where they wrap, their rows are 26 px apart (they were 14) so neighbouring areas cannot overlap.
- **(c) Desktop cold-load layout shift.** `.echo-main` and `.echo-hero-art` had `margin:0 auto` and no width. Auto side margins make a flex or
  grid item shrink to its content, so the column was 1108 or 1194 px wide until the page had filled and then jumped to 1440, and the hero art
  had no height until its image arrived. Both now say `width:100%`.
- **(d) Piano script missing.** `echo-piano.js` is its own deferred script. When it did not arrive, `EchoPiano` was undefined and the riddle
  stopped at its first sound. The player is now made only if the script is there; otherwise the sound control reads 「音效不可用」 /
  "Sound unavailable" and is disabled, replay is off, and the rest of the game plays. Sample preloading is unchanged.
- **(e) A tip that a computer is better.** 「在电脑上体验更佳：线索和地图可以并排看。」 / "Best on a computer, where the clue and the map sit side by side."
  between the intro and the game, with a close mark. CSS decides where it shows: a touch device on the stacked layout (up to 900 px: a phone, a
  tablet held upright) or any window up to 650 px. Where the clue and the map already sit side by side (a tablet held wide, a desktop, a half-width
  desktop window) it stays off, because the sentence would be wrong there. It is in the first paint, so a first-time visitor sees nothing move
  when script runs. Script hides it for a player who closed it (`localStorage`, every access in try/catch) and arms the close mark, which stays
  invisible until then rather than being a dead control. It is a note, not a popup, and takes no space from the clue, cue, count or sticky bar.
- **(f) Map name.** The map SVG carried a `<title>` with both languages in one string. It is now an `aria-label` that `site.js` swaps with the
  page language (「36 首歌，47 条路径」 / "36 songs connected by 47 paths"), built from the data.

## Evidence

Real system Chrome (154) through Playwright. A "phone" is mobile emulation with touch (coarse pointer), not a device. Before-figures come from a
detached worktree at `5039424`, after-figures from the fixed tree, measured the same way. The Mac was shared and heavily loaded (load average often
above 100), so layout-shift figures are repeated loads, not single ones. The before-figures for (c) and (d) are from the first pass of the
checks (6 plain and 6 image-held loads; the piano runs); the other rows are from the final pass.

| | Before (`5039424`) | After |
|---|---|---|
| (a) cue; zh and en at 360, 375, 390, 412, 414, 768 px | zh: 5 lines in an 11.4 × 60 px box, 270 px² over the count line at 360–412 (266 at 414), still 5 lines at 768. en: one line, 19.8–19.9 px off the flower's axis at every width. 12 of 12 cases fail | one line, centred within 0.1 px, clear of the count line, in all 12 |
| (b) tap targets; zh and en | the six source links (three per language) are 18 px high to a touch | all six 44 px high; the tip's close mark 24 → 44 px in both languages |
| (c) desktop 1440 px, cold loads | CLS 0.211 in 2 of 6 loads (column 1108–1194 px wide and centred until the page had filled, then 1440). CLS 0.028 in 6 of 6 loads with the hero image held back 1.2 s (the game block moved when the art got its height) | CLS 0.000 in 20 of 20 loads (10 plain, 10 with the image held back); the column is 1440 px from its first frame in all 20 |
| (c) settled desktop layout | | 237 of 238 measurements (14 sizes from 700 to 1440 px, both languages, 17 elements) identical to before within 0.6 px. The one difference is a source link 4.8 px narrower at 1100 px (en); that element's width also moved by 2.8 px between two runs of the same tree |
| (d) `echo-piano.js` blocked | two `ReferenceError: EchoPiano is not defined` per language; the first answer is accepted but the riddle stays at 1 song; the sound control still reads "Sound on" | no errors; the riddle goes on (1 → 2 songs); the sound control reads 「音效不可用」 / "Sound unavailable", disabled, replay off |
| (d) control: only the samples blocked | 「重试音效」 / "Retry sound", the riddle goes on | the same |
| (e) tip | none | shown at 375 and 390 px touch in both languages (42 px high in zh, 56 px in en) between the intro and the game, clear of the sticky bar, flower and count. Not shown at 1440 or 1024 px with a mouse, in an 800 px mouse window, or on a wide tablet (1024 px touch); shown in a 600 px mouse window and on an upright tablet (768 px touch). A tap 9 px beside the × (inside its 44 px area) closes it, stores the choice and hands focus to the clue; it stays closed after a reload. With storage throwing on read and write it shows and closes for the visit with no page error; if the script never loads it still reads and shows no dead close mark. The first answer is accepted with the tip showing. Text and mark contrast 8.88:1 (need 4.5:1 and 3:1) |
| (f) map name | one `<title>` holding both languages | 「36 首歌，47 条路径」 / "36 songs connected by 47 paths" as `aria-label`; no `<title>`, no `aria-labelledby`; the desktop map is found by role and name (4 of 4 checks) |

`tests/test_music_riddle_page.py` (8 tests) pins the rules behind these: the map name, the tip in the first paint and where it shows, storage access in
try/catch, the piano guard, the two widths, the cue rule and the 44 px areas. All 8 pass on the fixed tree; none of them passes on `5039424`.
`make check-all` passes on the fixed tree: 87 tests, the TypeScript build, the shared shell, the generated pages and the blog outputs all current.
Of the tip's 16 browser checks, 15 passed in the full run; the 16th (600 px mouse window) was failed by a transient `net::ERR_NETWORK_CHANGED` console
error from the Mac's network, with the tip shown, and passed 3 of 3 when run alone.

## Not verified

- iOS Safari, WebKit and any real device. This Mac has no Xcode or simulator and Playwright here has Chromium only; the Oppo phone was not used
  for this round.
- The shared footer's RSS links (56 × 22 and 46 × 22 px) and the skip link (136 × 42 px) are below 44 px. They belong to the site-wide shell and are
  not changed here.
- The phone load still has one small layout shift, which this change neither causes nor fixes: the clue's button row (Back, Full map, sound) changes
  width as the sound control goes from "Sound on" (93 px) to "Loading piano…" (127 px) to the 44 px icon, once the script and the samples arrive,
  and the buttons beside it move. CLS in a first-time visitor's load at 390 px: 0.0026 (zh) and 0.0051 (en) with the tip, the same with the tip hidden
  by CSS; 0.0022–0.0026 (zh) and 0.0037 (en) on `5039424`, where the row passes through the same widths in the same order. The English figures differ by
  0.0014 between the trees for reasons not traced further. Not one of the six items; left as it is.
- A visitor who closed the tip before gets it in the first paint and then sees it go when script runs, so the page shifts once. With the script held back
  800 ms (to make that moment visible), 3 of 6 loads shifted by 0.048 (twice, zh) and 0.0598 (once, en); the other 3 only by the sound-control figure above.
  The worst, 0.0598, is under 0.1; the real figure depends on how soon the script arrives. A script in the `<head>` could hide the tip before first
  paint; it was not added, because the site keeps its scripts in files.

## Source and generated outputs

Source (edit these):

- `gallery/music/assets/endless-echoes.css`, `scripts/build_music_riddle.py`, `src/ts/music-riddle.ts`
- `tests/test_music_riddle_page.py` and this note

Built from them (regenerate with `make generate`, do not merge by hand):

- `src/js/music-riddle.js` (`npm run build:ts`) and `gallery/music/endless-echoes.html` (`scripts/build_music_riddle.py`, through `build_pages.py`)
- `data/site_shell.json`: `js_version` `20261003h` → `20261003t`, and the 145 other generated pages whose script URLs carry that token (the token is
  the only change in each, compared line by line). The Echoes stylesheet key in `build_music_riddle.py` is now `20261003q` (was `20261003o`).

Evidence is in `~/Documents/simoncos-echoes-design-review/mobile-fixes-qa/` (outside the repository; not tracked): its `README.md` says which run
each figure comes from, with one script per check and the raw results in `out/final/` and `out/earlier/`.
