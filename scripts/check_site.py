#!/usr/bin/env python3
"""Static checks for the simonc site.

The site is intentionally simple, so this stays dependency-free and checks the
things that are easiest to miss when editing static HTML by hand.
"""

from __future__ import annotations

import json
import re
import struct
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
    # Hidden directories hold tooling, not site pages. Agent worktrees under
    # .claude/worktrees are full checkouts of other revisions and must not be
    # checked as part of this one.
    excluded_parts = {"templates", "node_modules"}
    return sorted(
        path
        for path in ROOT.rglob("*.html")
        if not any(
            part.startswith(".") or part in excluded_parts
            for part in path.relative_to(ROOT).parts[:-1]
        )
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
    # data-zh-href is the Chinese twin of href (site.js swaps them), and
    # data-float is the image a hover preview loads.
    ref_attrs = {"href", "src", "poster", "data-zh-href", "data-float"}
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
            "about.html",
        )
    }

    article_index = json.loads((ROOT / "data/article_index.json").read_text(encoding="utf-8"))
    for group in article_index.get("groups", []):
        for entry in (group.get("languages") or {}).values():
            html_file = entry.get("file")
            if html_file:
                expected.add(site_url_for_path(f"blogs/{html_file}"))

    expected.add(site_url_for_path("favorites.html"))
    favorites_payload = json.loads((ROOT / "data/favorites.json").read_text(encoding="utf-8"))
    for category in favorites_payload.get("categories", []):
        expected.add(site_url_for_path(f"favorites/{category['id']}.html"))

    site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
    for item in [*site.get("works", []), *site.get("projects", [])]:
        for target in localized_values(item.get("href")):
            if not is_external(target) and target.endswith(".html"):
                expected.add(site_url_for_path(target))

    return expected


def localized_values(value: object) -> list[str]:
    """A string, or the values of an {en, zh} object."""
    if isinstance(value, dict):
        return [str(item) for item in value.values() if item]
    return [str(value)] if value else []


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
        robots = doc.meta(name="robots").lower()
        if not doc.title:
            errors.append(f"{rel}: missing <title>")
        if not description:
            errors.append(f"{rel}: missing meta description")
        if canonical != loc:
            errors.append(f"{rel}: canonical {canonical!r} does not match sitemap loc {loc!r}")
        if "noindex" in {part.strip() for part in robots.split(",")}:
            errors.append(f"{rel}: sitemap page must not declare noindex")

        required_open_graph = {
            "og:title": doc.meta(property="og:title"),
            "og:description": doc.meta(property="og:description"),
            "og:image": doc.meta(property="og:image"),
        }
        for property_name, value in required_open_graph.items():
            if not value:
                errors.append(f"{rel}: missing {property_name} metadata")
        og_url = doc.meta(property="og:url")
        if og_url != loc:
            errors.append(f"{rel}: og:url {og_url!r} does not match sitemap loc {loc!r}")


def check_embedded_pages_are_noindex(errors: list[str]) -> None:
    embedded_pages = ROOT / "blogs" / "assets" / "pages"
    if not embedded_pages.is_dir():
        return
    for html_file in sorted(embedded_pages.glob("*.html")):
        robots = parse_html(html_file).meta(name="robots").lower()
        directives = {part.strip() for part in robots.split(",")}
        if "noindex" not in directives:
            errors.append(f"{html_file.relative_to(ROOT)}: embedded support page must declare noindex")


def check_site_data(errors: list[str]) -> None:
    """Every local image and link named in data/site.json exists."""
    site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
    keys = {"img", "href", "cover", "report_image", "essay_image", "essay_href"}

    def walk(value: object, trail: str) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key in keys:
                    for target in localized_values(item):
                        parsed = urlparse(target)
                        if parsed.scheme or not parsed.path:
                            continue
                        if not (ROOT / unquote(parsed.path)).exists():
                            errors.append(f"data/site.json: {trail}.{key} is missing: {target}")
                else:
                    walk(item, f"{trail}.{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                walk(item, f"{trail}[{index}]")

    walk(site, "site")


def is_external(value: str) -> bool:
    return bool(urlparse(value).scheme)


def parse_dimension_value(value: str) -> int | None:
    normalized = str(value or "").strip()
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)(?:px)?$", normalized)
    if not match:
        return None
    number = float(match.group(1))
    if number <= 0:
        return None
    return int(round(number))


def read_svg_dimensions(path: Path) -> tuple[int, int] | None:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")[:8192]
    except OSError:
        return None

    svg_match = re.search(r"<svg\b(?P<attrs>[^>]*)>", text, re.I | re.S)
    if not svg_match:
        return None

    attrs = svg_match.group("attrs")

    def attr(name: str) -> str:
        match = re.search(rf"\b{name}\s*=\s*[\"']([^\"']+)[\"']", attrs, re.I)
        return match.group(1) if match else ""

    width = parse_dimension_value(attr("width"))
    height = parse_dimension_value(attr("height"))
    if width and height:
        return width, height

    view_box = attr("viewBox")
    parts = view_box.replace(",", " ").split()
    if len(parts) == 4:
        try:
            width = int(round(float(parts[2])))
            height = int(round(float(parts[3])))
        except ValueError:
            return None
        if width > 0 and height > 0:
            return width, height

    return None


