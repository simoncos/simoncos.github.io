# Echoes: lyric quotations and curated simultaneous chords

Baseline: `5e9508e248300f7b72e44eeba97f038c2c8f220e`. Author requested large lyric quotations, then chose imagery / emotion for each flower and chord, explicitly requiring simultaneous tones.

## Data and art direction

- All 37 node IDs, original copy, routes, coordinates and historical evidence are byte-equivalent at the field level to the baseline. Only `clue_format` and `presentation` were added to song entries.
- 37 explicit flower choices and piano voicings, each with a reason in `data/music-riddle.json`. Reordering nodes does not change their art or sound.
- Existing four generated flower assets and seven Vocal Coach YDP root samples are reused. No new image or audio downloads were added to initial page load.
- Start / rewind share Csus2. Ending resolves to C; G7 at the preceding “完” makes that path a cadence. Hidden epilogue responds higher in the register. These are newly designed UI chords, not transcriptions of song keys.
- `clue_format: quote` for 天下无双, 明年今日 and 今日. 绵绵 retains its separate quote plus ordinary branch instruction. Other clues are prose / paraphrases, not promoted to quotations based only on length or poetic wording.
- 今日 intentionally retains the owner's supplied “就像圈中圈” wording; the released lyric source says “像处圈中圈”. Formatting does not silently rewrite the author's clue.

Reference checks for quotation treatment: [天下无双, JOOX](https://www.joox.com/hk/single/dtV7Vl5UvK9oDRC3YsT0Tw==), [明年今日, official music video](https://www.youtube.com/watch?v=8NJVNkzhJM4), [今日, JOOX](https://www.joox.com/my-zh_cn/single/cNy5ofQn85BMVRjUkSv56Q%3D%3D).

## Runtime evidence

- Node audio test executes all 37 chords: same `AudioContext` start time for every tone, normalized gain, sample cache reuse, loading cancellation, failed-sample retry, no partial chord on cold load, and bounded active harmony during rapid navigation.
- Actual browser audio observation: 天下无双's four sources started at 0.020666666666666667 together; two subsequent replays started in four-source groups at 316.45799999999997 and 317.21. No sequencing offsets.
- Muted click: observed source-start count stayed 32 → 32. Unmute and same-node selection each played the full chord.
- Audio observation hook removed by page reload; viewport override reset. QA is browser / automated timing evidence, not a claim of owner listening acceptance.

## Visual checks

Local Chromium: 1280×900, 390×844, 320×740. Chinese quote styling is 22 px desktop / 21 px mobile, with deliberate phrase breaks. All four quoted nodes inspected. Regular prose restored on switching to 十年; no duplicate quote / body, no horizontal overflow. English quote translated and marked `lang=en`, with normal wrapping. Dialog close / reopen, saved full collection and node replay work.

Screenshots under `/Users/simoncbot/.codex/visualizations/2026/10/01/01a0f573-b521-7b32-b54a-d7ec07582c36/echoes/`:

- `quote-chord-desktop.png`
- `quote-chord-mobile-matchless.png`
- `quote-chord-mobile-long.png`
- `quote-chord-mobile-320.png`

## Checks

- `make generate`: passed; RSS content unchanged, timestamp-only regeneration restored.
- Focused music-riddle suite: 21 passed.
- First full run caught an XML-only test parser rejecting valid HTML boolean attributes in generated SVG; test repaired to use HTMLParser. Focused rerun passed.
- Final `make check-all`: passed, 79 tests plus generated-file, TypeScript, site and shell checks.
- `git diff --check`: passed.
- 145 other generated files change only the JavaScript cache key, `20261003c` → `20261003d`.
