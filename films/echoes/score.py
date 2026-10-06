#!/usr/bin/env python3
"""Score for the Endless Echoes promo, made only from the game's own sounds:
each song's chord from data/music-riddle.json, on the same YDP piano, struck
together as the page strikes them. The finale's arrangement is not used.

    node films/render.mjs echoes --events films/echoes/cues.json
    python3 films/echoes/score.py            # → films/echoes/out/score.wav
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE.parent / "lib"))
import audio as A  # noqa: E402

R = A.RATE
rng = np.random.default_rng(36)
DATA = json.loads((ROOT / "data" / "music-riddle.json").read_text())
CHORD = {n["id"]: n["presentation"]["chord"]["midi"] for n in DATA["nodes"]}
START = DATA["start"]
BEAT = 60 / 84


def chord(buf, t: float, notes, vel: float = 0.5, spread: float = 0.0, length: float = 7.0, up: int = 0):
    """All notes at once, as the page plays a song (spread > 0 only for phrasing)."""
    k = 1 / np.sqrt(len(notes))
    for i, m in enumerate(notes):
        A.piano(buf, t + i * spread, m + up, vel=vel * (0.85 + 0.3 * k), pan=(i / max(1, len(notes) - 1) - 0.5) * 0.5, length=length)


def tick(buf, t: float, gain: float = 0.05, hz: float = 3000, seed: int = 0):
    n = int(0.02 * R)
    x = A.bandpass(A.noise(0.02, seed)[:n], hz * 0.6, hz * 1.6) * np.linspace(1, 0, n, dtype=np.float32) ** 2
    A.place(buf, x, t, gain=gain)


def main() -> None:
    cues = json.loads((HERE / "cues.json").read_text())
    D = cues["duration"]
    music = A.track(D)
    sfx = A.track(D)
    ev = cues["events"]
    walk = [e["id"] for e in ev if e["kind"] == "walk"]

    # 0–5: the entrance chord, then the bud opens
    chord(music, 0.6, CHORD[START], vel=0.45)
    chord(music, 3.6, CHORD[START], vel=0.5)
    for i, m in enumerate([62, 67, 69, 74]):
        A.piano(music, 3.62 + i * 0.07, m + 12, vel=0.28, pan=0.3, length=4)

    # 5–12: the world. Four songs' chords, slow, each with its top note an octave up
    t = 5.2
    for i, sid in enumerate(walk[:4]):
        chord(music, t, CHORD[sid], vel=0.42, spread=0.03)
        A.piano(music, t + 2 * BEAT, CHORD[sid][-1] + 12, vel=0.26, pan=0.2, length=4)
        t += 4 * BEAT * 0.62
    chord(music, 10.6, CHORD[START], vel=0.4, spread=0.04)

    # 12–31: how to play. A patient pulse on the start's chord, then the found song
    t = 12.4
    while t < 31.2:
        notes = CHORD[START] if t < 24.0 else CHORD[walk[0]] if t < 28 else CHORD[START]
        for i, m in enumerate(notes):
            A.piano(music, t + i * BEAT / 2, m + 12, vel=0.2, pan=0.25 * (i - 1), length=2.5)
        A.piano(music, t, notes[0] - 12 if notes[0] >= 48 else notes[0], vel=0.3, pan=-0.2, length=5)
        t += 4 * BEAT
    for e in ev:
        if e["kind"] == "key":
            tick(sfx, e["t"], gain=0.06, hz=2600, seed=int(e["t"] * 100))
        elif e["kind"] == "press":
            A.place(sfx, A.sine(140, 0.25, decay=18), e["t"], gain=0.25)
            tick(sfx, e["t"], gain=0.08, hz=1800, seed=5)
        elif e["kind"] == "found":
            chord(music, e["t"], CHORD[e["id"]], vel=0.6)
            for i, m in enumerate(sorted(CHORD[e["id"]])[-3:]):
                A.piano(music, e["t"] + 0.12 + i * 0.08, m + 12, vel=0.3, pan=0.35, length=3)
        elif e["kind"] == "tap":
            tick(sfx, e["t"], gain=0.07, hz=2200, seed=int(e["t"] * 10))

    # 31–35: the desktop, held
    chord(music, 31.3, CHORD[START], vel=0.36, spread=0.05, length=6)

    # 35–44: the map. Each song on the walk sounds its chord as it lights,
    # as the page does; the rest come out as single high notes.
    for e in ev:
        if e["kind"] == "walk":
            chord(music, e["t"], CHORD[e["id"]], vel=0.52, length=4)
        elif e["kind"] == "spread":
            m = CHORD[e["id"]][-1] + 12
            A.piano(music, e["t"], m, vel=0.24, pan=float(rng.uniform(-0.6, 0.6)), length=2.5)

    # 44.8: the hidden echo — hush, one open chord, and a soft pulse on the last bud
    hook = next(e["t"] for e in ev if e["kind"] == "hook")
    chord(music, hook, [36, 43, 50], vel=0.42, length=6)
    for i in range(4):
        tp = hook + 0.3125 + i * 1.25
        A.place(sfx, A.sine(A.midi_hz(86), 0.9, decay=5, harmonics=((1, 1), (2.76, 0.25))), tp, gain=0.06)

    # 49–59: play now. The entrance chord again, rising, left open
    cta = next(e["t"] for e in ev if e["kind"] == "cta")
    chord(music, cta, CHORD[START], vel=0.55)
    chord(music, cta, [36], vel=0.4)
    for i, m in enumerate([55, 62, 67, 69, 74, 79, 81, 84]):
        A.piano(music, cta + 0.5 + i * BEAT / 2, m, vel=0.3, pan=0.4 * np.sin(i), length=4)
    for k, sid in enumerate(walk[1:3]):
        chord(music, cta + 3.4 + k * 2.4, CHORD[sid], vel=0.38, spread=0.03)
    chord(music, cta + 8.2, CHORD[START], vel=0.42, spread=0.06, length=8)
    A.piano(music, cta + 8.4, 81, vel=0.24, length=6)

    music = A.reverb(music, seconds=3.0, wet=0.32, tone=4800)
    sfx = A.reverb(sfx, seconds=1.4, wet=0.18)
    mix = A.normalize(music * 0.9 + sfx, -1.5)
    out = HERE / "out" / "score.wav"
    A.write_wav(out, mix, D)
    print(out)


if __name__ == "__main__":
    main()
