#!/usr/bin/env python3
"""Render 1200x630 social share cards in the site's editorial style.

Link previews need a raster landscape image. The site had only a 460x460 icon
(fine for a small card, wrong for a large one) and, on the project pages, an
SVG -- which no major social platform accepts. These cards replace both.

Regenerate with: python3 scripts/generate_og_images.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover
    print("Pillow is required: pip3 install Pillow")
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets/og"

WIDTH, HEIGHT = 1200, 630
MARGIN = 84

# Mirrors --page-bg / --editorial-ink / --editorial-accent / --text-secondary.
BG = "#fbf7ee"
INK = "#16213a"
ACCENT = "#087687"
MUTED = "#4d5a72"

SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"

CARDS = [
    {
        "name": "og-default.png",
        "kicker": "SIMONC SITE",
        "title": "Tools and research,\nessays and field notes",
        "subtitle": "Projects, writing, and field notes from simoncos.",
    },
    {
        "name": "og-sleep-toolkit.png",
        "kicker": "PROJECT · WEB APP / CLI",
        "title": "Sleep Toolkit",
        "subtitle": "From raw SleepCycle records to readable reports.",
    },
    {
        "name": "og-sleep-2016-2026.png",
        "kicker": "VISUAL ESSAY",
        "title": "Ten Years of\nSleep Records",
        "subtitle": "3,656 nights of SleepCycle data, read as one decade.",
    },
]


def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default(size)


def wrap(draw, text: str, font, max_width: int) -> list[str]:
    """Wrap on explicit newlines first, then on width."""
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words, current = paragraph.split(), ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if draw.textlength(candidate, font=font) <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def render(card: dict) -> Path:
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    kicker_font = load_font(SANS, 24)
    title_font = load_font(SERIF_BOLD, 78)
    subtitle_font = load_font(SANS, 30)

    # Accent rule down the left edge, echoing the site's ledger frames.
    draw.rectangle([0, 0, 10, HEIGHT], fill=ACCENT)

    y = MARGIN
    draw.text((MARGIN, y), card["kicker"], font=kicker_font, fill=ACCENT)
    y += 62

    title_lines = wrap(draw, card["title"], title_font, WIDTH - 2 * MARGIN)
    for line in title_lines:
        draw.text((MARGIN, y), line, font=title_font, fill=INK)
        y += 92

    y += 18
    draw.line([MARGIN, y, MARGIN + 120, y], fill=ACCENT, width=3)
    y += 40

    for line in wrap(draw, card["subtitle"], subtitle_font, WIDTH - 2 * MARGIN):
        draw.text((MARGIN, y), line, font=subtitle_font, fill=MUTED)
        y += 42

    # Footer wordmark, baseline-aligned to the bottom margin.
    footer_font = load_font(SERIF, 28)
    draw.text(
        (MARGIN, HEIGHT - MARGIN - 28), "simoncos.github.io", font=footer_font, fill=MUTED
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / card["name"]
    image.save(out_path, "PNG", optimize=True)
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check", action="store_true", help="Fail if any card is missing (does not re-render)."
    )
    args = parser.parse_args()

    if args.check:
        missing = [c["name"] for c in CARDS if not (OUT_DIR / c["name"]).exists()]
        if missing:
            print("Social share cards are missing:")
            for name in missing:
                print(f"- assets/og/{name}")
            print("Run: python3 scripts/generate_og_images.py")
            return 1
        print(f"Social share cards are present ({len(CARDS)} card(s)).")
        return 0

    for card in CARDS:
        path = render(card)
        size_kb = path.stat().st_size // 1024
        print(f"  {WIDTH}x{HEIGHT}  {path.relative_to(ROOT)}  ({size_kb}KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
