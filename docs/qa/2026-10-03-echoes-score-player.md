# Echoes: richer chords, path playback and the finale

The author asked for three things: play the path from the start to the current song as a phrase of chords (with the chord order adjusted so it sounds musical), play an arranged chord piece automatically when every song is lit, with the nodes brightening and dimming along with it, and richer chords than before. The same change carries the content fixes the author approved after a content review (below).

**The author listened to it on 2026-10-04 and judged it good (「挺好的」); no changes were asked for.** That was general listening: which pieces were played, and on what speakers or headphones, was not recorded. Every other audio claim below is numeric (timing, level, voice counts) or visual.

Baseline: the released redesign `e752a7b`. This work was not rebased on `origin/master` or on the phone and loading fixes (`docs/qa/2026-10-03-echoes-mobile-fixes.md`); see "Not done".

## What changed

- **Chord table.** All 37 chords re-chosen as 3–6 note voicings: 15 five-note, 20 four-note and the two three-note Csus2 (the start, and 倒带人生, which repeats the opening sound); 35 distinct names, were 29 and all four-note except those two. Chosen by a search over voice-leading cost between songs that follow each other, a roughness penalty and a limit on repeated colour; the start Csus2 and the ending C are fixed, and the G7 at 《完》 still resolves into the ending. Reasons rewritten in Chinese in `data/music-riddle.json`. The search tooling is outside the repo, in `~/Documents/simoncos-echoes-design-review/harmony/`.
- **`EchoPiano.Player.playScore`.** Plays a list of `{at, midi, hold, level, roll, release}` steps: per-chord dynamics, a low-to-high roll, one master bus with a compressor (so a cancelled piece fades as a whole and overlapping chords cannot clip), hooks timed to when the chord is *heard* (output latency subtracted), and a six-second look-ahead queue instead of creating every voice up front. Single-chord `play()` is unchanged.
- **`EchoScore`** (`src/ts/echo-score.ts`, pure). `route` = shortest route over the edges the player has actually walked; `pathSteps` = path phrasing; `finaleSteps` = the author's arrangement.
- **Path row** under the keyboard ("Play this path / 回响这条路"): a route of two songs or more, one flower bead per song, lit as each chord sounds, plus the sounding song's title. On a phone it sits under the answer feedback.
- **Finale.** `finale` in `data/music-riddle.json` (38 steps, about 46 s). Starts by itself 2.9 s after the last song is lit, if sound is on; a bar above the map replays and stops it. On a phone the full-network dialog opens for it. While it plays the page asks for a screen wake lock (`navigator.wakeLock`), so a phone's auto-lock does not cut the sound mid-phrase; the lock is released when the finale ends or is stopped, and nothing changes where the API is missing or the request is refused.
- **Content fixes** (approved by the author): English wording of eight clues and four hints; traditional-character spellings accepted for 浮夸, 红玫瑰 and 喜帖街 (浮誇, 紅玫瑰, 囍帖街); real hints for 红玫瑰 and 《完》 (they had the generic one) and a longer one for 孤独患者; the 今日 clue now carries the released lyric 「像处圈中圈」.
- Validator, schema, docs (`docs/MUSIC_RIDDLE_DATA.md`) and tests updated; `echo-score.js` added to the `music-riddle` script profile; `js_version` 20261003h → 20261003i, page stylesheet key `20261003o` → `20261003p`.

## Decisions

- The path is the shortest *walked* route, not the click history and never an edge the player has not solved. Standing on the start shows no row. The hidden coda follows the ending.
- The finale waits 2.9 s so the last song's chord and arrival animation finish first. Reloading a finished game does not start it; browsers would refuse sound without a gesture anyway.
- Muted: both buttons are disabled with a reason ("Turn sound on to play"). They do not override the player's mute.
- Clicking a song, a correct answer, Esc, mute, reset, hiding the page, or closing the phone dialog all end a score. A wrong answer does not.
- The finale lights the *edge* between consecutive songs when one exists; a path phrase sends a travelling pulse instead. That was chosen for drawing cost; the frame timings behind it were not kept, so no figures are given.

## Evidence

Chrome (system, Playwright), local server on the worktree, 1440 × 900 and iPhone 13 Pro emulation. Scripts and raw output: `~/Documents/simoncos-echoes-design-review/score-qa/` (`run-lean.sh`, `wake-lock-check.cjs`, outputs in `out/`). The Mac was shared and heavily loaded, so timings are indicative.

