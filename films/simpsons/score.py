#!/usr/bin/env python3
"""Score for the Simpson's paradox film: a light piano in D major at 84 BPM,
with a small tick for every admission and arrival (from cues.json), and a low
chord where the totals flip.

    node films/render.mjs simpsons --events films/simpsons/cues.json
    python3 films/simpsons/score.py            # → films/simpsons/out/score.wav
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "lib"))
import audio as A  # noqa: E402

BEAT = 60 / 84
BAR = 4 * BEAT
rng = np.random.default_rng(84)

CHORDS = {
    "D": (50, [62, 66, 69, 74]),
    "Bm": (47, [59, 62, 66, 71]),
    "G": (43, [59, 62, 67, 71]),
    "A": (45, [61, 64, 69, 73]),
    "Em": (40, [59, 64, 67, 71]),
    "F#m": (42, [61, 66, 69, 73]),
    "Gm": (43, [58, 62, 67, 70]),
    "Asus": (45, [62, 64, 69, 74]),
    "F#sus": (42, [61, 66, 71, 73]),
    "D/F#": (42, [62, 66, 69, 74]),
}
ARP = [0, 1, 2, 3, 2, 1, 2, 1]


def human(t: float) -> float:
    return t + rng.normal(0, 0.006)


def arpeggio(buf, t0: float, chords: list[str], vel: float = 0.45, bass: float = 0.5, octave: int = 0, density: int = 8, until: float | None = None):
    """One bar per chord: bass on beats 1 and 3, chord tones in eighths."""
    for b, name in enumerate(chords):
        root, tones = CHORDS[name]
        tb = t0 + b * BAR
        if until is not None and tb >= until:
            break
        A.piano(buf, human(tb), root, vel=bass, pan=-0.15, length=5)
        A.piano(buf, human(tb + 2 * BEAT), root + 7 if root < 47 else root, vel=bass * 0.8, pan=-0.15, length=4)
        step = 8 // density
        for i in range(0, 8, step):
            t = tb + i * BEAT / 2
            if until is not None and t >= until:
                break
            m = tones[ARP[i]] + 12 * octave
            v = vel * (1.0 if i == 0 else 0.82) * rng.uniform(0.9, 1.05)
            A.piano(buf, human(t), m, vel=v, pan=0.25 * np.sin(i), length=3.5)


def roll(buf, t: float, notes: list[int], vel: float = 0.5, spread: float = 0.05):
    for i, m in enumerate(notes):
        A.piano(buf, t + i * spread, m, vel=vel * (0.9 + 0.1 * (i == len(notes) - 1)), pan=(i / max(1, len(notes) - 1) - 0.5) * 0.6, length=8)


def main() -> None:
    cues = json.loads((HERE / "cues.json").read_text())
    duration = cues["duration"]
    music = A.track(duration)
    sfx = A.track(duration)

    # hook and title
    roll(music, 0.6, [50, 62, 69, 76], vel=0.45)
    roll(music, 2.1, [47, 62, 66, 74], vel=0.42)
    roll(music, 6.6, [43, 59, 66, 71, 78], vel=0.45, spread=0.08)
    roll(music, 10.2, [45, 61, 64, 69, 76], vel=0.38, spread=0.08)

    # setup → applications → admissions → adding up (13.4 – 61.5)
    t0 = 13.4
    prog = ["D", "Bm", "G", "A"] * 3
    arpeggio(music, t0, prog, vel=0.42, bass=0.46, until=t0 + 10 * BAR)
    # admissions and adding up: lighter, quarter notes, so the ticks come through
    arpeggio(music, t0 + 10 * BAR, ["G", "A", "D", "Bm", "G", "A", "A"], vel=0.3, bass=0.42, density=4, until=61.4)

    # the flip
    roll(music, 61.5, [35, 47, 54, 59, 62], vel=0.8, spread=0.025)
    thud = A.sine(48, 1.6, decay=3.5, attack=0.003) * 0.9
    A.place(sfx, thud, 61.5, gain=0.5)
    # question: suspended, sparse
    for i, (t, notes) in enumerate([(64.2, [43, 59, 67]), (66.0, [40, 59, 64, 71]), (68.0, [42, 61, 66, 71, 73])]):
        roll(music, t, notes, vel=0.4 - i * 0.03, spread=0.09)

    # explanation (71.5 – 95)
    arpeggio(music, 71.6, ["G", "D", "A", "Bm", "G", "D", "Em", "A"], vel=0.42, bass=0.45, until=95.2)

    # formula: a held pedal and a patient pulse (95.5 – 117)
    roll(music, 95.6, [38, 50, 57], vel=0.5, spread=0.04)
    t = 96.2
    while t < 106:
        A.piano(music, human(t), 69, vel=0.26, length=1.2, release=0.4)
        t += BEAT
    roll(music, 106.0, [43, 58, 62, 67, 70], vel=0.44, spread=0.06)   # “不能这样相加” — borrowed minor
    roll(music, 111.6, [42, 62, 66, 69, 74], vel=0.46, spread=0.06)   # resolves to D/F#
    t = 112.4
    while t < 117.2:
        A.piano(music, human(t), 66 if int((t - 112.4) / BEAT) % 2 else 69, vel=0.24, length=1.2, release=0.4)
        t += BEAT

    # vectors: full again, with an octave lift at the totals
    arpeggio(music, 117.6, ["Em", "G", "D", "A", "Em"], vel=0.42, bass=0.46, until=133.6)
    arpeggio(music, 133.6, ["G", "A"], vel=0.5, bass=0.55, octave=1, until=139.6)
    roll(music, 139.4, [47, 59, 62, 66, 71], vel=0.42, spread=0.08)

    # closing
    roll(music, 142.6, [43, 59, 62, 67], vel=0.35, spread=0.1)
    roll(music, 145.6, [38, 50, 62, 66, 69, 74], vel=0.52, spread=0.06)
    roll(music, 147.0, [45, 61, 69, 76], vel=0.36, spread=0.08)
    roll(music, 151.6, [38, 50, 57, 64, 66, 69, 76], vel=0.48, spread=0.09)
    A.piano(music, 154.4, 81, vel=0.3, length=6)

    # ticks from the film's cues
    penta = [74, 76, 78, 81, 83, 86, 88, 90, 93]
    counts = {"W": 0, "M": 0}
    for e in cues["events"]:
        if e["kind"] == "admit":
            m = penta[int(rng.integers(0, 5))]
            A.place(sfx, A.sine(A.midi_hz(m), 0.35, decay=18, harmonics=((1, 1), (2, 0.25))), e["t"], gain=0.05, pan=-0.3 if e["group"] == "W" else 0.3)
        elif e["kind"] == "reject":
            click = A.lowpass(A.noise(0.03, seed=int(e["t"] * 1000)), 1800) * np.linspace(1, 0, int(0.03 * A.RATE), dtype=np.float32)
            A.place(sfx, click, e["t"], gain=0.05, pan=-0.3 if e["group"] == "W" else 0.3)
        elif e["kind"] == "arrive":
            g = e["group"]
            i = counts[g]
            counts[g] += 1
            # each arrival one step higher on the pentatonic ladder
            ladder = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93]
            m = ladder[min(len(ladder) - 1, i // (2 if g == "W" else 7))]
            A.place(sfx, A.sine(A.midi_hz(m), 0.3, decay=16, harmonics=((1, 1), (3, 0.12))), e["t"], gain=0.045, pan=-0.35 if g == "W" else 0.35)

    music = A.reverb(music, seconds=2.6, wet=0.28)
    sfx = A.reverb(sfx, seconds=1.4, wet=0.2)
    mix = music * 0.9 + sfx
    mix = A.normalize(mix, -1.5)
    out = HERE / "out" / "score.wav"
    A.write_wav(out, mix, duration)
    print(out)


if __name__ == "__main__":
    main()
