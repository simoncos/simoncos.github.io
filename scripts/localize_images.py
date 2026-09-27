#!/usr/bin/env python3
"""Move an article's R2-hosted images into the repository.

Article images used to be linked straight from the Obsidian upload bucket on
R2: phone originals of 2-15 MB, most tagged Display P3. This downloads each
one, writes a web copy and points the article at it:

- EXIF orientation is applied and any colour profile is converted to sRGB (the
  copy carries no profile, so browsers read it as sRGB);
- the copy fits within 1520 x 2026 px, twice the 760 px article column;
- photos are progressive JPEG at quality 82, or 75 when that is still over
  400 KB; PNG sources (screenshots, posters with type) are quality 90 with
  4:4:4 chroma so text stays sharp;
- a JPEG under 400 KB that needs none of that is only stripped of metadata,
  losslessly, with jpegtran.

Copies land in blogs/assets/images/<slug>/<R2 file name>.jpg, and every
Markdown file of the article (both languages) is rewritten to use them. Run
`make generate` afterwards. scripts/check_site.py fails on an article image
over 1 MB and lists the articles that still load images from R2.

Usage:
    python3 scripts/localize_images.py <slug> [<slug> ...]
    python3 scripts/localize_images.py blogs/<slug>.md --dry-run

Needs Pillow; jpegtran is optional.
"""

from __future__ import annotations

import argparse
import io
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BLOGS_DIR = ROOT / "blogs"
IMAGES_DIR = BLOGS_DIR / "assets/images"

MAX_WIDTH, MAX_HEIGHT = 1520, 2026
SOFT_BYTES = 400 * 1024
MAX_BYTES = 1_000_000  # scripts/check_site.py enforces the same limit
PHOTO_QUALITIES = (82, 75, 70, 65, 60)
SHARP_QUALITIES = (90, 85, 80, 75, 70)
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
TIMEOUT_SECONDS = 60

R2_URL = re.compile(r"https://[A-Za-z0-9.-]+\.r2\.dev/[^\s)\"'<>]+")


def article_files(slug: str) -> list[Path]:
    """The article's Markdown in every language: <slug>.md, <slug>.en.md."""
    files = [BLOGS_DIR / f"{slug}.md", *sorted(BLOGS_DIR.glob(f"{slug}.*.md"))]
    return [path for path in files if path.is_file()]


def slug_from_arg(value: str) -> str:
    name = Path(value).name
    if name.endswith(".md"):
        name = name[: -len(".md")]
    # blogs/foo.en.md and foo name the same article.
    return re.sub(r"\.[a-z]{2}(-[A-Za-z]+)?$", "", name)


def r2_image_urls(text: str) -> list[str]:
    """R2 image URLs in a Markdown file, in order of first appearance."""
    seen: dict[str, None] = {}
    for url in R2_URL.findall(text):
        if Path(urlparse(url).path).suffix.lower() in IMAGE_SUFFIXES:
            seen.setdefault(url, None)
    return list(seen)


def local_name(url: str, extension: str) -> str:
    """R2 names files by content hash, so the stem is already unique."""
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-", Path(urlparse(url).path).stem).strip("-")
    return f"{stem or 'image'}{extension}"


def rewrite(text: str, replacements: dict[str, str]) -> str:
    for url, rel in replacements.items():
        text = text.replace(url, rel)
    return text


def human(size: int) -> str:
    return f"{size / 1e6:.1f} MB" if size >= 1_000_000 else f"{size / 1e3:.0f} KB"


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "simoncos-site-build/1.0"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        return response.read()


