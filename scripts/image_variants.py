#!/usr/bin/env python3
"""Write smaller copies of article images for phones.

An article image is stored at up to 1520 px wide, twice the 760 px column. A
phone shows it 320-390 CSS px wide (the viewport less 40 px of margin), so at
three device pixels per CSS pixel a 360 px phone needs 960 px and a 390 px
one 1050 px; the full copy is two to three times the bytes it needs.

For each JPEG or PNG wider than VARIANT_WIDTH under
blogs/assets/images/<slug>/, this writes `<name>.1080w.webp` next to it: 1080 px
wide, WebP at quality 78 (sharp sources such as screenshots at 88). The
original file stays as it is and remains the `src`, so share cards, feeds and
browsers that ignore `srcset` see what they saw before.

generate_blog_pages.py looks for the variant beside each local image and, when
it is there, emits `srcset="<name>.1080w.webp 1080w, <name>.jpg <width>w"` with a
`sizes` that matches the article column, so the browser picks the smaller one
whenever it is enough. Nothing else needs to change in the Markdown.

scripts/localize_images.py calls this for every image it writes. For an
article whose images are already in the repository:

    python3 scripts/image_variants.py <slug> [<slug> ...]
    python3 scripts/image_variants.py <slug> --force   # rewrite existing ones

then `make generate`.
"""

from __future__ import annotations

import argparse
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "blogs/assets/images"

VARIANT_WIDTH = 1080
VARIANT_SUFFIX = f".{VARIANT_WIDTH}w.webp"
PHOTO_QUALITY = 78
SHARP_QUALITY = 88
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def variant_path(image: Path) -> Path:
    return image.with_name(image.stem + VARIANT_SUFFIX)


def is_variant(path: Path) -> bool:
    return path.name.endswith(VARIANT_SUFFIX)


def is_sharp(image) -> bool:
    """Screenshots and posters with type keep more detail than photos.

    localize_images.py stores those as 4:4:4 JPEG (or PNG); photos are 4:2:0.
    """
    from PIL import JpegImagePlugin

    if image.format == "PNG":
        return True
    if image.format == "JPEG":
        return JpegImagePlugin.get_sampling(image) == 0  # 4:4:4
    return False


def write_variant(image_path: Path, force: bool = False) -> tuple[Path, int, int] | None:
    """Write the phone-size copy of one image; return (path, before, after).

    Returns None when the image is already narrow enough, or when the variant
    exists and `force` is false.
    """
    from PIL import Image

    if image_path.suffix.lower() not in SOURCE_SUFFIXES or is_variant(image_path):
        return None
    target = variant_path(image_path)
    if target.exists() and not force:
        return None

    with Image.open(image_path) as image:
        image.load()
        if image.width <= VARIANT_WIDTH:
            return None
        sharp = is_sharp(image)
        height = round(image.height * VARIANT_WIDTH / image.width)
        has_alpha = "A" in image.getbands() or image.mode == "P"
        resized = image.convert("RGBA" if has_alpha else "RGB").resize((VARIANT_WIDTH, height), Image.LANCZOS)

    out = io.BytesIO()
    # method=6 is the slowest, smallest encoding; exif/icc are not carried
    # over (the sources already have none and are sRGB).
    resized.save(out, "WEBP", quality=SHARP_QUALITY if sharp else PHOTO_QUALITY, method=6)
    data = out.getvalue()
    if len(data) >= image_path.stat().st_size:
        # Nothing to gain; leave no variant so the page keeps a single file.
        if target.exists():
            target.unlink()
        return None
    target.write_bytes(data)
    return target, image_path.stat().st_size, len(data)


def slug_from_arg(value: str) -> str:
    name = Path(value).name
    if name.endswith(".md"):
        name = name[: -len(".md")]
    return re.sub(r"\.[a-z]{2}(-[A-Za-z]+)?$", "", name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("articles", nargs="+", help="article slug or path to its Markdown")
    parser.add_argument("--force", action="store_true", help="rewrite variants that already exist")
    args = parser.parse_args()

    ok = True
    for value in args.articles:
        slug = slug_from_arg(value)
        folder = IMAGES_DIR / slug
        if not folder.is_dir():
            print(f"{slug}: no {folder.relative_to(ROOT)}")
            ok = False
            continue
        before = after = 0
        count = 0
        for image_path in sorted(folder.iterdir()):
            result = write_variant(image_path, force=args.force)
            if not result:
                continue
            target, size, variant_size = result
            before += size
            after += variant_size
            count += 1
            print(f"  {target.name}: {size / 1024:.0f} KB -> {variant_size / 1024:.0f} KB")
        if count:
            print(f"{slug}: {count} variant(s), {before / 1e6:.2f} MB -> {after / 1e6:.2f} MB")
        else:
            print(f"{slug}: nothing to write")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
