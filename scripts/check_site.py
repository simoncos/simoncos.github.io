#!/usr/bin/env python3
"""Static checks for the simonc site.

The site is intentionally simple, so this stays dependency-free and checks the
things that are easiest to miss when editing static HTML by hand.
"""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://simoncos.github.io"
IGNORED_LOCAL_SCHEMES = {
    "blob",
    "data",
    "http",
    "https",
    "javascript",
    "mailto",
    "tel",
}


class HtmlDoc(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.title_parts: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag.lower(), {key.lower(): value or "" for key, value in attrs}))
        if tag.lower() == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return " ".join(part.strip() for part in self.title_parts if part.strip()).strip()

    def meta(self, **expected: str) -> str:
        for tag, attrs in self.tags:
            if tag != "meta":
                continue
            if all(attrs.get(key.lower()) == value for key, value in expected.items()):
                return attrs.get("content", "").strip()
        return ""

    def canonical(self) -> str:
        for tag, attrs in self.tags:
            if tag != "link":
                continue
            rel_values = {part.strip().lower() for part in attrs.get("rel", "").split()}
            if "canonical" in rel_values:
                return attrs.get("href", "").strip()
        return ""


def parse_html(path: Path) -> HtmlDoc:
    doc = HtmlDoc()
    doc.feed(path.read_text(encoding="utf-8", errors="ignore"))
    return doc


def iter_html_files() -> list[Path]:
    excluded_parts = {".git", "templates", "node_modules"}
    return sorted(
        path
        for path in ROOT.rglob("*.html")
        if not excluded_parts.intersection(path.relative_to(ROOT).parts)
    )


def local_target_exists(source_file: Path, raw_url: str) -> bool:
    if not raw_url or raw_url.startswith("#") or raw_url.startswith("//"):
        return True

    parsed = urlparse(raw_url)
    if parsed.scheme.lower() in IGNORED_LOCAL_SCHEMES:
        return True

    clean_path = unquote(parsed.path)
    if not clean_path:
        return True

    target = ROOT / clean_path.lstrip("/") if clean_path.startswith("/") else source_file.parent / clean_path
    return target.exists()


def check_local_refs(errors: list[str]) -> None:
    ref_attrs = {"href", "src", "poster"}
    for html_file in iter_html_files():
        doc = parse_html(html_file)
        for tag, attrs in doc.tags:
            for attr in ref_attrs:
                raw_url = attrs.get(attr)
                if raw_url and not local_target_exists(html_file, raw_url):
                    rel = html_file.relative_to(ROOT)
                    errors.append(f"{rel}: missing local {attr} target {raw_url!r}")


def sitemap_local_path(loc: str) -> Path | None:
    parsed = urlparse(loc)
    if f"{parsed.scheme}://{parsed.netloc}" != SITE_ORIGIN:
        return None
    if parsed.path in ("", "/"):
        return ROOT / "index.html"
    return ROOT / parsed.path.lstrip("/")


def site_url_for_path(path: str) -> str:
    normalized = path.lstrip("/")
    if normalized in ("", "index.html"):
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{normalized}"


def expected_sitemap_urls() -> set[str]:
    expected = {
        site_url_for_path(path)
        for path in (
            "index.html",
            "gallery.html",
            "blogs.html",
            "projects.html",
            "tags.html",
            "series.html",
            "about.html",
        )
    }

    groups_payload = json.loads((ROOT / "data/article_groups.json").read_text(encoding="utf-8"))
    for group in groups_payload.get("groups", []):
        for entry in (group.get("languages") or {}).values():
            html_file = entry.get("file")
            if html_file:
                expected.add(site_url_for_path(f"blogs/{html_file}"))

    for rel_path, collection_key in (("data/gallery_data.json", "items"), ("data/projects_data.json", "projects")):
        payload = json.loads((ROOT / rel_path).read_text(encoding="utf-8"))
        for item in payload.get(collection_key, []):
            for target in (item.get("paths") or {}).values():
                if target and not is_external(target) and target.endswith(".html"):
                    expected.add(site_url_for_path(target))

    return expected


