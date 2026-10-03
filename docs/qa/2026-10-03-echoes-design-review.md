# Endless Echoes: visual and interaction design review (spike)

Baseline: `fb8a0e5` (branch `codex/reading-and-music-riddle`). The work was done on
`claude/echoes-design-spike`, in its own worktree, so the author's uncommitted files
in the main checkout (design doc, research notes, image candidates, the design ZIP)
were not touched. It was released on 2026-10-03, rebased onto the then-current `master`;
"Release notes" below says what the release changed beyond the spike itself.

The author handed the open taste calls over on 2026-10-03; they are settled under
"Decisions taken" below.

The measurements came from real Chrome driven by Playwright against the generated
page (1440x900, 1180x760, 820x1180, iPhone 13 Pro 390x664, iPhone SE 320). Layout
numbers are geometry read from the DOM, not estimates from screenshots.

## What was wrong (measured on the baseline)

| Finding | Baseline | Why it matters |
| --- | --- | --- |
| The first thing under the hero is a header, not the game | Hero 400 px tall, then an 87 px bar that repeats the page title and holds one button (sound), then the clue and map panels | The flower (56 px) is the only expressive element in the clue column, and it sits below that bar |
| Walked and unwalked paths look the same | Both `rgb(183,175,188)`; opacity .64 vs .5; 1.19 vs 1.07 px at 1440 (contrast 4.13 vs 3.03, i.e. 1.36x) | "Where have I been" is the one piece of progress the map should show, and it is invisible |
| The undiscovered map is numbered grey noise | 34 numerals at 10.7 px on screen at 1440 (fresh state), 47 edges at equal weight, 25 crossings (max 4 on one edge, 7 edges with 3+) | Numbers suggest an order the design says does not exist ("map numbers must not imply a linear level order"). Crossing count is modest; the noise is equal visual weight, not tangles |
| Text under 12 px on screen | 50 text runs at 1440 (16 at 11 px chrome, 34 at 10.7 px numerals); map labels 8.7 px at 1180; 4.4 px in the mobile full-map dialog; mobile focus-view captions about 8.9 px | Legibility first |
| Clue has no typographic voice | 15 px UI sans for a riddle; 30 px heading; 56 px flower | The clue is the puzzle and the flower is its mood; they get UI-sized type and a 56 px flower |
| The primary button out-shouts the flower | Solid accent fill, 303x52 = 15.8k px2 against a 56x56 = 3.1k px2 flower (5x), contrast 8.83:1 against the panel, while the input is still empty | Colour belongs to the flowers |
| Desktop keyboard focus is lost after a correct answer | Focus moves to the `h2[tabindex=-1]`; pressing `a` leaves the field empty (verified with an ASCII key) | Players answer several songs in a row; the first keystrokes are swallowed |
| Reward on mobile is mute | The flower stage that changes on success is above the fold once the player has scrolled to the input; the only change in view is a 13 px "Found: ..." line | The moment of discovery should happen where the eyes are |

## Direction

One thread of light, one flower. Only flowers and the walked thread carry colour; the
rest of the interface stays charcoal. Reward appears where the eyes already are (the
answer field), and the map grows as the player does: fog, buds, blooms, light where
they have been, a distant beacon for the ending.

Checked against the five questions at the end of `docs/ENDLESS_ECHOES_DESIGN.md`:

1. Musical subject at a glance: unchanged hero; the keys of the hero's staircase now
   reappear in the game as a chord keyboard.
2. Clue and direction legible: walked vs unwalked contrast 1.36x -> 5.5x; per-state
   arrowheads; text runs under 12 px at 1440 from 50 to 1 (fresh state).
3. Phone stays on the current song: the reward chip sits under the button; focus view
   captions and labels enlarged; sound control is an icon; the overview drops text it
   cannot render legibly.
4. Sound timely and meaningful: rings and key strikes start with the chord and fade over
   1.5-1.9 s (the sample stops at 1.42 s); the keyboard shows the actual authored chord.
   No audio changes.
5. Decisions explainable from data: keyboard uses `presentation.chord.midi`, auras use
   the flower family; nothing is derived from array order; no new data fields.

## What the spike changes

Map (`music-riddle.ts`, `build_music_riddle.py`, `endless-echoes.css`)

