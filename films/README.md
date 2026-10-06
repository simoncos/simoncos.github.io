# Article films

Short films made from published articles. Each film is a canvas scene drawn
frame by frame in headless Chromium and encoded with ffmpeg; the score is
synthesized in Python from the site's own piano samples
(`gallery/music/assets/piano/ydp`, YDP Grand Piano, CC BY 3.0).

| Film | Article | Length |
|---|---|---|
| `simpsons/` | 辛普森悖论与直觉的缺陷 | 2:38, 1920×1080 |
| `haba/` | 我的哈巴雪山之旅 | 3:26, 1920×1080 |
| `echoes/` | 漫无止尽的回响（宣传片） | 0:59, 1080×1920 |

## Setup

```sh
cd films && npm install          # fonts (Inter, Noto Sans/Serif SC, JetBrains Mono) and Playwright
pip install numpy scipy          # for the scores
```

ffmpeg must be on PATH.

**Credit the piano wherever a film is posted:** YDP Grand Piano, recorded by
Zenph Studios, prepared by the FreePats project, CC BY 3.0
(`gallery/music/assets/piano/ATTRIBUTION.txt`). Playwright uses the Chromium in `PLAYWRIGHT_BROWSERS_PATH`.

## Make a film

```sh
# 1. sound cues and weather curves from the scene
node films/render.mjs haba --events films/haba/cues.json
# 2. the score, then loudness (-14 LUFS, -1.5 dBTP, as the site intro)
python3 films/haba/score.py
films/lib/loudnorm.sh films/haba/out/score.wav films/haba/out/score.norm.wav   # two-pass, -14 LUFS
# 3. frames → video, muxed with the score
node films/render.mjs haba --lang zh --audio films/haba/out/score.norm.wav --out films/haba/out/haba.zh.mp4
```

`--lang en` renders the English version. `--stills 12,40.5,90 --still-dir dir`
writes PNG frames for checking a scene without encoding. To scrub in a
browser, serve the repository root and open
`/films/<name>/index.html?preview&lang=zh` (fonts are served from
`films/node_modules` under `/fonts/` by `render.mjs` only, so a plain static
server shows fallback fonts).

## How a scene is built

`lib/film.js` is the drawing kit: easing, envelopes, text with CJK line
breaking, image cover/contain, a seeded random source. A scene calls
`Film.create({ width, height, duration, images, strings, draw })` and draws
everything as a pure function of time `t`, so any frame can be rendered alone
and workers can render chunks in parallel. `strings` lists every string the
film shows, so the right subsets of the web fonts load before the first frame.

`lib/audio.py` is the sound kit: the piano sampler, noise beds, filters, a
convolution reverb and WAV output. A score reads `cues.json` (event times and
weather curves the scene exports) so sound lands on the frame.

## The Endless Echoes promo

`echoes/` is a promo, not an article film, and it must never show an answer.

- `prep.mjs` writes `data.js` from `data/music-riddle.json`: map positions,
  routes, flowers and chords, with no titles or clues, and without the hidden
  epilogue. It also writes the QR codes for the game's address.
- `capture.mjs` screenshots the real page in its fresh state (only the
  start song and its clue, which every visitor sees first) on a phone and a
  desktop, and records element boxes for the overlays. The typed answer is
  drawn as dots; a found song's name is a blurred bar; the found-songs chips
  are blurred.
- The map lights to 35 / 36 and stops on one bud and a question (还差最后一首。
  集齐之后，会发生什么？). What happens at 36 is never said or shown.
- The score plays only the songs' own chords, struck together as the page
  strikes them, never the finale's arrangement.

```sh
node films/echoes/prep.mjs
node films/echoes/capture.mjs --lang zh && node films/echoes/capture.mjs --lang en
node films/render.mjs echoes --events films/echoes/cues.json
python3 films/echoes/score.py && films/lib/loudnorm.sh films/echoes/out/score.wav films/echoes/out/score.norm.wav
node films/render.mjs echoes --lang zh --audio films/echoes/out/score.norm.wav --out films/echoes/out/echoes.zh.mp4
```

Files sent to a phone arrive only if they upload within about 30 s: send a
720p preview of about 5 MB (see the site intro repo's RECIPE).

## Narration (Simpson's paradox)

`simpsons/voice/lines.zh.json` is the script: each line names the scene
window it narrates, what the voice says and the caption shown. `voice.py`
reads it with Kokoro (open source, Apache 2.0; model files from
github.com/thewh1teagle/kokoro-onnx releases, `model-files-v1.0`), voice
`zm_yunxi`, and fits the film to the voice: each line's window stretches or
shrinks (to 70% at most) so the line fits with air, and the gaps keep their
length. It writes `voice.zh.js` / `voice.zh.json` (the warp and line times)
and `out/voice.zh.wav`. The scene loads `voice/voice.<lang>.js` when it
exists and draws on the voice's clock; `?voice=0` turns it off. The score
maps its scene times through the same warp, keeps its beat grid on the
film's clock, ducks the music under each line and mixes the voice in.

```sh
python3 -m venv /home/user/tts/venv && . /home/user/tts/venv/bin/activate
pip install kokoro-onnx soundfile "misaki[zh]"
KOKORO_DIR=/home/user/tts python films/simpsons/voice/voice.py zh --paragraphs   # without --paragraphs: line by line
node films/render.mjs simpsons --events films/simpsons/cues.json
python3 films/simpsons/score.py --voice zh
films/lib/loudnorm.sh films/simpsons/out/score.voice.zh.wav films/simpsons/out/score.voice.zh.norm.wav
node films/render.mjs simpsons --lang zh --audio films/simpsons/out/score.voice.zh.norm.wav --out films/simpsons/out/simpsons.zh.voice.mp4
```

`--paragraphs` reads each paragraph of `lines.zh.json` (`paragraphs`) in one
go so the sentences flow, then cuts it back into lines: each cut is
estimated by reading the paragraph's first lines alone, then snapped to the
nearest pause. Pause length alone does not work, because a full stop inside
a line pauses as long as one between lines.
