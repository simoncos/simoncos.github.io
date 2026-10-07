#!/usr/bin/env python3
"""Check reproducible page-weight budgets without a network or browser.

Initial assets are local stylesheet/script tags and non-lazy images in HTML.
Dynamic imports, CSS images, fonts and third-party transfers need browser
measurement; these totals deliberately do not claim to measure Web Vitals.
"""

from __future__ import annotations

import argparse
import gzip
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
BUDGET_PATH = ROOT / "data/performance_budgets.json"


class PageAssets(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.elements = 0
        self.scripts: set[str] = set()
        self.styles: set[str] = set()
        self.images: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.elements += 1
        attributes = dict(attrs)
        if tag == "script" and attributes.get("src"):
            self.scripts.add(attributes["src"])
        elif tag == "link" and "stylesheet" in (attributes.get("rel") or "").split():
            if attributes.get("href"):
                self.styles.add(attributes["href"])
        elif tag == "img" and attributes.get("loading") != "lazy" and attributes.get("src"):
            self.images.add(attributes["src"])


def gzip_size(data: bytes) -> int:
    return len(gzip.compress(data, compresslevel=9, mtime=0))


def local_assets(root: Path, page: Path, urls: set[str]) -> set[Path]:
    paths = set()
    for url in urls:
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc:
            continue
        path = unquote(parsed.path)
        asset = (root / path.lstrip("/") if path.startswith("/") else page.parent / path).resolve()
        if not asset.is_relative_to(root.resolve()) or not asset.is_file():
            raise ValueError(f"{page.relative_to(root)}: missing or invalid local asset {url}")
        paths.add(asset)
    return paths


def measure_page(root: Path, rel_path: str) -> dict[str, int]:
    page = root / rel_path
    data = page.read_bytes()
    parsed = PageAssets()
    parsed.feed(data.decode("utf-8"))
    scripts = local_assets(root, page, parsed.scripts)
    styles = local_assets(root, page, parsed.styles)
    images = local_assets(root, page, parsed.images)
    return {
        "html_gzip_bytes": gzip_size(data),
        "static_elements": parsed.elements,
        "initial_js_gzip_bytes": sum(gzip_size(path.read_bytes()) for path in scripts),
        "initial_css_gzip_bytes": sum(gzip_size(path.read_bytes()) for path in styles),
        "eager_image_bytes": sum(path.stat().st_size for path in images),
    }


def measure(root: Path, budgets: dict) -> dict:
    return {
        "pages": {path: measure_page(root, path) for path in budgets["pages"]},
        "assets": {path: {"gzip_bytes": gzip_size((root / path).read_bytes())}
                   for path in budgets["assets"]},
    }


def check_limits(measurements: dict, budgets: dict) -> list[str]:
    errors = []
    for group in ("pages", "assets"):
        for path, entry in budgets[group].items():
            for metric, maximum in entry["limits"].items():
                actual = measurements[group][path][metric]
                if actual > maximum:
                    errors.append(f"{path}: {metric} {actual:,} exceeds budget {maximum:,}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--measure", action="store_true", help="Print current weights; never change budgets.")
    args = parser.parse_args()
    budgets = json.loads(BUDGET_PATH.read_text())
    try:
        measurements = measure(ROOT, budgets)
    except (OSError, ValueError) as error:
        print(f"Performance measurement failed: {error}")
        return 1
    if args.measure:
        print(json.dumps(measurements, indent=2))
        return 0
    errors = check_limits(measurements, budgets)
    if errors:
        print("Performance budget exceeded:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"Performance budgets passed: {len(measurements['pages'])} pages, {len(measurements['assets'])} assets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
