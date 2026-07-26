#!/usr/bin/env python3
"""Record intrinsic sizes for externally hosted article images.

Article photos live on R2, so the generator cannot stat them the way it stats
local assets. Without width/height a lazy-loaded image reserves no space and
shifts the layout as it arrives. This script measures each remote image once
and checks the result in, which keeps `generate_blog_pages.py` offline and
deterministic: generation only ever reads the cache.

Only the leading bytes of each image are fetched (via a Range request when the
host allows it), so refreshing the cache costs kilobytes, not megabytes.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from generate_blog_pages import read_image_dimensions_from_bytes  # noqa: E402

CACHE_PATH = ROOT / "data/image_dimensions.json"
BLOGS_DIR = ROOT / "blogs"

# Enough for a JPEG start-of-frame marker sitting behind large EXIF/ICC
# segments; PNG and GIF need only the first two dozen bytes.
HEADER_BYTES = 128 * 1024
TIMEOUT_SECONDS = 20

# Posts use both Markdown image syntax and raw <img> tags (the latter when an
# image needs attributes Markdown cannot express), so scan for both.
IMAGE_PATTERNS = (
    re.compile(r"!\[[^\]]*\]\((https?://[^)\s]+?)(?:\s+[\"'][^\"']*[\"'])?\)"),
    re.compile(r"<img\b[^>]*?\bsrc\s*=\s*[\"'](https?://[^\"']+)[\"']", re.I),
)


def collect_remote_image_urls() -> list[str]:
    urls: set[str] = set()
    for md_file in sorted(BLOGS_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        for pattern in IMAGE_PATTERNS:
            urls.update(pattern.findall(text))
    return sorted(urls)


def load_cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"images": {}}


def fetch_header(url: str) -> bytes | None:
    request = urllib.request.Request(
        url,
        headers={
            "Range": f"bytes=0-{HEADER_BYTES - 1}",
            "User-Agent": "simoncos-site-build/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            return response.read(HEADER_BYTES)
    except (urllib.error.URLError, OSError, ValueError) as error:
        print(f"  ! fetch failed: {url} ({error})")
        return None


def measure(url: str) -> dict | None:
    data = fetch_header(url)
    if not data:
        return None

    suffix = Path(urlparse(url).path).suffix
    dimensions = read_image_dimensions_from_bytes(data, suffix)
    if not dimensions:
        print(f"  ! could not parse dimensions: {url}")
        return None

    width, height = dimensions
    return {"width": width, "height": height}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if any referenced remote image is missing from the cache (no network).",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Re-measure every image instead of only the missing ones.",
    )
    args = parser.parse_args()

    urls = collect_remote_image_urls()
    cache = load_cache()
    images = cache.setdefault("images", {})

    missing = [url for url in urls if url not in images]
    stale = [url for url in images if url not in urls]

    if args.check:
        if missing:
            print("Remote image dimensions are out of date:")
            for url in missing:
                print(f"- missing: {url}")
            print("Run: python3 scripts/update_image_dimensions.py")
            return 1
        print(f"Remote image dimensions are current ({len(urls)} image(s)).")
        return 0

    targets = urls if args.refresh else missing
    if targets:
        print(f"Measuring {len(targets)} remote image(s)...")
    for url in targets:
        result = measure(url)
        if result:
            images[url] = result
            print(f"  {result['width']}x{result['height']}  {url.rsplit('/', 1)[-1]}")

    for url in stale:
        del images[url]
        print(f"  - dropped unreferenced: {url.rsplit('/', 1)[-1]}")

    cache["images"] = {url: images[url] for url in sorted(images)}
    CACHE_PATH.write_text(
        json.dumps(cache, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    resolved = len(cache["images"])
    unresolved = [url for url in urls if url not in cache["images"]]
    print(f"Cached {resolved} of {len(urls)} referenced image(s).")
    if unresolved:
        print("Still unresolved (generation will omit width/height for these):")
        for url in unresolved:
            print(f"- {url}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
