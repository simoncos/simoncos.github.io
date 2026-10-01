#!/usr/bin/env python3
"""Measure a song's loudness for the waveform on its page.

The Music pages draw the recording as a row of bars. Each bar is the RMS
level of one slice of the song, scaled so the loudest slice is 100. The bars
are measured here, once per recording, because the build has no audio
decoder: run this by hand after adding or replacing an MP3, and commit the
JSON beside it.

    python3 scripts/song_peaks.py gallery/music/qingtian.mp3

Needs ffmpeg on PATH.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from array import array
from pathlib import Path

RATE = 8000
BARS = 120


def peaks(mp3: Path, bars: int) -> tuple[float, list[int]]:
    raw = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    samples = array("f")
    samples.frombytes(raw)
    size = len(samples) / bars
    levels = []
    for i in range(bars):
        chunk = samples[round(i * size):round((i + 1) * size)]
        levels.append(math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))))
    top = max(levels) or 1
    return round(len(samples) / RATE, 2), [round(100 * level / top) for level in levels]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mp3", type=Path)
    parser.add_argument("--bars", type=int, default=BARS)
    args = parser.parse_args()
    duration, bars = peaks(args.mp3, args.bars)
    out = args.mp3.with_suffix(".peaks.json")
    out.write_text(json.dumps({"duration": duration, "peaks": bars}, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{out}: {len(bars)} bars, {duration} s")


if __name__ == "__main__":
    main()