def check_sitemap(errors: list[str]) -> None:
    sitemap_path = ROOT / "sitemap.xml"
    if not sitemap_path.exists():
        errors.append("sitemap.xml is missing")
        return

    tree = ElementTree.parse(sitemap_path)
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [element.text or "" for element in tree.findall(".//sm:loc", namespace)]
    if not locs:
        errors.append("sitemap.xml has no <loc> entries")

    missing_expected = expected_sitemap_urls() - set(locs)
    for loc in sorted(missing_expected):
        errors.append(f"sitemap is missing expected public URL: {loc}")

    for loc in locs:
        local_path = sitemap_local_path(loc)
        if local_path is None:
            errors.append(f"sitemap contains non-site URL: {loc}")
            continue
        if not local_path.exists():
            errors.append(f"sitemap URL has no local file: {loc}")
            continue
        if local_path.suffix != ".html":
            continue

        doc = parse_html(local_path)
        rel = local_path.relative_to(ROOT)
        description = doc.meta(name="description")
        canonical = doc.canonical()
        if not doc.title:
            errors.append(f"{rel}: missing <title>")
        if not description:
            errors.append(f"{rel}: missing meta description")
        if canonical != loc:
            errors.append(f"{rel}: canonical {canonical!r} does not match sitemap loc {loc!r}")


def extract_data_pages(text: str) -> list[str]:
    return re.findall(r'data-page=["\']([^"\']+)["\']', text)


def check_nav_fallback(errors: list[str]) -> None:
    nav_pages = extract_data_pages((ROOT / "navigation.html").read_text(encoding="utf-8"))
    load_nav = (ROOT / "src/js/load-nav.js").read_text(encoding="utf-8")
    match = re.search(r"function renderFallbackNav\(\).*?navigationPlaceholder\.innerHTML = `(?P<html>.*?)`;", load_nav, re.S)
    fallback_pages = extract_data_pages(match.group("html")) if match else []

    if nav_pages != fallback_pages:
        errors.append(f"navigation fallback drift: navigation={nav_pages}, fallback={fallback_pages}")


def is_external(value: str) -> bool:
    return bool(urlparse(value).scheme)


def check_json_assets(errors: list[str]) -> None:
    payload_specs = [
        ("data/gallery_data.json", "items"),
        ("data/projects_data.json", "projects"),
    ]

    for rel_path, collection_key in payload_specs:
        data_path = ROOT / rel_path
        payload = json.loads(data_path.read_text(encoding="utf-8"))
        for item in payload.get(collection_key, []):
            item_id = item.get("id", "<unknown>")
            cover = item.get("cover")
            if cover and not is_external(cover) and not (ROOT / cover).exists():
                errors.append(f"{rel_path}: {item_id} cover is missing: {cover}")
            for language, target in (item.get("paths") or {}).items():
                if target and not is_external(target) and not (ROOT / target).exists():
                    errors.append(f"{rel_path}: {item_id} {language} path is missing: {target}")

    groups_path = ROOT / "data/article_groups.json"
    groups_payload = json.loads(groups_path.read_text(encoding="utf-8"))
    for group in groups_payload.get("groups", []):
        group_id = group.get("id", "<unknown>")
        for language, entry in (group.get("languages") or {}).items():
            html_file = entry.get("file")
            markdown_file = entry.get("markdown")
            if html_file and not (ROOT / "blogs" / html_file).exists():
                errors.append(f"article group {group_id}/{language}: HTML is missing: {html_file}")
            if markdown_file and not (ROOT / "blogs" / markdown_file).exists():
                errors.append(f"article group {group_id}/{language}: markdown is missing: {markdown_file}")


def check_css_cache_keys(errors: list[str]) -> None:
    versions: set[str] = set()
    pattern = re.compile(r"src/css/styles\.css\?v=([A-Za-z0-9._-]+)")
    for html_file in iter_html_files() + sorted((ROOT / "templates").glob("*.html")):
        versions.update(pattern.findall(html_file.read_text(encoding="utf-8", errors="ignore")))
    if len(versions) > 1:
        errors.append(f"multiple styles.css cache keys found: {sorted(versions)}")
    if not versions:
        errors.append("no styles.css cache key found")


def check_preview_domains(errors: list[str]) -> None:
    preview_domain = "simoncos-project-previews.vercel.app"
    for html_file in iter_html_files():
        text = html_file.read_text(encoding="utf-8", errors="ignore")
        if preview_domain in text:
            errors.append(f"{html_file.relative_to(ROOT)} still references {preview_domain}")


def main() -> int:
    errors: list[str] = []
    check_local_refs(errors)
    check_sitemap(errors)
    check_nav_fallback(errors)
    check_json_assets(errors)
    check_css_cache_keys(errors)
    check_preview_domains(errors)

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Site checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