def read_jpeg_dimensions(path: Path) -> tuple[int, int] | None:
    start_of_frame_markers = {
        0xC0, 0xC1, 0xC2, 0xC3,
        0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB,
        0xCD, 0xCE, 0xCF,
    }
    try:
        with path.open("rb") as file:
            if file.read(2) != b"\xff\xd8":
                return None

            while True:
                byte = file.read(1)
                while byte and byte != b"\xff":
                    byte = file.read(1)
                while byte == b"\xff":
                    byte = file.read(1)
                if not byte:
                    return None

                marker = byte[0]
                if marker == 0xD9 or marker == 0xDA:
                    return None
                if 0xD0 <= marker <= 0xD7:
                    continue

                length_bytes = file.read(2)
                if len(length_bytes) != 2:
                    return None
                length = struct.unpack(">H", length_bytes)[0]
                if length < 2:
                    return None

                if marker in start_of_frame_markers:
                    segment = file.read(length - 2)
                    if len(segment) < 5:
                        return None
                    height = struct.unpack(">H", segment[1:3])[0]
                    width = struct.unpack(">H", segment[3:5])[0]
                    if width > 0 and height > 0:
                        return width, height
                    return None

                file.seek(length - 2, 1)
    except OSError:
        return None


def read_image_dimensions(path: Path) -> tuple[int, int] | None:
    if path.suffix.lower() == ".svg":
        return read_svg_dimensions(path)

    try:
        with path.open("rb") as file:
            header = file.read(24)
    except OSError:
        return None

    if header.startswith(b"\x89PNG\r\n\x1a\n") and len(header) >= 24:
        width, height = struct.unpack(">II", header[16:24])
        if width > 0 and height > 0:
            return width, height

    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        width, height = struct.unpack("<HH", header[6:10])
        if width > 0 and height > 0:
            return width, height

    if path.suffix.lower() in (".jpg", ".jpeg") or header.startswith(b"\xff\xd8"):
        return read_jpeg_dimensions(path)

    return None


def resolve_local_html_image(source_file: Path, raw_url: str) -> Path | None:
    if not raw_url:
        return None

    parsed = urlparse(raw_url)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None

    clean_path = unquote(parsed.path)
    candidate = ROOT / clean_path.lstrip("/") if clean_path.startswith("/") else source_file.parent / clean_path
    try:
        candidate = candidate.resolve()
        candidate.relative_to(ROOT)
    except (OSError, ValueError):
        return None

    return candidate if candidate.exists() else None


def check_blog_image_attributes(errors: list[str]) -> None:
    for html_file in sorted((ROOT / "blogs").glob("*.html")):
        doc = parse_html(html_file)
        images = [attrs for tag, attrs in doc.tags if tag == "img"]
        for index, attrs in enumerate(images):
            rel = html_file.relative_to(ROOT)
            source = attrs.get("src", "")
            label = f"{rel}: img {source!r}"

            if attrs.get("decoding") != "async":
                errors.append(f"{label} missing decoding=\"async\"")
            if index > 0 and attrs.get("loading") != "lazy":
                errors.append(f"{label} missing loading=\"lazy\"")
            if not attrs.get("alt", "").strip():
                errors.append(f"{label} missing alt text (set it in the source markdown)")
            # A lazy image without intrinsic size reserves no space and shifts
            # the layout on arrival, so width/height are required either way.
            if not attrs.get("width") or not attrs.get("height"):
                errors.append(
                    f"{label} missing width/height "
                    f"(run: python3 scripts/update_image_dimensions.py)"
                )

            local_path = resolve_local_html_image(html_file, source)
            if not local_path:
                continue
            dimensions = read_image_dimensions(local_path)
            if not dimensions:
                continue

            expected_width, expected_height = (str(dimensions[0]), str(dimensions[1]))
            if attrs.get("width") != expected_width or attrs.get("height") != expected_height:
                errors.append(
                    f"{label} should declare width=\"{expected_width}\" and height=\"{expected_height}\""
                )


