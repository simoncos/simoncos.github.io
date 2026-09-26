#!/usr/bin/env python3
"""Render the Favorites (收藏) pages from data/favorites.json.

Writes favorites.html (the index) and one page per category under favorites/.
Each category page carries every work in marking order; src/ts/load-favorites.ts
pages and filters them in the browser, and without JavaScript all works show.

The shared head resources and footer come from scripts/update_site_shell.py, so
both scripts emit the same blocks for these pages.
"""

from __future__ import annotations

import argparse
import sys
from html import escape
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from update_site_shell import (  # noqa: E402
    SHELL_CONFIG_PATH,
    load_json,
    render_footer_block,
    render_resource_block,
    site_version_fallback,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/favorites.json"
SITE_URL = "https://simoncos.github.io"
PER_PAGE = 20
RECENT_ON_INDEX = 3

# Essays on a work, keyed by the work's Douban link, pointing at the published
# article. The link text is the article's own title, read from its Markdown.
# Add one only after the essay is published on the site with its original date.
ESSAYS: dict[str, str] = {
    "https://movie.douban.com/subject/4195678/": "blogs/the-tatami-galaxy.html",
    "https://book.douban.com/subject/4230237/": "blogs/exformation-and-information.html",
    "https://book.douban.com/subject/35272817/": "blogs/on-the-value-of-war.html",
    "https://www.douban.com/game/35184766/": "blogs/black-myth-wukong-bosses.html",
}

EXT_ICON = (
    '<svg class="favorite-ext" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
    '<path d="M3 7L7 3M3.8 3H7v3.2" fill="none" stroke="currentColor" stroke-width="1.2" '
    'stroke-linecap="round" stroke-linejoin="round"></path></svg>'
)
CHEVRON = (
    '<svg class="favorite-chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
    '<path d="M2.5 4L5 6.5 7.5 4" fill="none" stroke="currentColor" stroke-width="1.3" '
    'stroke-linecap="round" stroke-linejoin="round"></path></svg>'
)
DOT = '<span class="favorite-dot" aria-hidden="true">·</span>'

# Shown before JavaScript runs, and kept when it never does: every work, and
# every season of a merged work.
NOSCRIPT_STYLE = """    <noscript>
        <style>
            .favorites-list:not(.is-paginated) > .favorite-row:nth-child(n) { display: flex; }
            .favorite-notes-all[hidden] { display: flex; }
            .favorite-notes-main, .favorite-series-toggle { display: none; }
        </style>
    </noscript>"""


def esc(value: str) -> str:
    return escape(value, quote=True)


def is_reviewed(work: dict[str, Any]) -> bool:
    return any(mark["review"] for mark in work["marks"])


def main_mark(work: dict[str, Any]) -> dict[str, Any]:
    """The longest review; on a tie, the most recent mark."""
    return max(work["marks"], key=lambda mark: (len(mark["review"]), mark["date"]))


def series_unit(work: dict[str, Any]) -> str:
    return "个版本" if work["marks"][0].get("label", "").startswith("版本") else "季"


def shell_page(config: dict[str, Any], path: str) -> dict[str, Any]:
    for page in config["pages"]:
        if page["path"] == path:
            return page
    raise ValueError(f"data/site_shell.json: no page entry for {path}")


def head(config: dict[str, Any], path: str, title: str, description: str, *, noscript: bool) -> str:
    url = f"{SITE_URL}/{path}"
    lines = [
        "<!DOCTYPE html>",
        '<html lang="zh-Hans">',
        "<head>",
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"    <title>{esc(title)}</title>",
        f'    <meta name="description" content="{esc(description)}">',
        f'    <link rel="canonical" href="{url}">',
        '    <meta property="og:type" content="website">',
        f'    <meta property="og:title" content="{esc(title)}">',
        f'    <meta property="og:description" content="{esc(description)}">',
        f'    <meta property="og:url" content="{url}">',
        '    <meta property="og:site_name" content="simonc site">',
        '    <meta property="og:locale" content="zh_CN">',
        f'    <meta property="og:image" content="{SITE_URL}/assets/og/og-default.png">',
        '    <meta property="og:image:width" content="1200">',
        '    <meta property="og:image:height" content="630">',
        '    <meta property="og:image:alt" content="simonc site — tools and research, essays and field notes">',
        '    <meta name="twitter:card" content="summary_large_image">',
        f'    <meta name="twitter:title" content="{esc(title)}">',
        f'    <meta name="twitter:description" content="{esc(description)}">',
        f'    <meta name="twitter:image" content="{SITE_URL}/assets/og/og-default.png">',
        render_resource_block(config, shell_page(config, path)),
    ]
    if noscript:
        lines.append(NOSCRIPT_STYLE)
    lines.append("</head>")
    return "\n".join(lines)


def masthead(body_class: str) -> str:
    return f"""<body class="{body_class}">
    <a class="skip-link" href="#main" data-i18n="skip_to_content">跳到正文</a>
    <header class="site-header">
        <div class="header-inner">
            <p class="site-kicker">收藏</p>
            <p class="site-title" data-site-title>simonc site</p>
        </div>
    </header>
    <div id="navigation-placeholder"></div>"""


def footer(config: dict[str, Any], path: str, version: str) -> str:
    return (
        "    <footer>\n"
        f"{render_footer_block(config, shell_page(config, path), version)}\n"
        "    </footer>\n"
        "</body>\n"
        "</html>\n"
    )


# ---------------------------------------------------------------- category pages
def note_label(mark: dict[str, Any]) -> str:
    return (
        f'<a class="favorite-note-label" href="{esc(mark["link"])}">'
        f'<strong>{esc(mark["label"])}</strong>{DOT}<span>{mark["date"]}</span>{EXT_ICON}'
        '<span class="visually-hidden">（豆瓣）</span></a>'
    )


def review_block(text: str, *, clampable: bool) -> str:
    review = f'<p class="favorite-review">{esc(text)}</p>'
    if not clampable:
        return review
    return (
        review
        + '<button type="button" class="favorite-toggle favorite-more" aria-expanded="false" hidden>'
        + f'<span class="favorite-toggle-label">展开全文</span>{CHEVRON}</button>'
    )


def notes(work: dict[str, Any], row_id: str) -> str:
    marks = work["marks"]
    main = main_mark(work)
    if len(marks) == 1:
        return review_block(main["review"], clampable=True)

    main_block = (
        f'<div class="favorite-notes-main">{note_label(main)}'
        f'{review_block(main["review"], clampable=True)}</div>'
    )
    all_notes = []
    for mark in marks:
        text = (
            f'<p class="favorite-review">{esc(mark["review"])}</p>'
            if mark["review"]
            else '<p class="favorite-review-empty">没有短评</p>'
        )
        all_notes.append(f'<div class="favorite-note">{note_label(mark)}{text}</div>')
    label = f"另外 {len(marks) - 1} {series_unit(work)}"
    return (
        main_block
        + f'<div class="favorite-notes-all" id="{row_id}-marks" hidden>{"".join(all_notes)}</div>'
        + f'<button type="button" class="favorite-toggle favorite-series-toggle" aria-expanded="false" '
        f'aria-controls="{row_id}-marks" data-collapsed-label="{esc(label)}">'
        f'<span class="favorite-toggle-label">{esc(label)}</span>{CHEVRON}</button>'
    )


def essay_title(essay_path: str) -> str:
    """The article's H1, with its own title marks nested as 〈〉 inside our 《》."""
    markdown = (ROOT / essay_path).with_suffix(".md").read_text(encoding="utf-8")
    title = next(line[2:].strip() for line in markdown.splitlines() if line.startswith("# "))
    return title.replace("《", "〈").replace("》", "〉")


def date_cell(date: str) -> str:
    return f'<time class="favorite-date" datetime="{date}"><span>{date}</span></time>'


def full_row(work: dict[str, Any], row_id: str, repeat: bool) -> str:
    original = f'<p class="favorite-original">{esc(work["original_title"])}</p>' if work.get("original_title") else ""
    essay = ""
    if work["link"] in ESSAYS:
        essay_path = ESSAYS[work["link"]]
        essay = (
            f'<p class="favorite-essay"><a class="favorite-cta" href="../{esc(essay_path)}">'
            f'长评《{esc(essay_title(essay_path))}》<span aria-hidden="true">→</span></a></p>'
        )
    classes = "favorite-row favorite-row--full" + (" is-date-repeat" if repeat else "")
    return (
        f'            <li class="{classes}" data-marked="{work["date"]}" data-reviewed="true">\n'
        f"                {date_cell(work['date'])}\n"
        '                <div class="favorite-body">\n'
        '                    <div class="favorite-head">'
        f'<h2 class="favorite-title"><a href="{esc(work["link"])}">{esc(work["title"])}{EXT_ICON}'
        '<span class="visually-hidden">（豆瓣）</span></a></h2>'
        f'{original}<p class="favorite-meta">{esc(" · ".join(work["meta"]))}</p>{essay}</div>\n'
        f'                    <div class="favorite-notes">{notes(work, row_id)}</div>\n'
        "                </div>\n"
        "            </li>"
    )


def compact_row(work: dict[str, Any], repeat: bool) -> str:
    original = f'<span class="favorite-original">{esc(work["original_title"])}</span>' if work.get("original_title") else ""
    seasons = f'<span class="favorite-seasons">共 {len(work["marks"])} {series_unit(work)}</span>' if len(work["marks"]) > 1 else ""
    classes = "favorite-row favorite-row--compact" + (" is-date-repeat" if repeat else "")
    inline_date = f'<span class="favorite-date-inline" aria-hidden="true">{work["date"]}</span>'
    return (
        f'            <li class="{classes}" data-marked="{work["date"]}" data-reviewed="false">\n'
        f"                {date_cell(work['date'])}\n"
        '                <div class="favorite-line">'
        f'<h2 class="favorite-title"><a href="{esc(work["link"])}">{esc(work["title"])}'
        f'<span class="visually-hidden">（豆瓣）</span></a></h2>{original}{seasons}</div>\n'
        f'                <p class="favorite-meta">{inline_date}{esc(" · ".join(work["meta"]))}</p>\n'
        "            </li>"
    )


def rows(category: dict[str, Any]) -> str:
    out = []
    previous = None
    for index, work in enumerate(category["works"]):
        # The default view: a date shows only when it differs from the row above on the same page.
        repeat = index % PER_PAGE != 0 and previous == work["date"]
        if is_reviewed(work):
            out.append(full_row(work, f"{category['id']}-{index + 1}", repeat))
        else:
            out.append(compact_row(work, repeat))
        previous = work["date"]
    return "\n".join(out)


def switcher(categories: list[dict[str, Any]], active: str) -> str:
    links = []
    for category in categories:
        current = ' aria-current="page"' if category["id"] == active else ""
        links.append(
            f'<a href="{category["id"]}.html"{current}>{category["name"]}'
            f'<span class="favorites-count">{len(category["works"])}</span></a>'
        )
    return (
        '            <nav class="favorites-switcher" aria-label="分类">'
        '<span class="favorites-switcher-label" aria-hidden="true">分类</span>'
        + "".join(links)
        + "</nav>"
    )


def filter_bar(category: dict[str, Any]) -> str:
    works = category["works"]
    reviewed = sum(is_reviewed(work) for work in works)
    counts = {"all": len(works), "reviewed": reviewed, "unreviewed": len(works) - reviewed}
    buttons = []
    for key, label in (("all", "全部"), ("reviewed", "有短评"), ("unreviewed", "没有短评")):
        pressed = "true" if key == "all" else "false"
        buttons.append(
            f'<button type="button" data-favorites-filter="{key}" aria-pressed="{pressed}">'
            f'<span>{label}<span class="favorites-count">{counts[key]}</span></span></button>'
        )
    return (
        '        <div class="favorites-toolbar">\n'
        '            <fieldset class="favorites-filter" hidden><legend class="visually-hidden">按有无短评筛选</legend>'
        + "".join(buttons)
        + "</fieldset>\n"
        '            <p class="favorites-order">按标记时间从新到旧</p>\n'
        "        </div>"
    )


def category_page(config: dict[str, Any], payload: dict[str, Any], category: dict[str, Any], version: str) -> str:
    path = f"favorites/{category['id']}.html"
    count = len(category["works"])
    title = f"{category['name']} · 收藏 - simonc site"
    description = f"{category['name']}：我在豆瓣上打过五星的 {count} {category['unit']}，按标记时间从新到旧，附豆瓣短评原文。"
    return "\n".join([
        head(config, path, title, description, noscript=True),
        masthead("favorites-page favorites-category-page"),
        f'    <main id="main" class="container page-shell favorites-shell" lang="zh-Hans" '
        f'data-favorites-unit="{category["unit"]}" data-favorites-per-page="{PER_PAGE}">',
        '        <section class="favorites-top" aria-labelledby="favorites-title">',
        '            <p class="favorites-breadcrumb"><a href="../favorites.html">收藏</a> /</p>',
        f'            <h1 id="favorites-title">{category["name"]}</h1>',
        switcher(payload["categories"], category["id"]),
        "        </section>",
        filter_bar(category),
        '        <ol class="favorites-list" data-favorites-list tabindex="-1" aria-labelledby="favorites-title">',
        rows(category),
        "        </ol>",
        '        <nav class="favorites-pager" aria-label="分页" data-favorites-pager hidden></nav>',
        "    </main>",
        footer(config, path, version),
    ])


# ---------------------------------------------------------------- index page
def export_date_zh(date: str) -> str:
    year, month, day = date.split("-")
    return f"{int(year)} 年 {int(month)} 月 {int(day)} 日"


def index_block(category: dict[str, Any]) -> str:
    works = category["works"]
    reviewed = [work for work in works if is_reviewed(work)]
    unit = category["unit"]
    recent = []
    for work in reviewed[:RECENT_ON_INDEX]:
        recent.append(
            '                    <li>'
            f'<time datetime="{work["date"]}">{work["date"]}</time>'
            f'<div><a class="favorites-recent-title" href="{esc(work["link"])}">{esc(work["title"])}'
            '<span class="visually-hidden">（豆瓣）</span></a>'
            f'<p>{esc(main_mark(work)["review"])}</p></div></li>'
        )
    return "\n".join([
        f'            <section class="favorites-category" aria-labelledby="favorites-{category["id"]}">',
        '                <header>',
        f'                    <h2 id="favorites-{category["id"]}"><a href="favorites/{category["id"]}.html">{category["name"]}</a></h2>',
        f'                    <p>{len(works)} {unit} · 有短评 {len(reviewed)} {unit}</p>',
        "                </header>",
        '                <p class="section-kicker">最近的短评</p>',
        '                <ol class="favorites-recent">',
        *recent,
        "                </ol>",
        '                <p class="favorites-category-links">'
        f'<a class="favorites-cta" href="favorites/{category["id"]}.html">全部 {len(works)} {unit}<span aria-hidden="true">→</span></a>'
        f'<a href="favorites/{category["id"]}.html?filter=reviewed">只看有短评的 {len(reviewed)} {unit}</a></p>',
        "            </section>",
    ])


def index_page(config: dict[str, Any], payload: dict[str, Any], version: str) -> str:
    path = "favorites.html"
    categories = payload["categories"]
    total = sum(len(category["works"]) for category in categories)
    reviewed = sum(is_reviewed(work) for category in categories for work in category["works"])
    title = "收藏 - simonc site"
    description = "我在豆瓣上打过五星的书、影、音、游，按标记时间排列，附豆瓣短评原文。"
    export = export_date_zh(payload["export_date"])
    strip = [f"共 {total} 件", f"{reviewed} 件有短评", f"豆瓣数据截至 {export}"]
    about = (
        "日期是在豆瓣上标记的日期；同一部剧的几季合成一条，排在最近一季的日期上。"
        f"星级和短评是 {export}导出时的版本。"
    )
    return "\n".join([
        head(config, path, title, description, noscript=False),
        masthead("favorites-page favorites-index-page"),
        '    <main id="main" class="container page-shell favorites-shell" lang="zh-Hans">',
        '        <section class="favorites-top favorites-index-top" aria-labelledby="favorites-title">',
        '            <h1 id="favorites-title">收藏</h1>',
        # One span per sentence, so a narrow screen breaks between sentences, not inside a word.
        '            <p class="favorites-intro"><span>我在豆瓣上打过五星的书、影、音、游。</span><span>短评是写在豆瓣上的原文，一字未改。</span></p>',
        "        </section>",
        '        <p class="favorites-strip">'
        + '<span aria-hidden="true">/</span>'.join(f"<span>{esc(item)}</span>" for item in strip)
        + "</p>",
        '        <div class="favorites-categories">',
        *(index_block(category) for category in categories),
        "        </div>",
        '        <section class="favorites-about" aria-labelledby="favorites-about-title">',
        '            <h2 id="favorites-about-title" class="section-kicker">关于这些记录</h2>',
        f"            <p>{esc(about)}</p>",
        "        </section>",
        "    </main>",
        footer(config, path, version),
    ])


# ---------------------------------------------------------------- main
def render_all() -> dict[Path, str]:
    config = load_json(SHELL_CONFIG_PATH)
    payload = load_json(DATA_PATH)
    version = site_version_fallback()
    pages = {ROOT / "favorites.html": index_page(config, payload, version)}
    for category in payload["categories"]:
        pages[ROOT / f"favorites/{category['id']}.html"] = category_page(config, payload, category, version)
    return pages


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if the Favorites pages are out of date.")
    args = parser.parse_args()

    stale = []
    for path, text in render_all().items():
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current == text:
            continue
        stale.append(path.relative_to(ROOT))
        if not args.check:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")

    if args.check and stale:
        print("Favorites pages are out of date:")
        for path in stale:
            print(f"- {path}")
        print("Run: python3 scripts/update_favorites_pages.py")
        return 1
    print("Updated Favorites pages:" if stale else "Favorites pages are current.")
    for path in stale:
        print(f"- {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
