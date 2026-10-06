# Article films

Short films made from published articles. Each film is a canvas scene drawn
frame by frame in headless Chromium and encoded with ffmpeg; the score is
synthesized in Python from the site's own piano samples
(`gallery/music/assets/piano/ydp`, YDP Grand Piano, CC BY 3.0).

| Film | Article | Length |
|---|---|---|
| `simpsons/` | 辛普森悖论与直觉的缺陷 | 2:38, 1920×1080 |
| `haba/` | 我的哈巴雪山之旅 | 3:26, 1920×1080 |

## Setup

```sh
cd films && npm install          # fonts (Inter, Noto Sans/Serif SC, JetBrains Mono) and Playwright
pip install numpy scipy          # for the scores
```

ffmpeg must be on PATH. Playwright uses the Chromium in `PLAYWRIGHT_BROWSERS_PATH`.

## Make a film

```sh
# 1. sound cues and weather curves from the scene
node films/render.mjs haba --events films/haba/cues.json
# 2. the score, then loudness to -16 LUFS
python3 films/haba/score.py
ffmpeg -i films/haba/out/score.wav -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 films/haba/out/score.norm.wav
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