def check_json_assets(errors: list[str]) -> None:
    index_path = ROOT / "data/article_index.json"
    if not index_path.exists():
        errors.append("data/article_index.json is missing")
        return

    index_payload = json.loads(index_path.read_text(encoding="utf-8"))
    markdown_index: set[str] = set()
    article_files: set[str] = set()
    for group in index_payload.get("groups", []):
        group_id = group.get("id", "<unknown>")
        for language, entry in (group.get("languages") or {}).items():
            html_file = entry.get("file")
            markdown_file = entry.get("markdown")
            if entry.get("html_content") or entry.get("rendered_content"):
                errors.append(f"data/article_index.json: full HTML content leaked into group {group_id}")
            if html_file:
                article_files.add(html_file)
            if markdown_file:
                markdown_index.add(markdown_file)
            if html_file and not (ROOT / "blogs" / html_file).exists():
                errors.append(f"article group {group_id}/{language}: HTML is missing: {html_file}")
            if markdown_file and not (ROOT / "blogs" / markdown_file).exists():
                errors.append(f"article group {group_id}/{language}: markdown is missing: {markdown_file}")

    for markdown_path in sorted((ROOT / "blogs").glob("*.md")):
        markdown_name = markdown_path.name
        html_name = f"{markdown_path.stem}.html"
        if not (ROOT / "blogs" / html_name).exists():
            errors.append(f"{markdown_path.relative_to(ROOT)}: generated HTML is missing: {html_name}")
        if markdown_name not in markdown_index:
            errors.append(f"{markdown_path.relative_to(ROOT)}: missing from data/article_index.json")

    backlinks_path = ROOT / "data/backlinks_data.json"
    if not backlinks_path.exists():
        errors.append("data/backlinks_data.json is missing")
        return

    backlinks_payload = json.loads(backlinks_path.read_text(encoding="utf-8"))
    backlinks_files = backlinks_payload.get("files") or {}
    for article_file in sorted(article_files):
        if article_file not in backlinks_files:
            errors.append(f"data/backlinks_data.json: missing backlinks entry for {article_file}")

    for target_file, backlinks in backlinks_files.items():
        if not (ROOT / "blogs" / target_file).exists():
            errors.append(f"data/backlinks_data.json: target file is missing: {target_file}")
        for backlink in backlinks:
            for language, entry in (backlink.get("languages") or {}).items():
                source_file = entry.get("file")
                if source_file and not (ROOT / "blogs" / source_file).exists():
                    errors.append(
                        f"data/backlinks_data.json: source {language} file is missing: {source_file}"
                    )


def check_site_updated(errors: list[str]) -> None:
    """The footer's "Updated" date must not predate the newest dated content."""
    shell = json.loads((ROOT / "data/site_shell.json").read_text(encoding="utf-8"))
    site_updated = shell.get("site_updated", "")
    site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
    dates = [str(item.get("date", ""))[:10] for item in site.get("works", [])]
    dates += [str(item.get("updated", ""))[:10] for item in site.get("projects", [])]
    index = json.loads((ROOT / "data/article_index.json").read_text(encoding="utf-8"))
    for group in index.get("groups", []):
        for entry in (group.get("languages") or {}).values():
            dates.append(str(entry.get("date", ""))[:10])
    dates = [value for value in dates if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)]
    if dates and site_updated < max(dates):
        errors.append(
            f"data/site_shell.json: site_updated {site_updated} predates the newest content date {max(dates)}"
        )


def check_css_cache_keys(errors: list[str]) -> None:
    versions: set[str] = set()
    pattern = re.compile(r"src/css/styles\.css\?v=([A-Za-z0-9._-]+)")
    for html_file in iter_html_files() + sorted((ROOT / "templates").glob("*.html")):
        versions.update(pattern.findall(html_file.read_text(encoding="utf-8", errors="ignore")))
    if len(versions) > 1:
        errors.append(f"multiple styles.css cache keys found: {sorted(versions)}")
    if not versions:
        errors.append("no styles.css cache key found")


def check_js_cache_keys(errors: list[str]) -> None:
    versions: set[str] = set()
    missing: list[str] = []
    script_pattern = re.compile(r"""<script\b[^>]*\bsrc=["']([^"']*src/js/[^"']+\.js(?:\?v=([^"']+))?)["']""")
    for html_file in iter_html_files() + sorted((ROOT / "templates").glob("*.html")):
        text = html_file.read_text(encoding="utf-8", errors="ignore")
        for script_src, version in script_pattern.findall(text):
            if not version:
                missing.append(f"{html_file.relative_to(ROOT)}: {script_src}")
            else:
                versions.add(version)

    if missing:
        errors.extend(f"missing JS cache key: {item}" for item in missing)
    if len(versions) > 1:
        errors.append(f"multiple JS cache keys found: {sorted(versions)}")
    if not versions:
        errors.append("no JS cache key found")


def check_preview_domains(errors: list[str]) -> None:
    preview_domain = "simoncos-project-previews.vercel.app"
    for html_file in iter_html_files():
        text = html_file.read_text(encoding="utf-8", errors="ignore")
        if preview_domain in text:
            errors.append(f"{html_file.relative_to(ROOT)} still references {preview_domain}")


def check_inline_event_handlers(errors: list[str]) -> None:
    for html_file in iter_html_files() + sorted((ROOT / "templates").glob("*.html")):
        doc = parse_html(html_file)
        for tag, attrs in doc.tags:
            for attr in attrs:
                if attr.startswith("on"):
                    rel = html_file.relative_to(ROOT)
                    errors.append(f"{rel}: inline event handler {attr!r} found on <{tag}>")


def main() -> int:
    errors: list[str] = []
    check_local_refs(errors)
    check_sitemap(errors)
    check_embedded_pages_are_noindex(errors)
    check_site_data(errors)
    check_json_assets(errors)
    check_site_updated(errors)
    check_css_cache_keys(errors)
    check_js_cache_keys(errors)
    check_preview_domains(errors)
    check_inline_event_handlers(errors)
    check_blog_image_attributes(errors)

    if errors:
        print("Site checks failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Site checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