def encode(data: bytes, suffix: str) -> tuple[bytes, str, str]:
    """Return (bytes, file extension, what was done) for one source image."""
    from PIL import Image, ImageCms, ImageOps

    image = Image.open(io.BytesIO(data))
    if getattr(image, "is_animated", False):
        raise ValueError("animated image; copy it by hand so the animation survives")
    image.load()
    icc = image.info.get("icc_profile")
    orientation = image.getexif().get(0x0112, 1)
    is_jpeg = image.format == "JPEG"
    fits = image.width <= MAX_WIDTH and image.height <= MAX_HEIGHT

    if is_jpeg and fits and not icc and orientation == 1 and len(data) <= SOFT_BYTES and shutil.which("jpegtran"):
        stripped = subprocess.run(
            ["jpegtran", "-copy", "none", "-optimize", "-progressive"],
            input=data, capture_output=True, check=True,
        ).stdout
        if len(stripped) <= len(data):
            return stripped, ".jpg", "metadata stripped (lossless)"
        return data, ".jpg", "kept as is"

    image = ImageOps.exif_transpose(image)
    notes = []
    if icc:
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        try:
            image = ImageCms.profileToProfile(
                image, ImageCms.ImageCmsProfile(io.BytesIO(icc)), ImageCms.createProfile("sRGB"),
                renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC, outputMode=image.mode,
            )
            notes.append("profile converted to sRGB")
        except (ImageCms.PyCMSError, OSError):
            # A grey or broken profile: the pixels are used as they are.
            notes.append("profile could not be applied, ignored")

    scale = min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height, 1.0)
    if scale < 1.0:
        image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        notes.append(f"resized to {image.width}x{image.height}")

    if "A" in image.getbands() or image.mode == "P":
        rgba = image.convert("RGBA")
        if rgba.getchannel("A").getextrema()[0] < 255:
            # Real transparency: JPEG would paint it black, so keep a PNG.
            out = io.BytesIO()
            rgba.save(out, "PNG", optimize=True)
            return out.getvalue(), ".png", ", ".join(["PNG (has transparency)", *notes])
        image = rgba.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")

    sharp = suffix == ".png"
    qualities, subsampling = (SHARP_QUALITIES, "4:4:4") if sharp else (PHOTO_QUALITIES, "4:2:0")
    for index, quality in enumerate(qualities):
        out = io.BytesIO()
        image.save(out, "JPEG", quality=quality, subsampling=subsampling, optimize=True, progressive=True)
        budget = SOFT_BYTES if index == 0 and not sharp else MAX_BYTES
        if out.tell() <= budget:
            break
    return out.getvalue(), ".jpg", ", ".join([f"JPEG q{quality} {subsampling}", *notes])


def localize(slug: str, dry_run: bool) -> bool:
    files = article_files(slug)
    if not files:
        print(f"{slug}: no blogs/{slug}.md")
        return False

    texts = {path: path.read_text(encoding="utf-8") for path in files}
    urls = list(dict.fromkeys(url for text in texts.values() for url in r2_image_urls(text)))
    if not urls:
        print(f"{slug}: no R2 images")
        return True

    print(f"{slug}: {len(urls)} R2 image(s)")
    target_dir = IMAGES_DIR / slug
    replacements: dict[str, str] = {}
    ok = True
    for url in urls:
        suffix = Path(urlparse(url).path).suffix.lower()
        existing = [target_dir / local_name(url, ext) for ext in (".jpg", ".png")]
        done = next((path for path in existing if path.exists()), None)
        if done:
            replacements[url] = done.relative_to(BLOGS_DIR).as_posix()
            print(f"  = {done.name} (already in the repo)")
            continue
        if dry_run:
            print(f"  would fetch {url}")
            continue
        try:
            original = download(url)
            data, extension, how = encode(original, suffix)
        except Exception as error:  # noqa: BLE001 - report and keep going
            print(f"  ! {url}: {error}")
            ok = False
            continue
        target = target_dir / local_name(url, extension)
        target_dir.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        replacements[url] = target.relative_to(BLOGS_DIR).as_posix()
        warning = "  ! over 1 MB, make check will fail" if len(data) > MAX_BYTES else ""
        print(f"  {target.name}: {human(len(original))} -> {human(len(data))}, {how}{warning}")

    for path, text in texts.items():
        updated = rewrite(text, replacements)
        if updated != text:
            if dry_run:
                print(f"  would rewrite {path.relative_to(ROOT)}")
            else:
                path.write_text(updated, encoding="utf-8")
                print(f"  rewrote {path.relative_to(ROOT)}")
    return ok


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("articles", nargs="+", help="article slug or path to its Markdown")
    parser.add_argument("--dry-run", action="store_true", help="list what would change, fetch nothing")
    args = parser.parse_args()

    slugs = list(dict.fromkeys(slug_from_arg(value) for value in args.articles))
    results = [localize(slug, args.dry_run) for slug in slugs]
    if not args.dry_run:
        print("Next: make generate, then make check.")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