- Undiscovered songs are buds (dot + dashed ring) instead of numbered flowers; ghost
  paths drop to opacity .3 (was .5).
- Walked paths are gold with a soft underlay and gold arrowheads; incoming paths blue;
  next paths peach dashed; arrow markers are per state.
- Each found song gathers a soft aura in its flower colour (screen blend); one lantern
  follows the current song; the ending shows a slow beacon. Aura strength steps down in
  four tiers as more songs are lit (1, .85, .72, .6 at 22, 27 and 32 songs) so the
  finished map stays clean and a new song does not re-fade every older aura.
- Legend updated ("Your trail"). Mobile full-map dialog hides labels it renders at
  about 4 px; enlarging shows them at about 15 px.

Answer moment

- A chip under the button shows the found song's flower (blooming), its title and the
  running count: `Found: <title> · 8 / 36`. Revisits show no count.
- The clue flower blooms and rings with the chord; the map node rings too; the new
  song's colour tints its clue column.
- A wrong answer nudges the field sideways (no shake under reduced motion) and counts
  misses; after two misses on one song the hint icon glints three times.
- Desktop (fine pointer): focus stays in the field after a correct answer and the new
  clue is announced through a quiet live region. Touch: focus still goes to the
  heading so the on-screen keyboard closes, and 0.5 s later the page glides up so the
  heading sits just under the sticky bar (instant under reduced motion; skipped when
  the heading is already in the upper half, or when a touch or wheel arrives in that
  half second, because the player is then steering; a touch or wheel during the glide
  stops it). Found on a real phone: without the glide the title in the
  sticky bar changed but the new clue stayed above the fold. The heading no longer
  draws a focus box.
- The answer field gains `enterkeyhint="go"`, `autocapitalize="off"` and `spellcheck="false"`:
  the keyboard is asked not to capitalise or spell-check a song title, and its action key
  becomes a "go" key that submits the form. What reached the phone's keyboard is under "Real
  device"; what the keyboard then did with it was not looked at.
- The chord keyboard (C3-C5, the range stated in `docs/MUSIC_RIDDLE_DATA.md`): current chord lit
  as softly glowing keys in the song's colour and striking with the sound; a thin warm
  edge on keys that other found songs have used.

Clue panel

- Serif voice for clue and heading (`--echo-voice`, falls back to the UI font), 17 px /
  1.95 clue, 36 px heading, 84 px flower; tonal button that turns solid once there is
  text; help rows without a box; toolbar removed (sound moved into the clue panel's
  header row); empty feedback line collapses when the form is hidden.

Phone

- Focus-view captions 13 units (11.6 px on screen at 390, was 8.9) and node labels 14 units
  (12.4 px, was 11.6); the sound control is a 44x44 icon except while loading, failed or
  unavailable; the flower stage has a lantern in the song's colour.

Hit targets: `Back` 43.5x44 -> 44x44, `Start a fresh trail` 105x30 -> 92x44, breadcrumb
link 101x14 -> 101x44 (hero position and height unchanged: 120 / 400.7 px at 1440). Still
under 44 px: three 18 px inline text links in the reference paragraph, and in the
all-found state the revisit chips at 42.9 px; neither was touched.

## Numbers, before -> after (1440 unless stated)

| | Before | After |
| --- | --- | --- |
| Walked path contrast / width | 4.13:1 / 1.19 px, same hue as ghost | 10.43:1 / 1.55 px, gold + underlay |
| Ghost path contrast | 3.03:1 | 1.89:1 (deliberate; see decisions taken) |
| Text runs under 12 px (fresh / mid / all found) | 50 / 50 / 51 | 1 / 6 / 36 (map labels at 11.9 px) |
| Game height (1440 / 1180) | 997 / 822 px | 912 / 835 px |
| Button when the field is empty | solid, 8.83:1 fill, label 8.61:1 | tonal, fill 1.29:1, label 6.85:1, border 3.7:1 against the panel |
| Clue / heading / flower | 15 px sans / 30 px / 56 px | 17 px serif / 36 px / 84 px |
| Mobile sound control | 95x44 pill | 44x44 icon |
| First keystrokes after a correct answer (desktop) | lost | kept (`abc` typed -> `abc`) |

