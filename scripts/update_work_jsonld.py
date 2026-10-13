#!/usr/bin/env python3
"""Write a JSON-LD block into every local work page listed in data/site.json.

The block is generated from site.json (title, kind, date, topic, image) plus the page's own
canonical URL, meta description and <html lang>, so it never drifts from what the page says.
Usage: python3 scripts/update_work_jsonld.py [--check]
"""
from __future__ import annotations
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://simoncos.github.io"
START, END = "<!-- work-jsonld:start -->", "<!-- work-jsonld:end -->"
AUTHOR = {"@type": "Person", "name": "simoncos", "alternateName": "Che ZHAO", "url": f"{SITE}/about.html"}
# site.json kind (English) -> schema.org type
TYPES = {"Research": "ScholarlyArticle", "Interactive essay": "Article", "Interactive essays": "Article",
         "Talk": "PresentationDigitalDocument", "App": "SoftwareApplication", "Game": "VideoGame",
         "Original song": "MusicComposition"}
# Pages edited after first publication; keeps dateModified stable and reviewable.
MODIFIED = {"problem-solving": "2026-10-13", "limits-of-problem-analysis": "2026-10-13", "designing-design": "2026-10-13",
            "lola-draft": "2026-10-13", "lola-matchups": "2026-10-13", "talk": "2026-10-13", "sleep": "2026-10-13"}


def pages(work: dict):
    href = work.get("href")
    if not href:
        return
    items = href.items() if isinstance(href, dict) else [(None, href)]
    for lang, rel in items:
        if rel.startswith("http"):
            continue  # external sites are not ours to edit
        yield lang, rel


def meta(s: str, pattern: str) -> str | None:
    m = re.search(pattern, s, re.S)
    return html.unescape(m.group(1)) if m else None


def block(work: dict, lang: str | None, s: str) -> str:
    page_lang = meta(s, r'<html[^>]*\slang="([^"]+)"') or "en"
    bilingual_one_page = lang is None and 'hreflang="zh-Hans"' in s and "?lang=zh" in s
    in_lang = ["en", "zh-Hans"] if bilingual_one_page else page_lang
    title_lang = "zh" if page_lang.startswith("zh") else "en"
    kind_en = work["kind"]["en"]
    data = {
        "@context": "https://schema.org",
        "@type": TYPES[kind_en],
        "name": work["title"][title_lang],
        "headline": work["title"][title_lang],
        "description": meta(s, r'<meta name="description" content="([^"]*)"') or work.get("desc", {}).get(title_lang, ""),
        "url": meta(s, r'<link rel="canonical" href="([^"]+)"'),
        "inLanguage": in_lang,
        "author": AUTHOR,
        "creator": AUTHOR,
        "datePublished": work["date"],
        "dateModified": max(work["date"], MODIFIED.get(work["id"], work["date"])),
        "genre": work["kind"][title_lang],
        "about": sorted({t for t in (work.get("work_topic"), kind_en.lower()) if t}),
        "isPartOf": {"@type": "WebSite", "name": "simoncos", "url": f"{SITE}/"},
    }
    if work.get("img"):
        data["image"] = f"{SITE}/{work['img']}"
    if data["@type"] == "SoftwareApplication":
        data.update({"applicationCategory": "HealthApplication", "operatingSystem": "Web"})
    if data["@type"] == "MusicComposition":
        data["composer"] = AUTHOR
    body = json.dumps(data, ensure_ascii=False, indent=1)
    return f'{START}\n<script type="application/ld+json">\n{body}\n</script>\n{END}'


def render(s: str, blk: str) -> str:
    if START in s:
        return re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: blk, s, count=1, flags=re.S)
    m = re.search(r'<link rel="canonical" href="[^"]+">\n', s)  # every work page has one; some omit </head>
    return s[:m.end()] + blk + "\n" + s[m.end():]


def apply(s: str, work: dict, lang: str | None) -> str:
    return render(s, block(work, lang, s))


def apply_to_outputs(outputs: dict[str, str], site: dict) -> None:
    """Used by build_pages.py so generated work pages are written with their JSON-LD already in place."""
    for work in site["works"]:
        for lang, rel in pages(work):
            if rel in outputs:
                outputs[rel] = apply(outputs[rel], work, lang)


def main(check: bool) -> int:
    site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
    stale = []
    for work in site["works"]:
        for lang, rel in pages(work):
            path = ROOT / rel
            new = apply(path.read_text(encoding="utf-8"), work, lang)
            if new != path.read_text(encoding="utf-8"):
                stale.append(rel)
                if not check:
                    path.write_text(new, encoding="utf-8")
    if check and stale:
        print("Work JSON-LD is stale; run scripts/update_work_jsonld.py:", *stale, sep="\n  ")
        return 1
    print("Work JSON-LD is current." if check else f"Updated {len(stale)} work pages.")
    return 0


if __name__ == "__main__":
    sys.exit(main("--check" in sys.argv))
