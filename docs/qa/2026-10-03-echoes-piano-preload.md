# Endless Echoes: prepared piano samples

Baseline: `2df9b5eea4852efc11ad8acc18278e357bea2649`, branch
`codex/reading-and-music-riddle`; a fresh fetch matched `origin/master`.
Existing untracked research, image candidates and the design ZIP were preserved.

## Change

- When sound is enabled and the page is visible, preload and decode all seven
  existing YDP samples with an offline context. This does not create an output
  context or autoplay. Sample files, chords, envelopes and song data are unchanged.
- Create/resume the playback context inside the click gesture. Once decoded and
  running, schedule the whole chord synchronously before the graph redraw, with
  one shared audio-clock start time and the existing 10 ms scheduling offset.
- Concurrent clicks share pending loads. Failed samples remain retryable; mute,
  navigation and superseded requests cannot cause delayed playback.
- Starting with sound off skips preparation. Re-enabling sound and returning to
  a visible page prepare missing samples. Browsers without an offline context
  retain the interaction-time loading fallback.

## Verification

- `make generate`, `make check-all`, and `git diff --check`: passed; all 20 tracked
  TypeScript outputs current and 79 Python tests passed.
- Expanded runtime tests cover all 37 warm chords, no output/autoplay during
  preparation, synchronous warm scheduling, early clicks sharing downloads,
  whole-chord readiness, cancellation, partial network/decode failure retries,
  stale completion ownership, and the legacy fallback.
- Local in-app browser: seven sample resource entries before the first click.
  Temporary audio instrumentation observed one playback context created on the
  first click and zero decoding during any measured click.
- First prepared click: 15.5 ms from the captured click event to source scheduling.
  Ten subsequent song selections: 0.3–1.2 ms. Every chord used a shared scheduled
  time; the total sample request count stayed seven.
- These are browser scheduling measurements, not microphone/speaker latency or
  a mobile hardware benchmark. The player additionally schedules 10 ms ahead;
  device output latency remains outside these measurements.
- Sound-off reload: zero sample requests. Re-enabling sound loaded all seven.
  No console errors. The 390 px view had no horizontal overflow.
- Temporary instrumentation was cleared by reload. Saved puzzle progress and
  the sound preference were restored to their pre-test values.

Timing JSON and a screenshot are in the task's local `echoes/` artifact directory:
`piano-preload-timing.json`, `piano-preload-mobile.png`.

Shared JS version changed from `20261003e` to `20261003f`. The other 146 generated
page/template diffs were verified to contain only this cache-key update. RSS
diffs contained only `lastBuildDate`; their original bytes were restored.