Not improved: map labels are 11.9 px at 1440 and 8.7 px at 1180 (unchanged). Fixing
that needs a larger canvas, hover/focus enlargement or the existing zoom, not paint. At
320 px the focus-view captions are 9.0 px (was 6.9) and labels 9.7 px (was 9.0): better,
still small. START / ENDING kind labels are 22 units (13.1 px at 1440, 9.6 px at 1180): the
`font:12px` in `.echo-node-kind` never applies, because `.echo-node:is(.is-start,.is-ending)
text{font-size:22px}` out-specifies it (baseline CSS, untouched).

## Verification

- `make check-all`: passed (20 TypeScript outputs current, generated pages current,
  79 Python tests).
- 72-case sweep (12 widths 320-1920 x EN/ZH x fresh/mid/all-found): no horizontal
  overflow, nothing escaping the game container, keyboard keys contained, no console
  errors, correct `lang`.
- Reduced motion: after a correct answer zero animations are running and no ring
  classes are set; the chip text still appears.
- Behaviour (Chrome, fine pointer): wrong answer sets the nudge, `aria-invalid` and no
  hint glint on the first miss; glint after the second; correct answer renders the chip
  with the found flower, the live region carries the next clue, focus stays in the
  field and typing continues. Touch profile: focus on the heading, live region empty,
  sound control 44x44.
- Glide (Chrome, iPhone 13 Pro and 360 px Android profiles, English and Chinese; touches here
  are dispatched `touchstart` events, the real ones are under "Real device"): the heading ends
  12-15 px clear of the sticky bar (English and Chinese 15.4 and 15.2 in every run; the 360 px
  Android profile 15.4, 13.4 and 12.4 in three runs, the last one against the deployed site);
  reduced motion is one jump instead of an eased scroll; a touch 120 ms after the answer leaves
  the page where it was (700 -> 700); a touch during the glide ends it: in three runs the page
  moved in one more frame after the touch (by 111, 81 and 142 px, 9-37 ms later) and then
  stayed, ending 96-238 px short of the heading's resting position (scroll 299); on desktop the
  page does not scroll after the answer (167 before and after) and focus stays in the field.
- Freeze-frame captures (WAAPI paused and stepped) of the answer moment on desktop and
  mobile; screenshots of fresh/mid/all-found, dead end, quote-format clue (ZH) and the
  epilogue.

## Real device

OPPO Find X8 Ultra (Android 16, ColorOS 16), Chrome 154, 360 x 680 CSS px at device pixel
ratio 3. The page was served from the Mac over USB (`adb reverse`) and Chrome was driven
through the DevTools protocol; taps, swipes, the Back key and the keyboard's action key were real
OS input sent with `adb input`. adb cannot type Chinese, so Chinese answers were inserted through
the DevTools text path. The phone's default browser is Edge; it was not run. Sound was off except
in the sound check. Every run below was taken on the final build (stylesheet key `20261003o`).