- **Path (4 songs).** The row reads "4 songs · about 7 s" with 4 beads. Playing lit them in route order (不来也不去, 四季圈, 你的背包, 喜帖街), scheduled the 16 voices expected, peaked at 0.199 on the master bus and was back to idle 6.6 s after the click.
- **Finale, desktop.** All 38 steps lit in the arranged order, never more than one node sounding at a time. The show ran 46.0 s (41.8 s of steps plus the closing release). Onset error against the arrangement: mean 20 ms, max 38 ms. 165 voices scheduled, as expected; master peak 0.29; no page errors.
- **Auto start.** The last answer shows "Every song is lit. A hidden echo has appeared beside the ending, and the finale is about to begin."; the finale starts 2.83 s later, its first chord sounds 0.77 s after that, and it ends with "The finale has ended."
- **Level.** Offline render through the real engine, real samples and the real master bus: peak −11.0 dBFS, 0 clipped samples, longest silent gap 0.05 s. The first second peaks at −21.9 dBFS and the loudest second (34 s) at −11.0 dBFS. A single chord click peaks at −12.2 to −12.6 dBFS, so the finale's loudest moment is 1.2–1.6 dB above a click.
- **Interruptions** (15 checks, all pass): Escape, the Stop button, mute (the replay button is disabled with a reason) and unmute, a map-node click, a language switch mid-play (keeps playing, relabels), a wrong answer (no effect), a correct answer, a hidden tab, a path replacing the finale, navigation during a path, reset, sound off at load, and a reload at 36/36 (nothing plays by itself).
- **Phone** (390 px). The path row sits under the answer feedback, after the keyboard, clue and answer, and lit the same four songs in order. The last answer opens the map dialog and the finale runs in it; Stop ends it; closing the dialog mid-play ends it and returns focus to "Full map", and the page scrolls from 769 to 299 to show that button. It does not go back to where the answer was typed. No page errors.
- **Layout.** The path row with the longest route (13 songs) at 1440, 1100, 900, 800, 650, 390 and 360 px in English and Chinese (14 cases): no overflow, caption not clipped, 44 px button. The beads take one row at 900–650 px and two elsewhere.
- **Accessibility.** Space and Enter start and stop the path from the keyboard with focus kept on the button; Escape stops it from anywhere; Enter starts the finale and Escape stops it. Live-region messages: "Playing the path: 4 songs." / "Path finished." / "The finale begins. Press Escape to stop." / "The finale has ended." With reduced motion the nodes still light in order, without animations.
- **Wake lock**, against a stub of `navigator.wakeLock` that records every request and release (8 of 8 scenarios): the finale asks for exactly one screen lock and holds it while it plays; Escape releases it; a lock granted after the finale has ended is released at once; after the browser releases it, a later finale asks again; with no API, or a refused request, the finale plays and nothing errors; playing a path never asks; a finale that runs to its end releases it. Scenarios 1–7 are from a second run, after the check's own route for scenario 7 was fixed; scenario 8 is from the first.
- **Content fixes.** The added spellings are accepted from the song that leads to each (紅玫瑰 on 孤独患者, 浮誇 on 任我行, 囍帖街 on 你的背包); the original spelling and a wrong answer behave as before (5 of 5).
- **Listening aid.** The two console snippets in `score-qa/listen.md` (one loads a finished game, the other leaves one answer to the finale) load the game as described and start the finale (6 of 6).
- `make check-all` passes (85 tests). `tests/echo_score_runtime.cjs` (virtual clock: scheduling, dynamics, rolls, bus, heard-time hooks, look-ahead, cancellation, cold start, validation, routes, path phrasing, the finale against the data) runs from `tests/test_music_riddle.py`.

## Not verified

- A real phone and Safari/iOS. The auto-start relies on the audio context created by the last answer's own chord still running 2.9 s later; Chrome behaves, iOS is untested. The wake lock was tested against a stub of `navigator.wakeLock` (what the page asks of the API and whether it lets go), not against a device's real auto-lock.
- Firefox.
- Frame pacing: earlier measurements were not kept, so none are claimed. A slow phone's frame rate during the finale is unknown.

## Not done

- Not rebased onto `origin/master` or onto the phone and loading fixes. Expect conflicts in `endless-echoes.css`, `scripts/build_music_riddle.py`, `src/ts/music-riddle.ts` and its output, `data/site_shell.json` (this branch sets `js_version` 20261003i, those fixes 20261003t) and the regenerated pages; resolve the sources and regenerate.
- `EchoScore` (a second deferred script) is not guarded the way `EchoPiano` is in the phone and loading fixes: if `echo-score.js` failed to load, the riddle would stop at its first sound, as it did for `echo-piano.js`. Extend the guard when the two meet.

## Files

`data/music-riddle.json`, `data/music-riddle.schema.json`, `scripts/music_riddle_data.py`, `scripts/build_music_riddle.py`, `src/ts/echo-piano.ts`, `src/ts/echo-score.ts`, `src/ts/music-riddle.ts` and their `src/js` outputs, `gallery/music/assets/endless-echoes.css`, `data/site_shell.json`, `tests/echo_score_runtime.cjs`, `tests/test_music_riddle.py`, `docs/MUSIC_RIDDLE_DATA.md`, two earlier QA notes (one sentence each, for the lyric quotes), and the pages regenerated for the new cache key.
