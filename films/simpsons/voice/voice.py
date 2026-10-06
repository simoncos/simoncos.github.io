#!/usr/bin/env python3
"""Narration for the Simpson film, read by Kokoro (open source, Apache 2.0).

Reads lines.<lang>.json, synthesises each line, and fits the film to the
voice: every line owns a window of scene time [a, b], which is stretched or
squeezed so the line fits with some air, while the gaps between lines keep
their length. Writes

  voice.<lang>.js    window.VOICE: the warp (scene time ↔ film time), the
                     lines with their film times, and the film's duration;
                     the scene loads it to draw in film time.
  voice.<lang>.json  the same, for score.py.
  ../out/voice.<lang>.wav   the narration placed on the film's clock.

Kokoro's model files come from github.com/thewh1teagle/kokoro-onnx (releases,
model-files-v1.0); set KOKORO_DIR to the folder holding kokoro-v1.0.onnx and
voices-v1.0.bin. Needs: pip install kokoro-onnx soundfile "misaki[zh]".

    python films/simpsons/voice/voice.py zh
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
SCENE_DURATION = 158.0
LEAD = 0.3          # the voice starts this long after its caption appears
AIR = 0.55          # and leaves this much before the window closes
MIN_STRETCH = 0.7   # a window may shrink to 70% of its scene length, no more
# The Chinese G2P passes Latin letters through untouched, and the model then
# swallows them. Spell them as Mandarin speakers say them.
LETTERS = {"A": "ei→", "B": "pi→"}


def trim(audio: np.ndarray, rate: int) -> np.ndarray:
    """Cut the model's leading and trailing silence."""
    idx = np.flatnonzero(np.abs(audio) > 0.01)
    return audio[max(0, idx[0] - int(0.03 * rate)) : idx[-1] + int(0.08 * rate)] if len(idx) else audio


def pauses(whole: np.ndarray, rate: int) -> list[float]:
    """Centres (s) of the pauses in a read: runs of 10 ms frames below 3% of the peak, 50 ms or longer."""
    hop = int(0.01 * rate)
    env = np.sqrt(np.convolve(whole ** 2, np.ones(hop) / hop, mode="same"))[::hop]
    quiet = env < 0.03 * env.max()
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if j - i >= 5:
                out.append((i + j) / 2 * hop / rate)
            i = j
        else:
            i += 1
    return out


def split(whole: np.ndarray, prefixes: list[float], rate: int) -> list[np.ndarray]:
    """Cut a paragraph's read into lines. prefixes[i] is how long the read of
    the paragraph's first i+1 lines alone lasts: where line i ends, give or
    take. Each cut goes to the pause nearest it, within 0.45 s."""
    found = pauses(whole, rate)
    cuts = []
    for est in prefixes:
        near = [p for p in found if abs(p - est) <= 0.45 and (not cuts or p * rate > cuts[-1])]
        cut = min(near, key=lambda p: abs(p - est)) if near else est
        cuts.append(int(cut * rate))
    edges = [0] + cuts + [len(whole)]
    return [whole[c0:c1] for c0, c1 in zip(edges, edges[1:])]


def main() -> None:
    lang = sys.argv[1] if len(sys.argv) > 1 else "zh"
    spec = json.loads((HERE / f"lines.{lang}.json").read_text())
    from kokoro_onnx import Kokoro

    kdir = Path(os.environ.get("KOKORO_DIR", "/home/user/tts"))
    kokoro = Kokoro(str(kdir / "kokoro-v1.0.onnx"), str(kdir / "voices-v1.0.bin"))
    g2p = None
    if lang == "zh":
        from misaki import zh
        g2p = zh.ZHG2P()

    rate = 24000

    def say(text: str) -> np.ndarray:
        nonlocal rate
        if g2p:
            phonemes, _ = g2p(text)
            phonemes = re.sub(r"(?<![A-Za-z])([AB])(?![A-Za-z])", lambda m: LETTERS[m.group(1)], phonemes)
            audio, rate = kokoro.create(phonemes, voice=spec["voice"], speed=spec.get("speed", 1.0), is_phonemes=True)
        else:
            audio, rate = kokoro.create(text, voice=spec["voice"], speed=spec.get("speed", 1.0), lang="en-us")
        return trim(audio.astype(np.float32), rate)

    lines = spec["lines"]
    clips = [say(l["say"]) for l in lines]          # each line alone, for its length
    joined = [False] * len(lines)                    # True: follows the previous line within a paragraph
    if "--paragraphs" in sys.argv:
        # Read each paragraph in one go, so the sentences flow into each other, then
        # cut it back into lines at the pauses nearest where each line should end.
        for group in spec.get("paragraphs", []):
            if len(group) < 2:
                continue
            whole = say("".join(lines[i]["say"] for i in group))
            prefixes = [len(say("".join(lines[j]["say"] for j in group[: k + 1]))) / rate for k in range(len(group) - 1)]
            parts = split(whole, prefixes, rate)
            for k, (i, part) in enumerate(zip(group, parts)):
                clips[i] = part
                joined[i] = k > 0

    # the warp: scene time → film time
    warp = [[0.0, 0.0]]
    s_prev = f_prev = 0.0
    out_lines = []
    for n, (line, clip) in enumerate(zip(lines, clips)):
        d = len(clip) / rate
        a, b = line["a"], line["b"]
        last_in_para = n + 1 >= len(lines) or not joined[n + 1]
        lead = 0.0 if joined[n] else LEAD
        air = AIR if last_in_para else 0.0      # inside a paragraph, the read's own pause is the gap
        fa = f_prev + max(0.0, a - s_prev)
        fb = fa + max(lead + d + air, MIN_STRETCH * (b - a))
        warp += [[a, round(fa, 4)], [b, round(fb, 4)]]
        out_lines.append({**line, "fa": round(fa, 4), "fb": round(fb, 4), "voice_at": round(fa + lead, 4), "voice_len": round(d, 4)})
        s_prev, f_prev = b, fb
    duration = round(f_prev + (SCENE_DURATION - s_prev), 3)
    warp.append([SCENE_DURATION, duration])

    data = {"lang": lang, "voice": spec["voice"], "duration": duration, "warp": warp, "lines": out_lines}
    (HERE / f"voice.{lang}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))
    (HERE / f"voice.{lang}.js").write_text(f"// Generated by voice.py. Do not edit.\nwindow.VOICE = {json.dumps(data, ensure_ascii=False)};\n")

    # the narration on the film's clock
    track = np.zeros(int((duration + 1) * rate), dtype=np.float32)
    for line, clip in zip(out_lines, clips):
        i = int(line["voice_at"] * rate)
        track[i : i + len(clip)] += clip[: len(track) - i]
    out = HERE.parent / "out"
    out.mkdir(exist_ok=True)
    tmp = out / f"voice.{lang}.24k.wav"
    sf.write(tmp, track, rate)
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(tmp), "-ar", "48000", "-ac", "2", str(out / f"voice.{lang}.wav")], check=True)
    tmp.unlink()
    print(f"{len(out_lines)} lines, film {duration:.1f} s (scene {SCENE_DURATION} s)")
    for l in out_lines:
        k = (l["fb"] - l["fa"]) / (l["b"] - l["a"])
        print(f"  {l['a']:6.1f}–{l['b']:6.1f} → {l['fa']:6.1f}–{l['fb']:6.1f}  ×{k:.2f}  voice {l['voice_len']:.1f}s  {l['say'][:18]}")


if __name__ == "__main__":
    main()