| Check | Result |
| --- | --- |
| Seven states (fresh, mid, all found, dead end, quote clue in Chinese, fresh in Chinese, epilogue) | no horizontal overflow, nothing outside the game container, chord keyboard 290 x 36 px with every black key inside it, no console errors |
| Text under 12 px at 360 wide | kicker and the `n / 36` counter 10.0 px, FROM / ONWARD / END OF PATH captions 10.5 px, one 11 px label (`Sound off`) |
| Targets under 44 px | only the three inline reference links (17 px high), as on the baseline |
| Fonts actually used | Latin clue in Noto Serif, Chinese in Noto Sans SC: Songti SC, Noto Serif SC and Source Han Serif are not on this phone, so the serif voice reaches English text only |
| Tap the field | keyboard opens over the page (visual viewport 330 of 680 px); field and `Check answer` stay visible above it |
| Wrong answer (keyboard Enter) | field keeps focus and the keyboard, `aria-invalid`, message shown |
| Correct answer (tap the button, or tap the keyboard's action key) | keyboard closes, focus on the heading, chip `Found: 多少 · 2 / 36`, then the glide below |
| Hint and reveal, full map, a FROM node, sound button (real taps) | hint and reveal open one at a time; the full map opens full screen, and closing it returns focus to the button that opened it; tapping the FROM node moves to that song; sound control 44 x 44 |
| Android Back key with the full map open | closes the dialog; same URL, same history length, same scroll; focus back on the `Full map` button |
| Sound on (three runs) | one AudioContext (interactive, running, 48 kHz, base latency 3 ms, output latency 32-40 ms); the four chord notes are scheduled 2.5-5 ms after the submit with a 10 ms lead; seven samples decoded in 17-49 ms each; Android lists an active Chrome media player in every poll; no errors. The speaker's media volume was 0 |
| Idle, fresh state | no animation and no compositor draw at 2-5 s or at 20-23 s after load |
| Idle, full map open | the ending beacon runs at first (182 compositor draws in 3 s, one style recalculation, no layout) and rests by 20-23 s (none) |

The glide, from a player who has scrolled the field to 45% of the screen (page scroll in CSS px;
heading and sticky-bar bottom in px from the top of the screen; clue rows in px against the 680 px
screen):

| Case | Page scroll | Heading top / bar bottom | Glide and clue |
| --- | --- | --- | --- |
| English, tap `Check answer` | 701 -> 299 | 144.1 / 129 | 537 -> 1091 ms, 51 frames, 13 px at most per frame; clue 452-539 |
| English, tap the keyboard's action key | 701 -> 299 | 144.1 / 129 | 534 -> 1088 ms |
| Longest English clue (275 characters) | 643 -> 299 | 144.1 / 129 | 531 -> 1051 ms; clue 452-686, the last 6 px of its line box under the edge |
| Longest Chinese clue (106 characters) | 571 -> 284 | 143.9 / 129 | 545 -> 1010 ms; clue 451-627 |
| Reduced motion (emulated on the tab) | 701 -> 299 | 144.1 / 129 | one 402 px jump at 509 ms |
| Real swipe 280 ms after the answer (inside the 500 ms window) | 701 -> 865 | scrolled off above | no glide; the page follows the finger (+163) |
| Real swipe 683 ms after the answer (glide running) | 701 -> 797 | scrolled off above | the glide stops; the page follows the finger |
| Swipe up from the flower, then down from the clue, after the glide | 299 -> 463 -> 301 | 142.4 / 129 | the page scrolls normally, from the flower image too |

Before the glide learned to stop on a touch, the same swipe at 688 ms was swallowed: the page still
ended at the heading (net -388 px; the swipe added 14 of its 150 px).

What the phone found
- After a correct answer the new clue was above the fold: the title in the sticky bar changed, the
  clue did not appear. Fixed by the glide.
- The first version of the glide parked the heading 19 px under the sticky bar. Fixed with a compact-layout
  `scroll-margin-top` on the heading; it now sits 15 px clear.
- A running glide swallowed a swipe. A touch or wheel now ends it, and the page follows the finger.
- `enterkeyhint="go"` reaches the keyboard as `IME_ACTION_GO` (`imeOptions=0x12000002`), and tapping the
  key submits the form. This keyboard labels that key 确定, so the hint changes the key's role, not its wording.
  The field's `inputType` is `0x880a1`: text, web edit field, auto-correct and no-suggestions flags, and no
  capitalisation flag. Only the flags were read: the answers were put in through DevTools or `adb input text`,
  never typed on the keyboard, so its capitalisation and suggestions were not observed.
- Unchanged from the baseline: after a wrong answer the red field and the message stay while the player edits,
  until the next submit (nothing listens to `input`). Not touched.
- Chinese clues render in a sans on this phone (see Fonts above). Not changed; a serif for Chinese would need a
  web font.
- Test-harness note: a DevTools synthetic scroll gesture stops scrolling after real OS taps (a bare page: 238 px
  before, 0 px after two taps), which first looked like a page defect after answering. Real swipes scroll fine,
  so the scroll rows above use `adb input swipe`.

## Cost

On the Mac, wall-clock frame timing could not be trusted: other applications kept its load average
between 30 and 250 during the session. The figures in this first table are Chrome-trace thread CPU
time and deterministic counts at 1440x900, device pixel ratio 2, answering the first clue correctly.
They were taken before the taste pass, which changed colour values, the strike flash
brightness and dropped the key `background` transition, and added no selector, animation or
element; the pass was not re-measured.

| Window | Baseline | Spike |
| --- | --- | --- |
| Main-thread render work in the 3.2 s after the answer, median of interleaved runs (5, then 8) | 142 ms, 237 ms | 268 ms, 414 ms |
| Style recalc in the same window (one run each; element counts do not depend on load) | 117 elements, 26 recalcs, 17 ms | 1,140 elements, 59 recalcs, 62 ms |
| Compositor draws in 3 s at idle, ending still undiscovered | 0 | 122 with the endless beacon, 2 with it off |

Run-to-run spread inside one variant (133-303 ms baseline, 178-559 ms spike) is larger than any
single feature's effect. Removing the keyboard (409 vs 414 ms), its strike animation, its
transitions or chord shadows, the spotlight glide, the aura layer or the `@property`
transitions: none lowered the median by more than 5 ms. So the roughly 1.8x is not one culprit; it is
per-frame animation ticks spread over several new effects. Style invalidations in that window,
spike against baseline: key strike 92 vs under 7, petal bloom 75 vs 11, flower-ring
pseudo-elements 73 vs under 7, aura fade 70 vs under 7, SVG ring circles 68 vs 10.

The one continuous cost was the ending beacon: two infinite animations kept the compositor
drawing about 40 times a second while the player was idle (no main-thread cost). It now plays
three 5.5 s pulses and rests.

On the phone, where load does not interfere (OPPO Find X8 Ultra, Chrome 154, 360 px, sound off,
ten interleaved runs per variant on the final build, main-thread time from the DevTools
`Performance.getMetrics` over the same 3.2 s after the answer; medians, range in brackets). The
revised page's window includes the glide:

| Window | Baseline | Spike |
| --- | --- | --- |
| Main-thread CPU | 152 ms (138-156) | 295 ms (276-300) |
| of which style recalc | 11 ms, 37-39 recalcs | 74 ms, 120-176 recalcs |
| Script / layout | 25.3 / 4.3 ms | 25.4 / 5.0 ms |
| Animation frames in the window | 192 (191-193) | 192 (191-193); one run 255 |
| Frame interval, median / 95th percentile | 16.6 / 16.7 ms | 16.6 / 16.7 ms; that run 11.1 / 17.0 |
| Frames more than 1.5x the median interval | 2 (1-3) | 2 (1-3); that run 44 |
| Long animation frames, long tasks | none | none |

The ratio, 1.9x, is the Mac's 1.8x again. Style recalculation accounts for 62 ms of the extra 143 ms;
script and layout barely move. Cadence is unchanged: the same 192 frames, two of them late by one
refresh interval. In the one odd run the phone raised its refresh rate during the glide (11.1 ms
frames), which is why its frame count is higher; the 44 "late" frames are the changes of rate.
The spread within a variant on this phone is 8-13% of its median, so the 1.9x is not noise.

Not measured: Safari, battery, a slower phone. If a slower phone shows jank in the answer moment,
the dials, cheapest first: the key strike (`echo-key-strike`), the aura fade (`.echo-aura`
transition), the second ring (`.echo-spark-2`).

## Not verified

- No iPhone or Safari run, and no run in Edge (the Android phone's default browser) or any in-app
  browser. The only real device is the OPPO phone in "Real device", in Chrome.
- Landscape and a larger system font size were not tried on the phone: both need a device setting
  changed, which was out of scope.
- No screen reader run. The live-region and focus changes are checked at DOM level.
- Nobody listened to the sound; the visuals start with the chord because they are
  triggered by the same call, not because anyone judged the timing by ear. On the phone the
  pipeline was checked (see "Real device") with the speaker's media volume at 0.
- No battery or thermal measurement, and nothing about load time: the phone read the page and
  the piano samples from the Mac over USB. Only the Google Fonts request used the phone's own
  connection (Geist loaded); what a visitor without access to Google Fonts sees was not tested.
- `@property` (Safari 16.4+, Firefox 128+) is the one new feature without older-browser
  support; `color-mix` was already in the page. Without it the clue tint and the flower
  lantern change instantly instead of gliding.

## Decisions taken

The author delegated these on 2026-10-03; each was settled by looking at variants side
by side (Chrome, 1440, device pixel ratio 2-3), not by the numbers alone.

1. Serif voice for clue and heading: kept. One token, `--echo-voice`.
2. Ghost paths at opacity .3. They are the "complete network" the design says gives
   direction, so they stay visible but below the walked, next and incoming paths; the
   contrast is in the table above and sits under the 3:1 guideline for meaningful
   graphics on purpose. Tried .26, .3 and .34 on the fresh map: .26 is faint on the dark
   ground, .34 starts to read as a net. One rule, `.echo-edge`.
3. Buds instead of numerals on undiscovered nodes: kept. Consistent with "map numbers
   must not imply a linear level order"; the `n / 36` counter stays.
4. Toolbar removed: kept. It repeated the page title and held only the sound button,
   which now sits in the clue panel's header row.
5. Tonal button until text is typed: kept. Keeps the two-row mobile layout.
6. Chord keyboard: kept, and turned down one notch. A lit key mixes the flower colour
   into the key at 26% to 60% (was 46% to 78%) with a 42% glow (was 55%); black keys 50%
   (was 64%); the strike flash is brightness 1.5 with saturation 1.1 (was 1.75 and 1.2),
   because 1.75 bleached ivory and blue towards cream and pale lavender and 1.35 hardly
   differed from rest. A further notch (16% to 46%) turned gold and orange muddy and was
   rejected. The keys no longer transition `background`; it could not interpolate
   between a flat colour and a gradient, and on leaving a chord it faded the key up from
   transparent. Uses only authored chords; remove by dropping `keyboard_html()` and the
   `renderKeys` call.
7. Desktop focus stays in the field after a correct answer: kept (behaviour change; touch
   unchanged).
8. Screen-blended auras and the lantern: kept. The look depends on them; cost is covered
   above.

## Release notes

- The generated page no longer contains `[data-song-number]`, which the previous
  script updated unconditionally, so a returning visitor with the old cached script and
  the new page would hit a `TypeError` in `render()`. The release therefore bumped the
  shared `js_version` in `data/site_shell.json` (`20261003g` -> `20261003h`) and regenerated
  the site: 146 HTML files changed (144 pages and the 2 blog templates), and every one of
  those changes is the `?v=` token on a script URL (437 lines, compared line by line). The page stylesheet key, `20261003o`, is set in
  `build_music_riddle.py`. The feeds were regenerated too, but only their `lastBuildDate`
  moved, so they were left as they were.
- Aura gradients read the page's `--bloom-*` tokens, so a palette change needs no
  second edit; the arrowheads keep literal colours, as in the baseline.
- `docs/ENDLESS_ECHOES_DESIGN.md` is not in git yet (it is the author's uncommitted
  file), so it was not part of this release. It still needs: the walked/ghost/next path
  styles, buds instead of numerals, the chord keyboard, the focus rule, and the new
  answer-moment table row.

## Evidence

Scripts, screenshots, freeze-frames and raw JSON are in
`~/Documents/simoncos-echoes-design-review/` (outside the repository; not tracked).

- `final-run.sh` rebuilds the spike and re-runs the Mac side on it: the 72-case sweep,
  `verify-m3.cjs` (focus after a correct answer), `verify-glide.cjs`, contrast and size
  measures, tap targets, the map overview and screenshots. It expects two local servers, the
  main checkout on 8137 (baseline) and the worktree on 8138. Its output goes to
  `final-run-out.txt`; `make check-all` was run separately into `check-all-out.txt`.
  The Mac is shared. In the last run its load average was above 200 and one page load in the
  sweep timed out, which aborted the sweep (`final-run-out.txt` shows that abort). The sweep now
  retries a timed-out load and prints how many it retried, and the sweep and glide checks
  were then run again by hand: `sweep-out.txt` (72 runs, 0 problems, 0 retried) and
  `verify-glide-out.json`, which also records the page's movement frame by frame after a touch.
  The other outputs in `final-run-out.txt` are from that same final build.
- `device/` holds the phone side: `cdp.cjs` (DevTools helpers and the guarded `adb input`
  calls), one script per check (`d-states`, `d-ui`, `d-interact`, `d-glide`, `d-swipe`,
  `d-back`, `d-perf`, `d-audio`, `d-idle`), and the raw results next to them
  (`shots-*` folders, `perf-ab-final.json`, `audio-result.json`, `idle-final.txt`).
  The phone is shared: look at what is in front, and at pending installs, before running any
  of them.
