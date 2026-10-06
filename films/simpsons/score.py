#!/usr/bin/env python3
"""Score for the Simpson's paradox film: an upbeat explainer groove in D major
at 112 BPM. Light drums, a plucked bass, a marimba-like arpeggio and piano
stabs keep it moving; it drops out where the totals flip and where the
formula asks why, and a tick sounds for every admission and arrival
(from cues.json).

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

R = A.RATE
BPM = 112
BEAT = 60 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(112)

# chord: (bass root, chord tones for stabs and arpeggio)
CH = {
    "D": (38, [62, 66, 69, 74]), "Bm": (35, [59, 62, 66, 71]), "G": (43, [59, 62, 67, 71]),
    "A": (45, [61, 64, 69, 73]), "Em": (40, [59, 64, 67, 71]), "F#m": (42, [61, 66, 69, 73]),
    "Gm": (43, [58, 62, 67, 70]), "Bb": (46, [58, 62, 65, 70]), "Asus": (45, [62, 64, 69, 74]),
}


# ---- instruments -----------------------------------------------------------
def kick(buf, t, g=0.5):
    n = int(0.35 * R)
    tt = np.arange(n) / R
    f = 45 + 90 * np.exp(-tt * 28)
    x = np.sin(2 * np.pi * np.cumsum(f) / R) * np.exp(-tt * 9)
    A.place(buf, x.astype(np.float32), t, gain=g)


def clap(buf, t, g=0.25):
    n = int(0.18 * R)
    x = A.bandpass(A.noise(0.18, int(t * 1000)), 900, 4500)[:n]
    env = np.zeros(n, dtype=np.float32)
    for d in (0, 0.009, 0.018):       # three quick hands
        i = int(d * R)
        env[i:] += np.exp(-np.arange(n - i) / R * 38).astype(np.float32) * 0.6
    A.place(buf, x * env, t, gain=g, pan=0.05)


def hat(buf, t, g=0.08, open_=False):
    d = 0.16 if open_ else 0.045
    n = int(d * R)
    x = A.highpass(A.noise(d, int(t * 997)), 7000)[:n] * np.exp(-np.arange(n) / R * (14 if open_ else 70))
    A.place(buf, x.astype(np.float32), t, gain=g, pan=0.3)


def bass(buf, t, m, dur, g=0.32):
    n = int(dur * R)
    tt = np.arange(n) / R
    f = A.midi_hz(m)
    x = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt) + 0.12 * np.sin(6 * np.pi * f * tt)
    env = np.minimum(1, tt / 0.004) * np.exp(-tt * 3.5) * np.clip((dur - tt) / 0.03, 0, 1)
    A.place(buf, A.lowpass((x * env).astype(np.float32), 900), t, gain=g, pan=-0.05)


def mallet(buf, t, m, g=0.12, pan=0.0):
    """A marimba-ish pluck: fundamental plus the 4th partial, short."""
    n = int(0.6 * R)
    tt = np.arange(n) / R
    f = A.midi_hz(m)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) + 0.3 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt * 30)
    x *= np.minimum(1, tt / 0.002)
    A.place(buf, x.astype(np.float32), t, gain=g, pan=pan)


def stab(buf, t, notes, vel=0.4, length=1.2):
    for i, m in enumerate(notes):
        A.piano(buf, t + i * 0.006, m, vel=vel, pan=(i - 1.5) * 0.12, length=length, release=0.5)


def riser(buf, t, dur, g=0.12):
    n = int(dur * R)
    x = A.noise(dur, int(t * 7))[:n]
    k = np.arange(n) / n
    y = A.bandpass(x, 400, 2000) * (1 - k) + A.bandpass(x, 2000, 9000) * k
    A.place(buf, (y * k ** 2).astype(np.float32), t, gain=g)


def boom(buf, t, g=0.6):
    n = int(2.2 * R)
    tt = np.arange(n) / R
    f = 34 + 50 * np.exp(-tt * 6)
    x = np.sin(2 * np.pi * np.cumsum(f) / R) * np.exp(-tt * 1.6)
    A.place(buf, x.astype(np.float32), t, gain=g)
    A.place(buf, A.lowpass(A.noise(1.5, 9), 3000)[: int(1.5 * R)] * np.exp(-np.arange(int(1.5 * R)) / R * 4).astype(np.float32), t, gain=g * 0.25)


# ---- patterns ----------------------------------------------------------------
ARP = [0, 2, 1, 3, 2, 1, 3, 2]


def groove(mus, drm, t0, t1, prog, level=1.0, drums=True, arp=True, hats16=False, stabs=True):
    """Bars of the progression from t0 until t1."""
    t, b = t0, 0
    while t < t1 - 0.05:
        root, tones = CH[prog[b % len(prog)]]
        for beat in range(4):
            tb = t + beat * BEAT
            if tb >= t1:
                break
            if drums:
                if beat in (0, 2):
                    kick(drm, tb, 0.42 * level)
                if beat in (1, 3):
                    clap(drm, tb, 0.2 * level)
                for s in range(4 if hats16 else 2):
                    th = tb + s * BEAT / (4 if hats16 else 2)
                    if th < t1:
                        hat(drm, th, (0.07 if s % 2 else 0.045) * level, open_=(not hats16 and s == 1 and beat == 3))
            # bass: root on 1, octave on the and of 2, fifth on 4
            for off, m, d in ((0, root, 0.4), (1.5, root + 12, 0.25), (3, root + 7, 0.3)):
                if beat == int(off) and t + off * BEAT < t1:
                    bass(mus, t + off * BEAT, m, d, 0.3 * level)
        if arp:
            for i in range(8):
                ta = t + i * BEAT / 2
                if ta < t1:
                    mallet(mus, ta, tones[ARP[i] % len(tones)] + 12, 0.09 * level * (1.15 if i % 4 == 0 else 1), pan=0.35 * np.sin(i))
        if stabs:
            stab(mus, t, tones, 0.34 * level)
            if t + 2.5 * BEAT < t1:
                stab(mus, t + 2.5 * BEAT, tones[1:], 0.26 * level, length=0.6)
        t += BAR
        b += 1


# One beat grid for the whole film, anchored on the groove's first downbeat.
# Sections start on bar lines and hits land on beats, so no section enters
# ahead of or behind the pulse the last one set.
GRID0 = 13.4


def B(t: float) -> float:
    """The beat nearest t."""
    return GRID0 + round((t - GRID0) / BEAT) * BEAT


def BARLINE(t: float) -> float:
    """The bar line nearest t."""
    return GRID0 + round((t - GRID0) / BAR) * BAR


def main() -> None:
    cues = json.loads((HERE / "cues.json").read_text())
    D = cues["duration"]
    mus, drm, sfx = A.track(D), A.track(D), A.track(D)

    # hook: two stabs on the two lines, a riser into the title
    stab(mus, B(0.6), CH["D"][1], 0.5, 2.5)
    bass(mus, B(0.6), 38, 1.2)
    stab(mus, B(2.1), CH["Bm"][1], 0.5, 2.5)
    bass(mus, B(2.1), 35, 1.2)
    for i in range(8):
        mallet(mus, B(3.4) + i * BEAT / 2, [74, 78, 81, 86, 81, 78, 74, 69][i], 0.08)
    riser(sfx, B(4.4 + 2.2) - 2.2, 2.2, 0.12)
    kick(drm, B(6.6), 0.55); stab(mus, B(6.6), CH["G"][1], 0.55, 3)
    # title: arpeggio alone, then the groove comes in on the setup
    groove(mus, drm, BARLINE(6.6) + BAR / 2, BARLINE(13.4), ["G", "A"], level=0.7, drums=False, stabs=False)

    # setup → applications: the groove
    groove(mus, drm, BARLINE(13.4), BARLINE(40.4), ["D", "Bm", "G", "A"], level=0.9)
    # admissions: busier hats, no arpeggio so the ticks come through
    groove(mus, drm, BARLINE(40.4), BARLINE(52.0), ["D", "Bm", "G", "A"], level=0.85, arp=False, hats16=True)
    # adding up: build to the flip
    groove(mus, drm, BARLINE(52.0), BARLINE(59.6), ["G", "A"], level=0.95, hats16=True)
    for i, tt in enumerate(np.arange(BARLINE(59.6), B(61.5) - 0.01, BEAT / 4)):
        clap(drm, tt, 0.06 + 0.1 * i / 8)
    riser(sfx, B(58.8 + 2.7) - 2.7, 2.7, 0.16)
    # the flip: everything stops on a boom and a minor chord
    boom(sfx, B(61.5), 0.55)
    stab(mus, B(61.5), [47, 54, 59, 62, 66], 0.65, 4)
    # question: suspense, a ticking clock and held chords
    for i, tt in enumerate(np.arange(B(62.6), 71.3, BEAT)):
        hat(drm, tt, 0.05 if i % 2 else 0.07)
    for tt, ch in ((64.2, "G"), (66.0, "Em"), (68.0, "F#m")):
        stab(mus, B(tt), CH[ch][1], 0.36, 2.5)
        bass(mus, B(tt), CH[ch][0], 1.5, 0.25)
    riser(sfx, B(69.6 + 1.9) - 1.9, 1.9, 0.1)

    # explanation: the groove back, a little brighter
    groove(mus, drm, BARLINE(71.5), BARLINE(95.2), ["G", "D", "A", "Bm"], level=1.0)

    # formula: half time, tension, a borrowed minor, then release
    boom(sfx, BARLINE(95.2), 0.3)
    for i, tt in enumerate(np.arange(BARLINE(95.2), B(106.0) - 0.01, BEAT)):
        if i % 4 == 0: kick(drm, tt, 0.35)
        if i % 4 == 2: clap(drm, tt, 0.16)
        hat(drm, tt + BEAT / 2, 0.05)
        mallet(mus, tt, 69 if i % 2 else 74, 0.07)
        if i % 4 == 0: bass(mus, tt, 38, 1.0, 0.28)
    stab(mus, B(106.0), CH["Gm"][1], 0.55, 3); bass(mus, B(106.0), 43, 2.0)
    boom(sfx, B(106.0), 0.25)
    for i, tt in enumerate(np.arange(B(107.6), 111.5, BEAT)):
        hat(drm, tt, 0.05); mallet(mus, tt, 70 if i % 2 else 74, 0.06)
    riser(sfx, B(109.8 + 1.8) - 1.8, 1.8, 0.1)
    groove(mus, drm, BARLINE(111.6), BARLINE(117.4), ["D", "A"], level=0.85, stabs=True, arp=True)

    # vectors: full groove, lifting at the totals
    groove(mus, drm, BARLINE(117.6), BARLINE(133.6), ["Em", "G", "D", "A"], level=0.95)
    riser(sfx, B(131.8 + 1.8) - 1.8, 1.8, 0.12)
    groove(mus, drm, BARLINE(133.6), BARLINE(139.6), ["G", "A"], level=1.1, hats16=True)
    stab(mus, B(139.6), CH["Bm"][1], 0.45, 3); bass(mus, B(139.6), 35, 2)

    # closing: light, then a final hit on the quote and an open ending
    groove(mus, drm, BARLINE(140.4), B(145.6), ["G", "A"], level=0.6, drums=False, stabs=False)
    kick(drm, B(145.6), 0.5); stab(mus, B(145.6), [50, 62, 66, 69, 74], 0.6, 4); bass(mus, B(145.6), 38, 2)
    stab(mus, B(147.0), CH["A"][1], 0.4, 3)
    groove(mus, drm, BARLINE(148.4), B(151.6), ["G", "A"], level=0.5, drums=False, stabs=False)
    kick(drm, B(151.6), 0.45)
    stab(mus, B(151.6), [50, 57, 62, 66, 69, 76], 0.55, 6); bass(mus, B(151.6), 38, 3)
    for i in range(8):
        mallet(mus, B(152.2) + i * BEAT / 2, [74, 76, 78, 81, 83, 86, 88, 90][i], 0.06 * (1 - i / 10))

    # ticks from the film's cues
    penta = [74, 76, 78, 81, 83, 86, 88, 90, 93]
    counts = {"W": 0, "M": 0}
    for e in cues["events"]:
        pan = -0.3 if e.get("group") == "W" else 0.3
        if e["kind"] == "admit":
            A.place(sfx, A.sine(A.midi_hz(penta[int(rng.integers(0, 5))]), 0.3, decay=20, harmonics=((1, 1), (2, 0.25))), e["t"], gain=0.05, pan=pan)
        elif e["kind"] == "reject":
            n = int(0.03 * R)
            click = A.lowpass(A.noise(0.03, int(e["t"] * 1000)), 1800)[:n] * np.linspace(1, 0, n, dtype=np.float32)
            A.place(sfx, click, e["t"], gain=0.05, pan=pan)
        elif e["kind"] == "arrive":
            g = e["group"]
            i = counts[g]
            counts[g] += 1
            ladder = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93]
            m = ladder[min(len(ladder) - 1, i // (2 if g == "W" else 7))]
            A.place(sfx, A.sine(A.midi_hz(m), 0.25, decay=18, harmonics=((1, 1), (3, 0.12))), e["t"], gain=0.045, pan=pan)

    mus = A.reverb(mus, seconds=1.8, wet=0.18)
    drm = A.reverb(drm, seconds=0.9, wet=0.08)
    sfx = A.reverb(sfx, seconds=1.4, wet=0.15)
    mix = A.normalize(mus * 0.9 + drm * 0.8 + sfx, -1.5)
    out = HERE / "out" / "score.wav"
    A.write_wav(out, mix, D)
    print(out)


if __name__ == "__main__":
    main()
