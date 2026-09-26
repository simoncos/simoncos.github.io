#!/usr/bin/env python3
"""Render the Favorites (收藏) pages from data/favorites.json.

Writes favorites.html (the index) and one page per category under favorites/.
Each category page carries every work in marking order; src/ts/favorites.ts
pages, filters and folds them in the browser, and without JavaScript every
work and every season shows.

System copy is bilingual like the rest of the site; titles, meta and reviews
stay in Chinese as written. The shell comes from scripts/site_shell.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from site_shell import (  # noqa: E402
    bi,
    esc,
    i18n_attrs,
    load_config,
    page_config,
    render_document,
    render_meta,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data/favorites.json"
PER_PAGE = 20
RECENT_ON_INDEX = 3
# A main review longer than this folds to a few lines (desktop, then narrow).
FOLD_WIDE = 260
FOLD_NARROW = 300

# Essays on a work, keyed by the work's Douban link, pointing at the published
# article. The link text is the article's own title, read from its Markdown.
# Add one only after the essay is published on the site with its original date.
ESSAYS: dict[str, str] = {
    "https://movie.douban.com/subject/4195678/": "blogs/the-tatami-galaxy.html",
    "https://book.douban.com/subject/4230237/": "blogs/exformation-and-information.html",
    "https://book.douban.com/subject/35272817/": "blogs/on-the-value-of-war.html",
    "https://www.douban.com/game/35184766/": "blogs/black-myth-wukong-bosses.html",
}

# The category glyphs are traditional characters, as in the design.
GLYPHS = {"books": "書", "film": "影", "music": "音", "games": "遊"}
# English name, singular unit, plural unit.
ENGLISH = {
    "books": ("Books", "book", "books"),
    "film": ("Film & TV", "title", "titles"),
    "music": ("Music", "album", "albums"),
    "games": ("Games", "game", "games"),
}
MONTH_NAMES = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
DOUBAN = '<span class="visually-hidden">（豆瓣）</span>'


def is_reviewed(work: dict[str, Any]) -> bool:
    return any(mark["review"] for mark in work["marks"])


def main_mark(work: dict[str, Any]) -> dict[str, Any]:
    """The longest review; on a tie, the most recent mark."""
    return max(work["marks"], key=lambda mark: (len(mark["review"]), mark["date"]))


def is_versions(work: dict[str, Any]) -> bool:
    return work["marks"][0].get("label", "").startswith("版本")


def marks_label(work: dict[str, Any]) -> tuple[str, str]:
    n = len(work["marks"])
    if is_versions(work):
        return f"{n} versions", f"{n} 个版本"
    return f"{n} seasons", f"{n} 季"


def count_label(category: dict[str, Any], n: int) -> tuple[str, str]:
    _name, one, many = ENGLISH[category["id"]]
    return f"{n} {one if n == 1 else many}", f"{n} {category['unit']}"


def export_label(value: str) -> tuple[str, str]:
    year, month, day = (int(part) for part in value.split("-"))
    return f"{MONTH_NAMES[month - 1]} {day}, {year}", f"{year} 年 {month} 月 {day} 日"


def about_note(payload: dict[str, Any]) -> str:
    en, zh = export_label(payload["export_date"])
    return bi(
        "Dates are when I marked each work on Douban. Seasons of one show are merged into one entry, "
        f"dated by the latest season. Ratings and reviews are as exported on {en}. "
        "Titles and reviews stay in Chinese, as written.",
        "日期是在豆瓣上标记的日期；同一部剧的几季合成一条，排在最近一季的日期上。"
        f"星级和短评是 {zh}导出时的版本，短评是写在豆瓣上的原文，一字未改。",
    )


def about_section(payload: dict[str, Any], indent: str = "    ") -> str:
    return "\n".join([
        f'{indent}<section class="fav-about">',
        f'{indent}    <h2 class="fav-about-k">{bi("About these records", "关于这些记录")}</h2>',
        f"{indent}    <p>{about_note(payload)}</p>",
        f"{indent}</section>",
    ])


def essay_title(essay_path: str, lang: str) -> str:
    source = ROOT / essay_path
    source = source.with_suffix(".en.md") if lang == "en" else source.with_suffix(".md")
    markdown = source.read_text(encoding="utf-8")
    return next(line[2:].strip() for line in markdown.splitlines() if line.startswith("# "))


def essay_link(work: dict[str, Any]) -> str:
    essay_path = ESSAYS.get(work["link"])
    if not essay_path:
        return ""
    en_path = essay_path.replace(".html", ".en.html")
    # The article's own title marks nest as 〈〉 inside our 《》.
    zh_title = essay_title(essay_path, "zh").replace("《", "〈").replace("》", "〉")
    en_title = essay_title(essay_path, "en")
    return (
        f'<a class="fav-essay"{i18n_attrs(href=(f"../{en_path}", f"../{essay_path}"))}>'
        f'{bi(f"Essay: {en_title}", f"长评《{zh_title}》")}<span aria-hidden="true"> →</span></a>'
    )


# ---------------------------------------------------------------- category pages
def title_link(work: dict[str, Any]) -> str:
    return (
        f'<a class="fav-title" href="{esc(work["link"])}">{esc(work["title"])}'
        f'<span class="fav-ext" aria-hidden="true">↗</span>{DOUBAN}</a>'
    )


def original_title(work: dict[str, Any]) -> str:
    original = work.get("original_title")
    if not original or original == work["title"]:
        return ""
    return f'<span class="fav-orig">{esc(original)}</span>'


def date_cell(date: str) -> str:
    return f'<time class="fav-date num" datetime="{date}">{date}</time>'


def mark_item(mark: dict[str, Any]) -> str:
    review = f'<p class="fav-mark-review">{esc(mark["review"])}</p>' if mark["review"] else ""
    return (
        '<li class="fav-mark"><span class="fav-mark-head">'
        f'<a href="{esc(mark["link"])}">{esc(mark.get("label", ""))}{DOUBAN}</a>'
        f'<span class="fav-mark-date num">{mark["date"]}</span></span>{review}</li>'
    )


def toggle_button(attr: str, closed: tuple[str, str], extra: str = "") -> str:
    return (
        f'<button class="pill pill-sm fav-{attr}-btn" type="button" data-fav-{attr} aria-expanded="false"{extra}>'
        f'<span class="when-closed">{bi(*closed)}</span>'
        f'<span class="when-open">{bi("Collapse", "收起")}</span></button>'
    )


def full_row(work: dict[str, Any], row_id: str, classes: list[str]) -> str:
    marks = work["marks"]
    main = main_mark(work)
    multi = len(marks) > 1
    review_length = len(main["review"])
    if review_length > FOLD_WIDE:
        classes.append("fold-wide")
    if review_length > FOLD_NARROW:
        classes.append("fold-narrow")
    label = f'<span class="fav-main-label">{esc(main.get("label", ""))}</span>' if multi else ""
    parts = [
        f'<div class="fav-titleline">{title_link(work)}{original_title(work)}</div>',
        f'<span class="fav-meta">{esc(" · ".join(filter(None, work["meta"])))}</span>',
        essay_link(work),
        f'<div class="fav-main">{label}<p class="fav-review">{esc(main["review"])}</p></div>',
    ]
    buttons = [toggle_button("fold", ("Read full note", "展开全文"))] if review_length > FOLD_WIDE else []
    if multi:
        parts.append(f'<ol class="fav-marks" id="{row_id}-marks">{"".join(mark_item(mark) for mark in marks)}</ol>')
        en, zh = marks_label(work)
        buttons.append(toggle_button("marks", (f"Show all {en}", f"展开全部 {zh}"), f' aria-controls="{row_id}-marks"'))
    parts.append(f'<div class="fav-actions">{"".join(buttons)}</div>')
    return (
        f'            <li class="{" ".join(classes)}" data-marked="{work["date"]}" data-reviewed="true">'
        f'{date_cell(work["date"])}<div class="fav-full">{"".join(part for part in parts if part)}</div></li>'
    )


def compact_row(work: dict[str, Any], classes: list[str]) -> str:
    multi = ""
    if len(work["marks"]) > 1:
        multi = f'<span class="fav-multi">· {bi(*marks_label(work))}</span>'
    meta = esc(" · ".join(filter(None, work["meta"])))
    return (
        f'            <li class="{" ".join(classes)}" data-marked="{work["date"]}" data-reviewed="false">'
        f'{date_cell(work["date"])}<div class="fav-line">{title_link(work)}{original_title(work)}'
        f'<span class="fav-meta">{meta}</span>{multi}</div></li>'
    )


def rows(category: dict[str, Any]) -> str:
    out = []
    previous = None
    for index, work in enumerate(category["works"]):
        classes = ["fav-row"]
        # The default view: a date shows only when it differs from the row above on the same page.
        if index % PER_PAGE != 0 and previous == work["date"]:
            classes.append("is-repeat")
        if len(work["marks"]) > 1:
            classes.append("is-multi")
        if is_reviewed(work):
            out.append(full_row(work, f"{category['id']}-{index + 1}", ["is-full", *classes]))
        else:
            out.append(compact_row(work, ["is-compact", *classes]))
        previous = work["date"]
    return "\n".join(out)


def rail(categories: list[dict[str, Any]], active: str) -> str:
    links = []
    for category in categories:
        current = ' aria-current="page"' if category["id"] == active else ""
        n = len(category["works"])
        count = bi(f"{ENGLISH[category['id']][0]} · {n}", f"{n} {category['unit']}")
        links.append(
            f'            <a class="rail-item" href="{category["id"]}.html"{current}>'
            f'<span class="rail-char" lang="zh-Hant" aria-hidden="true">{GLYPHS[category["id"]]}</span>'
            f'<span class="visually-hidden">{bi(ENGLISH[category["id"]][0], category["name"])}</span>'
            f'<span class="rail-count num">{count}</span></a>'
        )
    return "\n".join([
        f'        <nav class="fav-rail"{i18n_attrs(aria_label=("Favorites categories", "收藏分类"))}>',
        f'            <a class="pill fav-back" href="../favorites.html">← {bi("Favorites", "收藏")}</a>',
        *links,
        "        </nav>",
    ])


def filter_bar(category: dict[str, Any]) -> str:
    works = category["works"]
    reviewed = sum(is_reviewed(work) for work in works)
    counts = {"all": len(works), "reviewed": reviewed, "unreviewed": len(works) - reviewed}
    buttons = []
    for key, en, zh in (("all", "All", "全部"), ("reviewed", "With notes", "有短评"), ("unreviewed", "Without notes", "没有短评")):
        pressed = "true" if key == "all" else "false"
        buttons.append(
            f'<button class="seg-btn" type="button" data-fav-filter="{key}" aria-pressed="{pressed}">'
            f'{bi(en, zh)} <span class="seg-n">{counts[key]}</span></button>'
        )
    first = min(PER_PAGE, len(works))
    return "\n".join([
        '            <div class="fav-tools">',
        f'                <div class="seg fav-filter" role="group" data-fav-filters{i18n_attrs(aria_label=("Filter", "筛选"))}>'
        + "".join(buttons) + "</div>",
        f'                <span class="fav-range num" data-fav-range>1–{first} / {len(works)}</span>',
        "            </div>",
    ])


def pager() -> str:
    return "\n".join([
        f'            <nav class="fav-pager" data-fav-pager hidden{i18n_attrs(aria_label=("Pages", "分页"))}>',
        '                <div class="fav-pager-row">',
        f'                    <a class="pill fav-prev" data-fav-prev>← {bi("Previous", "上一页")}</a>',
        '                    <ol class="fav-pages" data-fav-pages></ol>',
        '                    <span class="fav-pos num" data-fav-pos></span>',
        f'                    <a class="pill pill-ink fav-next" data-fav-next>{bi("Next", "下一页")} →</a>',
        "                </div>",
        '                <span class="fav-range-long num" data-fav-range-long></span>',
        "            </nav>",
    ])


def category_page(config: dict[str, Any], payload: dict[str, Any], category: dict[str, Any]) -> str:
    path = f"favorites/{category['id']}.html"
    page = page_config(config, path)
    works = category["works"]
    name_en, one, many = ENGLISH[category["id"]]
    count_en, count_zh = count_label(category, len(works))
    main = "\n".join([
        f'<main id="main" class="fav-cat enter" tabindex="-1" data-fav-cat="{category["id"]}" '
        f'data-per-page="{PER_PAGE}" data-unit-zh="{esc(category["unit"])}" data-unit-en="{one}|{many}">',
        '    <div class="fav-layout">',
        rail(payload["categories"], category["id"]),
        '        <div class="fav-body">',
        f'            <h1 class="visually-hidden">{bi(f"{name_en} · Favorites", f"{category["name"]} · 收藏")}</h1>',
        filter_bar(category),
        '            <ol class="fav-list" data-fav-list tabindex="-1" lang="zh-Hans">',
        rows(category),
        "            </ol>",
        pager(),
        about_section(payload, " " * 12),
        "        </div>",
        "    </div>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=(f"{name_en} · Favorites · simoncos", f"{category['name']} · 收藏 · simoncos"),
        description=(
            f"{name_en}: the {count_en} I rated five stars on Douban, newest mark first, "
            "with my original notes in Chinese.",
            f"{category['name']}：我在豆瓣上打过五星的 {count_zh}，按标记时间从新到旧，附豆瓣短评原文。",
        ),
        canonical=path,
    )
    return render_document(config, page, head=head, main=main)


# ---------------------------------------------------------------- index page
def glyph(category: dict[str, Any], on: bool) -> str:
    works = category["works"]
    n_reviewed = sum(is_reviewed(work) for work in works)
    href = f"favorites/{category['id']}.html"
    name_en = ENGLISH[category["id"]][0]
    count_en, count_zh = count_label(category, len(works))
    return "\n".join([
        f'        <div class="glyph{" is-peek" if on else ""}" data-peek="{category["id"]}">',
        f'            <a class="glyph-cover" href="{href}" tabindex="-1" aria-hidden="true"></a>',
        f'            <a class="glyph-label" href="{href}"'
        f'{i18n_attrs(aria_label=(f"{name_en}, {count_en}", f"{category["name"]}，{count_zh}"))}>'
        f'<span class="glyph-name"><span class="glyph-char" lang="zh-Hant">{GLYPHS[category["id"]]}</span>'
        f'<span class="glyph-en" data-l="en">{esc(name_en)}</span></span>'
        '<span class="glyph-stats num">'
        f'<span class="glyph-count">{bi(count_en, count_zh)}</span>'
        f'<span class="glyph-rev">{bi(f"{n_reviewed} with notes", f"有短评 {n_reviewed}")}</span>'
        f'<span class="glyph-open">{bi("Open →", "进入 →")}</span></span></a>',
        "        </div>",
    ])


def reel(category: dict[str, Any], on: bool) -> str:
    works = category["works"]
    reviewed = [work for work in works if is_reviewed(work)]
    href = f"favorites/{category['id']}.html"
    count_en, count_zh = count_label(category, len(works))
    reviewed_en, reviewed_zh = count_label(category, len(reviewed))
    items = []
    for work in reviewed[:RECENT_ON_INDEX]:
        items.append(
            f'                <li class="reel-item">{date_cell(work["date"])}<div class="reel-text">'
            f'{title_link(work)}<p class="fav-review">{esc(main_mark(work)["review"])}</p></div></li>'
        )
    return "\n".join([
        f'        <div class="reel{" is-on" if on else ""}" data-reel="{category["id"]}">',
        '            <div class="reel-head">',
        f'                <h2 class="reel-h">{bi("Latest notes · ", "最近的短评 · ")}'
        f'{bi(ENGLISH[category["id"]][0], category["name"])}</h2>',
        '                <div class="reel-ctas">'
        f'<a class="pill pill-ink" href="{href}">{bi(f"All {count_en}", f"全部 {count_zh}")} <span aria-hidden="true">→</span></a>'
        f'<a class="pill" href="{href}?filter=reviewed">'
        f'{bi(f"Only the {len(reviewed)} with notes", f"只看有短评的 {reviewed_zh}")}</a></div>',
        "            </div>",
        '            <ol class="reel-list" lang="zh-Hans">',
        *items,
        "            </ol>",
        "        </div>",
    ])


def index_page(config: dict[str, Any], payload: dict[str, Any]) -> str:
    path = "favorites.html"
    page = page_config(config, path)
    categories = payload["categories"]
    total = sum(len(category["works"]) for category in categories)
    reviewed = sum(is_reviewed(work) for category in categories for work in category["works"])
    as_of_en, as_of_zh = export_label(payload["export_date"])
    strip = (
        (f"{total} works", f"共 {total} 件"),
        (f"{reviewed} with notes", f"{reviewed} 件有短评"),
        (f"Douban data as of {as_of_en}", f"豆瓣数据截至 {as_of_zh}"),
    )
    main = "\n".join([
        '<main id="main" class="fav enter" tabindex="-1">',
        '    <section class="fav-head">',
        f'        <h1 class="fav-h1">{bi("Favorites", "收藏")}</h1>',
        '        <p class="fav-intro">'
        + bi("Every book, film, album and game I’ve rated five stars on Douban.", "我在豆瓣上打过五星的书、影、音、游。")
        + "</p>",
        "    </section>",
        '    <p class="fav-strip num">'
        + '<span aria-hidden="true">/</span>'.join(f"<span>{bi(en, zh)}</span>" for en, zh in strip)
        + "</p>",
        '    <div class="glyphs" data-glyphs>',
        *(glyph(category, index == 0) for index, category in enumerate(categories)),
        "    </div>",
        '    <section class="reels" data-reels>',
        *(reel(category, index == 0) for index, category in enumerate(categories)),
        "    </section>",
        about_section(payload),
        "</main>",
    ])
    head = render_meta(
        config,
        title=("Favorites · simoncos", "收藏 · simoncos"),
        description=(
            "Every book, film, album and game I rated five stars on Douban, by marking date, with the original notes.",
            "我在豆瓣上打过五星的书、影、音、游，按标记时间排列，附豆瓣短评原文。",
        ),
        canonical=path,
    )
    return render_document(config, page, head=head, main=main)


# ---------------------------------------------------------------- main
def render_all() -> dict[Path, str]:
    config = load_config()
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    pages = {ROOT / "favorites.html": index_page(config, payload)}
    for category in payload["categories"]:
        pages[ROOT / f"favorites/{category['id']}.html"] = category_page(config, payload, category)
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
