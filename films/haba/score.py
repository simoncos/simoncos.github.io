#!/usr/bin/env python3
"""Score for the Haba film: wind, rain and sleet that follow the weather on
screen (cues.json curves), a low pad, a sparse piano in D minor that opens to
D major at the summit, a pulse for the night push, and a crunch per step on
the Slope of Despair.

    node films/render.mjs haba --events films/haba/cues.json
    python3 films/haba/score.py              # → films/haba/out/score.wav
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
rng = np.random.default_rng(5396)


def curve(values: list[float], n: int) -> np.ndarray:
    """A 10 Hz cue curve stretched to n audio frames."""
    return np.interp(np.arange(n) / R, np.arange(len(values)) / 10, values).astype(np.float32)


def stereo(mono: np.ndarray, width: float = 0.0, seed: int = 0) -> np.ndarray:
    """Mono to stereo with an optional decorrelated side."""
    if not width:
        return np.stack([mono, mono], axis=1)
    side = np.roll(mono, int(0.011 * R)) * width
    return np.stack([mono + side, mono - side], axis=1)


def wind(duration: float, level: np.ndarray) -> np.ndarray:
    n = int(duration * R) + R
    out = np.zeros((n, 2), dtype=np.float32)
    for c, seed in enumerate((11, 12)):
        x = A.noise(n / R, seed)[:n]
        lo = A.bandpass(x, 180, 900, order=2)
        hi = A.bandpass(x, 900, 3200, order=2) * 0.35
        tt = np.arange(n) / R
        gust = 0.55 + 0.45 * np.sin(2 * np.pi * (0.07 * tt + 0.11 * np.sin(0.05 * tt + c))) ** 2
        out[:, c] = (lo + hi) * gust
    return out * level[:, None]


def rain(duration: float, level: np.ndarray, sleet: np.ndarray) -> np.ndarray:
    n = int(duration * R) + R
    hiss = np.stack([A.lowpass(A.highpass(A.noise(n / R, s)[:n], 1800), 8000) for s in (21, 22)], axis=1) * 0.3
    out = hiss * level[:, None]
    # droplets
    drops = np.zeros((n, 2), dtype=np.float32)
    drop = A.sine(3200, 0.012, decay=400) + A.highpass(A.noise(0.012, 3), 4000) * 0.4
    k = 0
    for i in range(0, n - R, int(0.004 * R)):
        p = level[i] * 0.55 + sleet[i] * 0.4
        if rng.random() < p * 0.35:
            g = rng.uniform(0.05, 0.25)
            pan = rng.uniform(-1, 1)
            seg = drop[: n - i]
            drops[i : i + len(seg), 0] += seg * g * (1 - pan) / 2
            drops[i : i + len(seg), 1] += seg * g * (1 + pan) / 2
            k += 1
    sleet_hiss = np.stack([A.bandpass(A.noise(n / R, s)[:n], 1200, 6000) for s in (31, 32)], axis=1) * 0.25 * sleet[:, None]
    return out + drops + sleet_hiss


def pad(buf: np.ndarray, t0: float, t1: float, notes: list[int], gain: float = 0.08, attack: float = 2.5, release: float = 2.5, bright: float = 1800):
    dur = t1 - t0 + release
    n = int(dur * R)
    tt = np.arange(n) / R
    sig = np.zeros(n, dtype=np.float32)
    for m in notes:
        f = A.midi_hz(m)
        for detune in (-0.08, 0.0, 0.07):
            ph = rng.uniform(0, 2 * np.pi)
            ff = f * 2 ** (detune / 12)
            for h, a in ((1, 1.0), (2, 0.35), (3, 0.18), (4, 0.08)):
                sig += a * np.sin(2 * np.pi * ff * h * tt + ph * h)
    sig = A.lowpass(sig / (len(notes) * 3), bright)
    env = np.minimum(1, tt / attack) * np.clip((t1 - t0 + release - tt) / release, 0, 1)
    A.place(buf, sig * env, t0, gain=gain * 0.7, pan=-0.2)
    A.place(buf, np.roll(sig, int(0.017 * R)) * env, t0, gain=gain * 0.7, pan=0.2)


def roll(buf, t: float, notes: list[int], vel: float = 0.5, spread: float = 0.06):
    for i, m in enumerate(notes):
        A.piano(buf, t + i * spread + rng.normal(0, 0.004), m, vel=vel, pan=(i / max(1, len(notes) - 1) - 0.5) * 0.5, length=9)


def melody(buf, t0: float, notes: list[tuple[float, int]], vel: float = 0.42):
    for beat, m in notes:
        A.piano(buf, t0 + beat + rng.normal(0, 0.006), m, vel=vel * rng.uniform(0.92, 1.04), pan=0.15, length=6)


def arps(buf, t0: float, t1: float, chords: list[list[int]], bar: float, vel: float = 0.32, pattern=(0, 1, 2, 3, 2, 1)):
    step = bar / len(pattern)
    t, i = t0, 0
    while t < t1 - 0.05:
        ch = chords[i % len(chords)]
        A.piano(buf, t, ch[0] - 12, vel=vel * 1.1, pan=-0.2, length=6)
        for j, p in enumerate(pattern):
            tj = t + j * step
            if tj >= t1:
                break
            A.piano(buf, tj + rng.normal(0, 0.006), ch[p % len(ch)], vel=vel * (1 if j == 0 else 0.8) * rng.uniform(0.9, 1.05), pan=0.3 * np.sin(j + i), length=4)
        t += bar
        i += 1


def thump(buf, t: float, gain: float = 0.5):
    lub = A.sine(52, 0.35, decay=12, attack=0.004)
    lub[: int(0.2 * R)] += A.sine(104, 0.2, decay=25) * 0.3
    A.place(buf, lub, t, gain=gain)
    A.place(buf, lub * 0.7, t + 0.24, gain=gain)


def crunch(buf, t: float, gain: float = 0.5, seed: int = 0):
    n = int(0.22 * R)
    x = A.noise(0.22, seed)[:n]
    grains = (np.random.default_rng(seed).random(n) < 0.08).astype(np.float32) * x * 3
    body = A.bandpass(x * 0.6 + grains, 500, 5000)
    env = np.exp(-np.arange(n) / R * 22) * np.minimum(1, np.arange(n) / (0.006 * R))
    A.place(buf, body * env, t, gain=gain)
    A.place(buf, A.sine(70, 0.18, decay=20), t, gain=gain * 0.6)


def main() -> None:
    cues = json.loads((HERE / "cues.json").read_text())
    D = cues["duration"]
    n = int(D * R) + R
    rain_c, sleet_c, snow_c = (curve(cues["curves"][k], n) for k in ("rain", "sleet", "snow"))

    # wind follows altitude and weather
    wind_level = A.envelope(
        [0, 1, 9, 16, 17, 34, 41, 76, 86, 93, 106, 118, 136, 141, 150, 158, 169, 176, 181, 184, 198, 206],
        [0, 0.5, 0.45, 0.2, 0, 0, 0.1, 0.12, 0.25, 0.35, 0.45, 0.6, 0.9, 1.0, 0.8, 0.45, 0.25, 0.12, 0.08, 0.15, 0.12, 0],
        D,
    )[:n] + snow_c * 0.25
    amb = wind(D, wind_level * 0.5) + rain(D, rain_c * 0.6, sleet_c)

    music = A.track(D)
    sfx = A.track(D)

    Dm = [62, 65, 69, 74]
    Bb = [58, 62, 65, 70]
    F_ = [60, 65, 69, 72]
    C_ = [60, 64, 67, 72]
    Gm = [58, 62, 67, 70]
    Am = [57, 60, 64, 69]
    DM = [62, 66, 69, 74]

    # cold open: a low pad and two notes on the lines
    pad(music, 0.5, 15.5, [38, 45, 50], gain=0.10, attack=3)
    A.piano(music, 1.4, 62, vel=0.42, length=8)
    A.piano(music, 3.4, 69, vel=0.36, length=8)
    # title theme
    theme = [(0, 74), (1.1, 69), (2.2, 76), (3.0, 77), (4.4, 76), (5.4, 69)]
    roll(music, 9.4, [38, 50, 57, 64], vel=0.42, spread=0.07)
    melody(music, 9.6, theme, vel=0.44)

    # getting ready: busier, F major, quick arpeggios
    arps(music, 16.4, 33.6, [F_, C_, Dm, Bb], bar=2.4, vel=0.3, pattern=(0, 1, 2, 3, 2, 1, 2, 3))
    for t in (17.0, 22.4, 28.0):
        A.place(sfx, A.sine(A.midi_hz(84), 0.8, decay=6, harmonics=((1, 1), (2.01, 0.3))), t, gain=0.08)

    # Day 0: the flight, a soft rising sweep and a chime at Lijiang
    sweep_n = int(5 * R)
    tt = np.arange(sweep_n) / R
    sweep = A.bandpass(A.noise(5, 41)[:sweep_n], 300, 2400) * np.sin(np.pi * tt / 5) ** 2
    A.place(sfx, sweep, 35.0, gain=0.12)
    pad(music, 34.4, 40.6, [41, 48, 57], gain=0.07)
    A.piano(music, 39.2, 81, vel=0.3, length=6)

    # Day 1: the road and the mules, D minor travel arpeggios
    arps(music, 41.0, 75.8, [Dm, Bb, F_, C_], bar=3.2, vel=0.3)
    pad(music, 41.0, 75.5, [38, 45], gain=0.05, attack=4)

    # night at Base Camp: a watch ticking and a few unresolved notes
    for i, t in enumerate(np.arange(76.6, 86.0, 0.5)):
        A.place(sfx, A.highpass(A.noise(0.01, 50 + i), 3000) * np.linspace(1, 0, int(0.01 * R), dtype=np.float32), t, gain=0.05 if i % 2 else 0.035, pan=0.4)
    for t, notes in ((76.8, [50, 57, 64]), (79.8, [46, 57, 62]), (82.8, [44, 56, 62])):
        roll(music, t, notes, vel=0.33, spread=0.12)
    pad(music, 76.4, 86.0, [38, 44], gain=0.06)

    # 2:59 — out the door; a pulse for the climb in the dark
    roll(music, 86.4, [38, 50, 57, 62, 65], vel=0.45)
    pad(music, 86.4, 117.5, [38, 45, 50], gain=0.08, attack=4, bright=1200)
    t = 88.0
    while t < 118.0:
        thump(sfx, t, gain=0.15 + 0.07 * (t - 88) / 30)
        t += 60 / 76
    # "keep going up" ×3, climbing chords
    for t, notes in ((97.6, [50, 57, 62, 65, 69]), (100.2, [53, 60, 65, 69, 72]), (102.8, [57, 64, 69, 72, 76])):
        roll(music, t, notes, vel=0.42, spread=0.05)
    # dawn
    pad(music, 108.0, 118.5, [50, 57, 62, 69, 76], gain=0.06, attack=5, bright=2600)
    for t, m in ((110.8, 81), (112.2, 79), (113.6, 76), (115.2, 74)):
        A.piano(music, t, m, vel=0.28, length=6)

    # the Slope of Despair
    pad(music, 118.0, 141.0, [38, 45, 52, 57], gain=0.08, attack=3, bright=1000)
    t = 118.4
    while t < 140.6:
        thump(sfx, t, gain=0.2)
        t += 60 / 92
    for i, e in enumerate(ev for ev in cues["events"] if ev["kind"] == "step"):
        crunch(sfx, e["t"], gain=0.5, seed=100 + i)
        A.piano(music, e["t"], [57, 60, 62, 64, 69][i], vel=0.36 + 0.03 * i, length=4)
    for i, t in enumerate(np.arange(130.0, 136.0, 0.62)):
        crunch(sfx, t + rng.normal(0, 0.03), gain=0.3, seed=200 + i)
    roll(music, 136.4, [40, 52, 58, 62, 67], vel=0.4, spread=0.08)   # the sign, almost there

    # summit: D major opens
    roll(music, 141.0, [26 + 12, 50, 57, 62, 66, 69, 74, 78], vel=0.62, spread=0.045)
    pad(music, 141.0, 150.5, [50, 57, 62, 66, 69], gain=0.1, attack=1.2, bright=3200)
    melody(music, 143.4, [(0, 78), (1.0, 76), (2.0, 74), (3.4, 69), (4.8, 74)], vel=0.4)

    # descent: lighter, F major
    arps(music, 150.2, 168.8, [F_, C_, Gm, Bb], bar=3.0, vel=0.28)
    # back at camp and the way back: warm and slower
    arps(music, 169.0, 181.2, [Bb, F_, C_, Dm], bar=3.4, vel=0.26, pattern=(0, 2, 3, 1))

    # coda: the theme alone, then D major
    melody(music, 182.0, theme, vel=0.4)
    roll(music, 186.4, [43, 55, 62, 67, 70], vel=0.36, spread=0.1)
    roll(music, 191.6, [46, 58, 65, 69, 72], vel=0.36, spread=0.1)
    roll(music, 195.2, [45, 57, 61, 64, 69], vel=0.34, spread=0.1)
    roll(music, 198.6, [38, 50, 57, 62, 66, 69, 76], vel=0.46, spread=0.11)
    pad(music, 198.6, 205.0, [50, 57, 62, 66], gain=0.07, attack=2, release=1.5, bright=2400)
    A.piano(music, 201.2, 81, vel=0.28, length=5)

    music = A.reverb(music, seconds=3.4, wet=0.34, tone=4200)
    sfx = A.reverb(sfx, seconds=1.2, wet=0.12)
    amb = amb[: len(music)]
    if "--stems" in sys.argv:
        for name, x in (("music", music), ("sfx", sfx), ("amb", amb)):
            rms = [float(np.sqrt((x[int(a * R) : int(b * R)] ** 2).mean())) for a, b in zip(range(0, int(D), 10), range(10, int(D) + 10, 10))]
            print(name.ljust(6), " ".join(f"{20 * np.log10(v + 1e-9):5.0f}" for v in rms))
    mix = music * 0.9 + sfx * 0.9 + amb * 0.5
    mix = A.normalize(mix, -1.5)
    out = HERE / "out" / "score.wav"
    A.write_wav(out, mix, D)
    print(out)


if __name__ == "__main__":
    main()
