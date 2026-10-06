"""Small synthesis kit for the film scores: a piano sampler built on the
YDP Grand Piano roots already in the site (gallery/music/assets/piano/ydp,
CC BY 3.0, see ATTRIBUTION.txt there), noise beds, a cheap reverb, and WAV out.

Everything works on float32 stereo arrays of shape (n, 2) at RATE.
"""

from __future__ import annotations

import subprocess
import wave
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

RATE = 48000
ROOT = Path(__file__).resolve().parents[2]
PIANO = ROOT / "gallery" / "music" / "assets" / "piano" / "ydp"
PIANO_ROOTS = [48, 54, 60, 63, 66, 69, 72]


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(RATE), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


@lru_cache(maxsize=None)
def _root(midi: int) -> np.ndarray:
    return decode(PIANO / f"root-{midi:03d}.mp3")


@lru_cache(maxsize=None)
def piano_note(midi: int, length: float = 6.0) -> np.ndarray:
    """A mono piano note, pitch-shifted from the nearest sampled root."""
    root = min(PIANO_ROOTS, key=lambda r: abs(r - midi))
    src = _root(root)
    ratio = 2 ** ((midi - root) / 12)
    n = int(length * RATE)
    pos = np.arange(n) * ratio
    pos = pos[pos < len(src) - 1]
    out = np.interp(pos, np.arange(len(src)), src).astype(np.float32)
    # gentle tail so truncated samples do not click
    fade = min(len(out), int(0.25 * RATE))
    out[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
    return out


def track(duration: float) -> np.ndarray:
    return np.zeros((int(duration * RATE) + RATE, 2), dtype=np.float32)


def place(buf: np.ndarray, mono: np.ndarray, t: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Add a mono sound into a stereo buffer at time t (equal-power pan, -1..1)."""
    i = int(t * RATE)
    if i >= len(buf) or i + len(mono) <= 0:
        return
    if i < 0:
        mono, i = mono[-i:], 0
    seg = mono[: len(buf) - i]
    a = (pan + 1) * np.pi / 4
    buf[i : i + len(seg), 0] += seg * gain * np.cos(a)
    buf[i : i + len(seg), 1] += seg * gain * np.sin(a)


def piano(buf: np.ndarray, t: float, midi: int, vel: float = 0.6, pan: float = 0.0, length: float = 6.0, release: float | None = None) -> None:
    note = piano_note(midi, length)
    if release is not None and release < length:
        note = note.copy()
        r = int(release * RATE)
        tail = int(0.35 * RATE)
        note[r : r + tail] *= np.linspace(1, 0, len(note[r : r + tail]), dtype=np.float32)
        note[r + tail :] = 0
    # softer notes are also a little darker
    place(buf, note, t, gain=vel ** 1.6, pan=pan)


def sine(freq: float, dur: float, decay: float = 8.0, attack: float = 0.004, harmonics=((1, 1.0),)) -> np.ndarray:
    n = int(dur * RATE)
    tt = np.arange(n) / RATE
    sig = sum(a * np.sin(2 * np.pi * freq * h * tt) for h, a in harmonics)
    env = np.exp(-decay * tt) * np.minimum(1, tt / attack)
    return (sig * env).astype(np.float32)


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def noise(dur: float, seed: int = 0) -> np.ndarray:
    return np.random.default_rng(seed).standard_normal(int(dur * RATE)).astype(np.float32)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = butter(order, [lo, hi], btype="band", fs=RATE, output="sos")
    return sosfilt(sos, x, axis=0).astype(np.float32)


def lowpass(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    sos = butter(order, hz, btype="low", fs=RATE, output="sos")
    return sosfilt(sos, x, axis=0).astype(np.float32)


def highpass(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    sos = butter(order, hz, btype="high", fs=RATE, output="sos")
    return sosfilt(sos, x, axis=0).astype(np.float32)


def reverb(buf: np.ndarray, seconds: float = 2.4, wet: float = 0.25, seed: int = 7, tone: float = 5000) -> np.ndarray:
    """Convolution with decaying, filtered stereo noise: a soft hall."""
    n = int(seconds * RATE)
    rng = np.random.default_rng(seed)
    tt = np.arange(n) / RATE
    env = np.exp(-6.9 * tt / seconds)
    ir = rng.standard_normal((n, 2)).astype(np.float32) * env[:, None]
    ir = lowpass(ir, tone)
    ir[: int(0.012 * RATE)] = 0  # pre-delay
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True))
    out = np.stack([fftconvolve(buf[:, c], ir[:, c])[: len(buf)] for c in range(2)], axis=1).astype(np.float32)
    return buf * (1 - wet) + out * wet * 1.4


def envelope(times, values, duration: float) -> np.ndarray:
    """Piecewise-linear gain curve sampled per audio frame."""
    tt = np.arange(int(duration * RATE) + RATE) / RATE
    return np.interp(tt, times, values).astype(np.float32)


def normalize(buf: np.ndarray, peak_db: float = -1.0) -> np.ndarray:
    peak = np.abs(buf).max() or 1.0
    return buf * (10 ** (peak_db / 20) / peak)


def write_wav(path: Path, buf: np.ndarray, duration: float) -> None:
    buf = buf[: int(duration * RATE)]
    fade = int(0.05 * RATE)
    buf[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)[:, None]
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())
