#!/usr/bin/env python3
"""Render 1200x630 social share cards in the site's editorial style.

Link previews need a raster landscape image. The site had only a 460x460 icon
(fine for a small card, wrong for a large one) and, on the project pages, an
SVG -- which no major social platform accepts. These cards replace both.

Regenerate with: python3 scripts/generate_og_images.py
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

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
        "kicker": "RESEARCH",
        "title": "Ten Years of Sleep\nRecords, Analyzed",
        "subtitle": "3,656 nights of SleepCycle data, read as one decade.",
    },
]

# Versioned names let crawlers fetch the new artwork without reusing the old card.
ART_CARDS = ('og-site-v2.jpg', 'og-work-v2.jpg', 'og-endless-echoes-v1.jpg',
             'og-zhihu-2015-v1.jpg')


def render_art_cards():
    """Compose share posters from the works' own artwork, with readable type."""
    Image, ImageDraw, ImageFont = load_pillow()
    from PIL import ImageOps
    chinese = '/System/Library/Fonts/Supplemental/Songti.ttc'

    def font(size, zh=False):
        return load_font(ImageFont, chinese if zh else SERIF, size)

    def put(draw, xy, text, size, color, zh=False):
        draw.text(xy, text, font=font(size, zh), fill=color)

    def artwork(path, size):
        with Image.open(ROOT / path) as source:
            return ImageOps.fit(source.convert('RGB'), size, method=Image.Resampling.LANCZOS)

    def save(im, name):
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        im.save(OUT_DIR / name, quality=93, subsampling=0, optimize=True)

    for name, heading, chinese_heading in (
        ('og-site-v2.jpg', 'connecting', 'the dots.'),
        ('og-work-v2.jpg', 'Work', '作品'),
    ):
        im = Image.new('RGB', (WIDTH, HEIGHT), BG)
        draw = ImageDraw.Draw(im)
        put(draw, (64, 48), 'simoncos', 30, ACCENT)
        put(draw, (64, 150), heading, 76, INK)
        put(draw, (64, 240), chinese_heading, 68, INK, name == 'og-work-v2.jpg')
        draw.line((64, 365, 164, 365), fill=ACCENT, width=3)
        put(draw, (64, 390), 'Apps · Research · Music', 26, MUTED)
        put(draw, (64, 433), '应用 · 研究 · 音乐 · 分享', 26, MUTED, True)
        put(draw, (64, 558), 'simoncos.github.io', 24, MUTED)
        for path, box in (
            ('gallery/music/assets/endless-echoes-garden-v5.webp', (580, 42, 570, 340)),
            ('gallery/assets/gallery-card-sleep-scatter.webp', (580, 398, 277, 190)),
            ('gallery/assets/gallery-card-problem-solving.webp', (873, 398, 277, 190)),
        ):
            x, y, w, h = box
            im.paste(artwork(path, (w, h)), (x, y))
        save(im, name)

    im = Image.new('RGB', (WIDTH, HEIGHT), '#11151b')
    im.paste(artwork('gallery/music/assets/endless-echoes-garden-v5.webp', (720, HEIGHT)), (480, 0))
    # An opaque text panel keeps the work legible even in a small link preview.
    draw = ImageDraw.Draw(im)
    put(draw, (58, 48), 'MUSIC RIDDLE / 音乐谜题', 23, '#d3ba93', True)
    put(draw, (58, 162), '漫无止尽', 62, '#fbf1de', True)
    put(draw, (58, 243), '的回响', 62, '#fbf1de', True)
    put(draw, (58, 348), 'Endless Echoes', 43, '#fbf1de')
    import json
    songs = json.loads((ROOT / 'data/music-riddle.json').read_text())
    count = len(songs['nodes']) - bool(songs.get('bonus'))
    put(draw, (58, 444), f'{count} 首歌，一场音乐谜题', 26, '#d3ba93', True)
    put(draw, (58, 561), 'simoncos.github.io', 23, '#b7b9b9')
    save(im, 'og-endless-echoes-v1.jpg')

    im = Image.new('RGB', (WIDTH, HEIGHT), '#111d2b')
    draw = ImageDraw.Draw(im)
    svg = (ROOT / 'gallery/research/assets/zhihu-network-card.svg').read_text()
    # Plot the archived cover's actual edges and nodes; no invented network.
    def point(x, y):
        return (535 + float(x) * .66, 55 + float(y) * .66)
    for x1, y1, x2, y2 in re.findall(r'M([\d.]+),([\d.]+)L([\d.]+),([\d.]+)', svg):
        draw.line((*point(x1, y1), *point(x2, y2)), fill='#30475a')
    for tag in re.findall(r'<circle\b[^>]+>', svg):
        attrs = dict(re.findall(r'([\w-]+)="([^"]+)"', tag))
        x, y = point(attrs['cx'], attrs['cy'])
        r = max(2, float(attrs['r']) * .66)
        draw.ellipse((x-r, y-r, x+r, y+r), fill=attrs.get('fill', '#6fb5bf'))
    put(draw, (58, 48), 'RESEARCH / 社交网络研究', 24, '#8fb7be', True)
    put(draw, (58, 178), '知乎 2015', 64, '#fbf1de', True)
    put(draw, (58, 281), '人、关注', 48, '#fbf1de', True)
    put(draw, (58, 346), '与影响力', 48, '#fbf1de', True)
    put(draw, (58, 461), 'People. Connections. Influence.', 25, '#8fb7be')
    put(draw, (58, 561), 'simoncos.github.io', 23, '#8fb7be')
    save(im, 'og-zhihu-2015-v1.jpg')




def load_pillow():
    """Imported lazily: --check only looks for the files on disk, so CI does
    not need an image library just to verify they are present."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("Rendering the share cards needs Pillow: pip3 install Pillow")
        raise SystemExit(1)
    return Image, ImageDraw, ImageFont


def load_font(ImageFont, path: str, size: int):
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
    Image, ImageDraw, ImageFont = load_pillow()
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    kicker_font = load_font(ImageFont, SANS, 24)
    title_font = load_font(ImageFont, SERIF_BOLD, 78)
    subtitle_font = load_font(ImageFont, SANS, 30)

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
    footer_font = load_font(ImageFont, SERIF, 28)
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
        names = [c['name'] for c in CARDS] + list(ART_CARDS)
        missing = [name for name in names if not (OUT_DIR / name).exists()]
        if missing:
            print("Social share cards are missing:")
            for name in missing:
                print(f"- assets/og/{name}")
            print("Run: python3 scripts/generate_og_images.py")
            return 1
        print(f"Social share cards are present ({len(names)} card(s)).")
        return 0

    for card in CARDS:
        path = render(card)
        size_kb = path.stat().st_size // 1024
        print(f"  {WIDTH}x{HEIGHT}  {path.relative_to(ROOT)}  ({size_kb}KB)")
    render_art_cards()
    return 0


if __name__ == "__main__":
    sys.exit(main())
