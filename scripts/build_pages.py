#!/usr/bin/env python3
"""Render the site's non-article pages from data/site.json.

Home, Work, Projects, the Sleep Toolkit boards, About and 404 are generated
here. Articles come from generate_blog_pages.py and Favorites from
update_favorites_pages.py; the shared shell comes from site_shell.py.
Every page is complete HTML, so it reads fine without JavaScript; the page
scripts in src/ts only add interaction.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_zhihu_research import render_research
from build_music_riddle import render_music_riddle, render_music_cover

from site_shell import (  # noqa: E402
    ROOT,
    bi,
    bi_value,
    esc,
    i18n_attrs,
    lang_pair,
    load_config,
    page_config,
    render_document,
    render_meta,
    updated_label,
)


SITE_DATA_PATH = ROOT / "data/site.json"
ARTICLE_INDEX_PATH = ROOT / "data/article_index.json"

ARTICLE_KIND = {"en": "Article", "zh": "文章"}
# The home page's Newest list shows this many rows for the chosen topic; the
# rest stay in the page for the filter and are one click away in Articles
# and Work. Older essays republished with their historical dates made the
# full list run to 59 rows.
NEWEST_SHOWN = 10
TOPICS = (
    ("all", "All", "全部"),
    ("build", "Creating", "创造"),
    # The catch-all bucket. Labelled 其他 / Other so it does not collide with
    # the Articles page's narrower 思考 / Thinking tag; the key stays "think".
    ("think", "Other", "其他"),
    ("body", "Experiences", "体验"),
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def href_attrs(value: Any, prefix: str = "", **extra: tuple[str, str]) -> str:
    """href for English, with the Chinese target swapped in by site.js.

    `extra` takes other per-language attributes of the same element, since an
    element can carry only one data-i18n list."""
    en, zh = lang_pair(value)

    def resolve(target: str) -> str:
        if not target or target.startswith(("http://", "https://", "mailto:", "#")):
            return target
        return f"{prefix}{target}"

    return i18n_attrs(href=(resolve(en), resolve(zh)), **extra)


def pick(value: Any, lang: str) -> str:
    en, zh = lang_pair(value)
    return zh if lang == "zh" else en


def work_title(work: dict[str, Any], key: str = "title") -> dict[str, str]:
    """A work's title for a link. A work whose page exists only in Chinese
    (`zh_only`) gets the "(in Chinese)" mark on its English title, as the
    Endless Echoes page marks its Chinese-only sources."""
    en, zh = lang_pair(work.get(key) or work["title"])
    if work.get("zh_only"):
        en = f"{en} (in Chinese)"
    return {"en": en, "zh": zh}


def article_topic(tags: list[str]) -> str:
    if "out" in tags:
        return "body"
    if {"km", "hack", "design"} & set(tags):
        return "build"
    return "think"


def article_entries(index: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Article groups keyed by id, reduced to what the listings need."""
    entries = {}
    for group in index.get("groups", []):
        languages = group.get("languages") or {}
        en = languages.get("en") or {}
        zh = languages.get("zh") or {}
        first = en or zh
        entries[group["id"]] = {
            "id": group["id"],
            "date": group.get("date", ""),
            "tags": group.get("tags") or [],
            "title": {"en": en.get("title") or zh.get("title", ""), "zh": zh.get("title") or en.get("title", "")},
            "href": {
                "en": f"blogs/{(en or first)['file']}",
                "zh": f"blogs/{(zh or first)['file']}",
            },
            "bilingual": bool(en and zh),
            "image": en.get("image") or zh.get("image") or "",
            "description": {"en": en.get("description", ""), "zh": zh.get("description", "")},
        }
    return entries


# ---- Home -------------------------------------------------------------------


def home_panels(site: dict[str, Any], articles: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    works = {work["id"]: work for work in site["works"]}
    panels = []
    for entry in site["featured"]:
        if "work" in entry:
            work = works[entry["work"]]
            # A featured title is set large, so the "(in Chinese)" mark goes
            # on the small kind line above it instead.
            kind_en, kind_zh = lang_pair(work["kind"])
            if work.get("zh_only"):
                kind_en = f"{kind_en} · In Chinese"
            panels.append({
                "kind": {"en": kind_en, "zh": kind_zh},
                "date": work["date"],
                "title": work["title"],
                "desc": work["home_desc"],
                "img": work["img"],
                "href": work["href"],
            })
        else:
            article = articles[entry["article"]]
            panels.append({
                "kind": ARTICLE_KIND,
                "date": article["date"],
                "title": article["title"],
                "desc": entry["desc"],
                "img": entry["img"],
                "href": article["href"],
            })
    return panels


def home_rows(site: dict[str, Any], articles: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    # A work without an href is in progress: shown on Work, but not offered
    # on the home page as something to open.
    for work in (work for work in site["works"] if work.get("href")):
        rows.append({
            "date": work["date"],
            "title": work_title(work),
            "kind": work["kind"],
            "href": work["href"],
            "topic": work["home_topic"],
            "img": work["img"],
            "bilingual": not work.get("single"),
        })
    for article in articles.values():
        rows.append({
            "date": article["date"],
            "title": article["title"],
            "kind": ARTICLE_KIND,
            "href": article["href"],
            "topic": article_topic(article["tags"]),
            "img": article["image"],
            "bilingual": article["bilingual"],
        })
    rows.sort(key=lambda row: row["date"], reverse=True)
    return rows


def render_home(config: dict[str, Any], site: dict[str, Any], articles: dict[str, dict[str, Any]]) -> str:
    page = page_config(config, "index.html")
    panels = home_panels(site, articles)
    rows = home_rows(site, articles)
    count = len(panels)

    bars = []
    stage = []
    for i, panel in enumerate(panels):
        title_en, title_zh = lang_pair(panel["title"])
        kind_en, kind_zh = lang_pair(panel["kind"])
        # A folded panel shows its title only in aria-hidden copies, so the
        # link names the work itself.
        label = (f"{title_en}, {kind_en}, {panel['date']}", f"{title_zh}，{kind_zh}，{panel['date']}")
        on = " is-on" if i == 0 else ""
        bars.append(
            f'                <button class="sel-bar{on}" type="button" data-i="{i}"'
            f'{i18n_attrs(aria_label=(title_en, title_zh))}>'
            '<span class="sel-track"><span class="sel-fill"></span></span></button>'
        )
        stage.append("\n".join([
            f'            <a class="panel{on}" data-i="{i}"{href_attrs(panel["href"], aria_label=label)}>',
            f'                <img class="panel-img" src="{esc(panel["img"])}" alt="" decoding="async"'
            f' fetchpriority="{"high" if i == 0 else "low"}">',
            '                <span class="panel-shade"></span>',
            f'                <span class="panel-top"><span>{i + 1:02d}</span>'
            f'<span class="panel-meta">{bi_value(panel["kind"])} · {esc(panel["date"])}</span></span>',
            '                <span class="panel-body">',
            f'                    <span class="panel-title">{bi_value(panel["title"])}</span>',
            f'                    <span class="panel-desc">{bi_value(panel["desc"])}</span>',
            f'                    <span class="panel-open">{bi("Open", "打开")}<span aria-hidden="true">→</span></span>',
            "                </span>",
            f'                <span class="panel-side" aria-hidden="true">{bi_value(panel["title"])}</span>',
            f'                <span class="panel-row" aria-hidden="true">{bi_value(panel["title"])}</span>',
            "            </a>",
        ]))

    counts = {topic: sum(1 for row in rows if topic in ("all", row["topic"])) for topic, _, _ in TOPICS}
    chips = [
        f'                <button class="seg-btn" type="button" data-topic="{topic}" '
        f'aria-pressed="{"true" if topic == "all" else "false"}">{bi(en, zh)} '
        f'<span class="seg-n">{counts[topic]}</span></button>'
        for topic, en, zh in TOPICS
    ]

    row_html = []
    for i, row in enumerate(rows):
        title_en, title_zh = lang_pair(row["title"])
        alt = ""  # the 中文 / EN mark stands in for the other language's title
        float_attr = f' data-float="{esc(row["img"])}"' if row["img"] else ""
        bilingual = '<span class="row-bi"><span lang="zh-Hans">中文</span> / EN</span>' if row["bilingual"] else ""
        hidden = " hidden" if i >= NEWEST_SHOWN else ""
        row_html.append(
            f'            <a class="row" data-topic="{row["topic"]}"{href_attrs(row["href"])}{float_attr}{hidden}>'
            f'<span class="row-main"><span class="row-t">{bi(title_en, title_zh)}</span>{alt}</span>'
            f'<span class="row-meta">{bilingual}<span>{bi_value(row["kind"])}</span>'
            f'<span class="num">{esc(row["date"])}</span></span></a>'
        )

    n_articles = len(articles)
    updated_en, updated_zh = updated_label(config["site_updated"])
    main = "\n".join([
        '<main id="main" class="home enter" tabindex="-1">',
        '    <section class="sel" data-sel aria-labelledby="sel-title">',
        '        <div class="sel-head">',
        f'            <h1 class="sel-h1" id="sel-title">{bi("Selected work", "精选")}</h1>',
        '            <div class="sel-prog">',
        '                <div class="sel-bars">',
        *bars,
        "                </div>",
        f'                <span class="sel-count" aria-live="polite">01 / {count:02d}</span>',
        "            </div>",
        "        </div>",
        '        <div class="sel-stage">',
        *stage,
        "        </div>",
        "    </section>",
        '    <section class="newest" aria-labelledby="newest-title">',
        '        <div class="newest-head">',
        f'            <div class="newest-title"><h2 id="newest-title">{bi("Newest", "最新")}</h2>'
        f'<span>{bi(updated_en, updated_zh)}</span></div>',
        f'            <div class="seg" role="group"{i18n_attrs(aria_label=("Topics", "主题"))}>',
        *chips,
        "            </div>",
        "        </div>",
        f'        <div class="rows" data-rows data-shown="{NEWEST_SHOWN}">',
        *row_html,
        "        </div>",
        '        <div class="newest-more">'
        f'<a class="pill" href="blogs.html">{bi(f"All {n_articles} articles", f"全部 {n_articles} 篇文章")} <span aria-hidden="true">→</span></a>'
        f'<a class="pill" href="gallery.html">{bi("All work", "全部作品")} <span aria-hidden="true">→</span></a></div>',
        "    </section>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=("simoncos", "simoncos"),
        description=(
            "Projects, writing, and field notes from simoncos: AI, data, personal systems, and long-form articles.",
            "simoncos 的项目、写作与现场记录：AI、数据、个人系统与长文。",
        ),
        canonical="index.html",
    )
    return render_document(config, page, head=head, main=main)


# ---- Work -------------------------------------------------------------------


def count_label(n: int) -> tuple[str, str]:
    return (f"{n} item" if n == 1 else f"{n} items", f"{n} 件")


def render_work(config: dict[str, Any], site: dict[str, Any]) -> str:
    page = page_config(config, "gallery.html")
    topics = site["work_topics"]
    by_topic: dict[str, list[dict[str, Any]]] = {topic["id"]: [] for topic in topics}
    for work in site["works"]:
        by_topic[work["work_topic"]].append(work)
    for works in by_topic.values():
        works.sort(key=lambda work: work["date"], reverse=True)

    titles = []
    for i, topic in enumerate(topics):
        titles.append("\n".join([
            f'                <div class="wheel-title{" is-on" if i == 0 else ""}" data-i="{i}"{"" if i == 0 else " aria-hidden=\"true\""}>',
            f'                    <p class="wheel-name">{bi_value(topic["title"])}</p>',
            f'                    <span class="wheel-line">{bi_value(topic["line"])}</span>',
            "                </div>",
        ]))

    # Each type shows one picture: the work named by the type's `wheel_work`, else
    # its newest finished one. Three laps of the types make a ring big enough to
    # read as a wheel.
    def cover_work(topic: dict[str, Any]) -> dict[str, Any]:
        works = by_topic[topic["id"]]
        return next((work for work in works if work["id"] == topic.get("wheel_work")),
                    next((work for work in works if work.get("href")), works[0]))

    cards = []
    ring = len(topics) * 3
    for i in range(ring):
        topic = topics[i % len(topics)]
        work = cover_work(topic)
        n_en, n_zh = count_label(len(by_topic[topic["id"]]))
        title_en, title_zh = lang_pair(topic["title"])
        cards.append(
            f'            <button class="wheel-card" type="button" data-i="{i}" data-topic="{topic["id"]}" tabindex="-1"'
            f'{i18n_attrs(aria_label=(title_en, title_zh))}>'
            f'<span class="wheel-face"><img src="{esc(work.get("wheel_img", work["img"]))}" alt="" draggable="false" '
            f'decoding="async" loading="lazy" fetchpriority="{"high" if i == 0 else "low"}"></span>'
            f'<span class="wheel-label"><span>{bi(n_en, n_zh)}</span>'
            f'<span class="wheel-enter">{bi("Enter", "进入")}</span></span></button>'
        )

    sections = []
    for topic in topics:
        works = by_topic[topic["id"]]
        tabs = "".join(
            f'<a class="seg-btn" href="#{other["id"]}"{" aria-current=\"true\"" if other is topic else ""}>'
            f'{bi_value(other["title"])}</a>'
            for other in topics
        )
        def card(work: dict[str, Any]) -> str:
            # A work in progress has no page yet, so its card is not a link.
            done = bool(work.get("href"))
            tag, attrs = ("a", href_attrs(work["href"])) if done else ("div", "")
            # Works in progress sit under their own 在做 heading, so the card shows only the year.
            when = esc(work["date"][:4])
            return (
                f'                <{tag} class="wcard{"" if done else " is-wip"}"{attrs}>'
                f'<span class="wcard-img"><img src="{esc(work["img"])}" alt="" decoding="async" loading="lazy"></span>'
                '<span class="wcard-text">'
                f'<span class="wcard-title">{bi_value(work_title(work, "work_title"))}</span>'
                f'<span class="wcard-desc">{bi_value(work["desc"])}</span>'
                f'<span class="wcard-year num">{when}</span></span></{tag}>'
            )

        done = [work for work in works if work.get("href")]
        wip = [work for work in works if not work.get("href")]
        grids = []
        if done:
            grids += [f'        <div class="wgrid" data-n="{min(len(done), 3)}">', *map(card, done), "        </div>"]
        if wip:
            grids += [
                f'        <h3 class="wgroup-h">{bi("In progress", "在做")}</h3>',
                f'        <div class="wgrid" data-n="{min(len(wip), 3)}">', *map(card, wip), "        </div>",
            ]
        related = ""
        if topic.get("related"):
            links = "".join(
                f'<a{href_attrs(item["href"])}><span class="related-t">{bi_value(item["label"])}</span>'
                f'<span class="related-k">{bi_value(item["kind"])} {esc(item["arrow"])}</span></a>'
                for item in topic["related"]
            )
            related = (
                '        <div class="related">'
                f'<span class="related-label">{bi("Related elsewhere on the site", "站内相关")}</span>'
                f"{links}</div>"
            )
        sections.append("\n".join([
            f'    <section class="topic" id="{topic["id"]}" data-topic="{topic["id"]}" aria-labelledby="topic-{topic["id"]}">',
            '        <div class="topic-bar">',
            f'            <a class="pill" href="gallery.html" data-topic-back>← {bi("All work", "全部作品")}</a>',
            f'            <nav class="seg"{i18n_attrs(aria_label=("Types", "类别"))}>{tabs}</nav>',
            "        </div>",
            '        <div class="topic-head">',
            f'            <h2 id="topic-{topic["id"]}">{bi_value(topic["title"])}</h2>',
            f'            <p>{bi_value(topic["desc"])}</p>',
            "        </div>",
            *grids,
            *([related] if related else []),
            "    </section>",
        ]))

    main = "\n".join([
        '<main id="main" class="work" data-work tabindex="-1">',
        f'    <h1 class="visually-hidden">{bi("Work", "作品")}</h1>',
        f'    <section class="work-wheel" data-wheel{i18n_attrs(aria_label=("Work types", "作品类别"))}>',
        '        <div class="wheel-top">',
        '            <div class="wheel-titles" aria-live="polite">',
        *titles,
        "            </div>",
        '            <div class="wheel-ctrl">',
        f'                <span class="wheel-pos num">01 / {len(topics):02d}</span>',
        '                <div class="wheel-btns">',
        f'                    <button class="round-btn" type="button" data-wheel-step="-1"{i18n_attrs(aria_label=("Previous", "上一个"))}>←</button>',
        f'                    <button class="round-btn ink" type="button" data-wheel-step="1"{i18n_attrs(aria_label=("Next", "下一个"))}>→</button>',
        "                </div>",
        "            </div>",
        "        </div>",
        *cards,
        '        <div class="wheel-bottom">',
        f'            <button class="round-btn" type="button" data-wheel-step="-1"{i18n_attrs(aria_label=("Previous", "上一个"))}>←</button>',
        f'            <span class="wheel-pos num">01 / {len(topics):02d}</span>',
        f'            <button class="round-btn ink" type="button" data-wheel-step="1"{i18n_attrs(aria_label=("Next", "下一个"))}>→</button>',
        "        </div>",
        "    </section>",
        *sections,
        "</main>",
    ])
    head = render_meta(
        config,
        title=("Work · simoncos", "作品 · simoncos"),
        description=(
            "Apps, games, talks, research and music from simoncos.",
            "simoncos 的应用、游戏、演讲、研究与音乐。",
        ),
        canonical="gallery.html",
    )
    return render_document(config, page, head=head, main=main)


# ---- Projects ---------------------------------------------------------------


def render_apps(config: dict[str, Any], site: dict[str, Any]) -> str:
    page = page_config(config, "apps.html")
    topic = next(topic for topic in site["work_topics"] if topic["id"] == "apps")
    apps = sorted((work for work in site["works"] if work["work_topic"] == topic["id"]),
                  key=lambda work: (bool(work.get("href")), work["date"]), reverse=True)
    rows = []
    for work in apps:
        if not work.get("href"):
            rows.append(
                '        <div class="prow is-wip">'
                '<span class="prow-main">'
                f'<span class="prow-title">{bi_value(work["title"])}</span>'
                f'<span class="prow-line">{bi_value(work["desc"])}</span>'
                f'<span class="prow-facts"><span>{bi("In progress", "在做")}</span><span>{esc(work["date"][:4])}</span></span></span>'
                f'<span class="prow-cover"><img src="{esc(work["img"])}" alt="" decoding="async" loading="lazy"></span></div>'
            )
            continue
        project = next((project for project in site["projects"] if project["href"] == work["href"]), {})
        facts = (f'<span class="prow-status"><span class="live-dot" aria-hidden="true"></span>{bi_value(project["status"])}</span>'
                 f'<span>{esc(project["years"])}</span><span>{bi_value(project["tags"])}</span>') if project else (
                     f'<span>{esc(work["date"])}</span><span>{bi_value(work["kind"])}</span>')
        rows.append(
            f'        <a class="prow"{href_attrs(work["href"])}>'
            '<span class="prow-main">'
            f'<span class="prow-title">{bi_value(work["title"])}</span>'
            f'<span class="prow-line">{bi_value(project.get("line", work["desc"]))}</span>'
            f'<span class="prow-facts">{facts}</span></span>'
            f'<span class="prow-cover"><img src="{esc(work["img"])}" alt="" decoding="async" loading="lazy"></span></a>'
        )
    main = "\n".join([
        '<main id="main" class="projects enter" tabindex="-1">',
        '    <section class="page-head">',
        f'        <h1 class="page-h1">{bi_value(topic["title"])}</h1>',
        f'        <p class="page-lead">{bi_value(topic["desc"])}</p>',
        "    </section>",
        '    <div class="plist">',
        *rows,
        "    </div>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=tuple(f"{label} · {work_label} · simoncos" for label, work_label in zip(lang_pair(topic["title"]), ("Work", "作品"))),
        description=lang_pair(topic["desc"]),
        canonical="apps.html",
    )
    return render_document(config, page, head=head, main=main)


# ---- Project board ----------------------------------------------------------

BOARD_TEXT = {
    "en": {
        "back": "Work",
        "board": "Board",
        "present": "Present",
        "modes": "View",
        "updated": "updated",
        "pipeline": "Pipeline — hover a stage",
        "privacy": "What happens to your file",
        "cli": "Or skip the upload: the CLI runs entirely on your machine.",
        "entries": "Entry points",
        "log": "Changelog",
        "log_note": "From the project’s commit history",
        "nights": "nights, 2016 — 2026",
        "dots_note": "One cell per night, one row per year (illustrative layout of the total count).",
        "prev": "Previous",
        "next": "Next",
        "description": "Sleep Toolkit turns SleepCycle CSV exports into structured JSON, an interactive HTML report, and a PDF.",
    },
    "zh": {
        "back": "作品",
        "board": "看板",
        "present": "演示",
        "modes": "视图",
        "updated": "更新于",
        "pipeline": "处理流程 —— 把指针放到某一步上",
        "privacy": "你的文件会经历什么",
        "cli": "也可以不上传：CLI 完全在本地运行。",
        "entries": "入口",
        "log": "更新记录",
        "log_note": "来自项目的提交记录",
        "nights": "个夜晚，2016 — 2026",
        "dots_note": "每格一个夜晚，每行一年（按总数示意排布）。",
        "prev": "上一块",
        "next": "下一块",
        "description": "Sleep Toolkit 将 SleepCycle CSV 导出转换为结构化 JSON、交互式 HTML 报告和 PDF。",
    },
}


def render_board(config: dict[str, Any], site: dict[str, Any], lang: str) -> str:
    project = next(item for item in site["projects"] if item["id"] == "sleep-toolkit")
    rel_path = project["href"][lang]
    page = page_config(config, rel_path)
    text = BOARD_TEXT[lang]
    up = "../"

    def t(value: Any) -> str:
        return esc(pick(value, lang))

    def local(path: str) -> str:
        return path if path.startswith(("http://", "https://")) else f"{up}{path}"

    stages = []
    descs = []
    for i, stage in enumerate(project["stages"]):
        on = " is-on" if i == 0 else ""
        # A step keeps its button and the arrow after it together, so a
        # wrapped pipeline ends a line on an arrow instead of starting one.
        arrow = '<span class="stage-arrow" aria-hidden="true"></span>' if i < len(project["stages"]) - 1 else ""
        stages.append(
            f'<span class="stage-step"><button class="stage-btn{on}" type="button" data-stage="{i}" '
            f'aria-pressed="{"true" if i == 0 else "false"}">{t(stage["label"])}</button>{arrow}</span>'
        )
        descs.append(f'<p class="stage-desc{on}" data-stage-desc="{i}">{t(stage["desc"])}</p>')

    privacy = "".join(
        f'<li><span class="priv-at">{esc(step["at"])}</span><span class="priv-label">{t(step["label"])}</span></li>'
        for step in project["privacy"]
    )
    metrics = "".join(
        f'<div><dt class="metric-v">{esc(metric["v"])}</dt><dd class="metric-k">{t(metric["k"])}</dd></div>'
        for metric in project["metrics"]
    )
    links = "".join(
        f'<a class="entry" href="{esc(local(pick(link["href"], lang)))}">'
        f'<span class="entry-text"><span class="entry-label">{t(link["label"])}</span>'
        f'<span class="entry-kind">{t(link["kind"])}</span></span>'
        f'<span class="entry-arrow" aria-hidden="true">{esc(link["arrow"])}</span></a>'
        for link in project["links"]
    )
    log = "".join(
        f'<li><span class="log-when"><span class="log-dot" aria-hidden="true"></span>'
        f'{esc(entry["v"] + " · ") if entry.get("v") else ""}{esc(entry["d"])}</span>'
        f'<span class="log-t">{t(entry["t"])}</span></li>'
        for entry in project["log"]
    )

    def block(kind: str, span: int, rows: int, index: int, body: str, extra: str = "", tag: str = "section",
              attrs: str = "", background: str = "") -> str:
        classes = f"block block-{kind}{' rows-2' if rows == 2 else ''}{extra}"
        style = f"--span:{span};--rows:{rows};--delay:{index * 0.06:.2f}s"
        if background:
            style += f";background:{background}"
        return f'        <{tag} class="{classes}" style="{style}"{attrs}>{body}</{tag}>'

    blocks = [
        block("intro", 7, 2, 0,
              f'<span class="intro-status"><span class="live-dot" aria-hidden="true"></span>'
              f'{t(project["status"])} · {esc(text["updated"])} {esc(project["updated"])}</span>'
              f'<h1 class="intro-title">{t(project["title"])}</h1>'
              f'<span class="intro-sub">{t(project["subtitle"])}</span>'
              f'<p class="intro-sum">{t(project["summary"])}</p>'),
        block("image", 5, 2, 1,
              f'<img class="block-img contain" src="{local(project["report_image"])}" alt="{t(project["report_caption"])}" decoding="async">'
              f'<span class="block-caption">{t(project["report_caption"])}</span>',
              # The report preview is a dark screenshot; its tile keeps that backdrop.
              extra=" is-image", background="#141d2b"),
        block("dots", 8, 1, 2,
              f'<div class="dots-head"><span class="dots-count" data-dots-count>3,656</span>'
              f'<span class="block-k" data-dots-label data-default="{esc(text["nights"])}">{esc(text["nights"])}</span></div>'
              f'<canvas class="dots-canvas" data-dots aria-hidden="true"></canvas>'
              f'<span class="dots-note">{esc(text["dots_note"])}</span>'),
        block("metrics", 4, 1, 3, f'<dl class="metrics">{metrics}</dl>', extra=" is-ink"),
        block("pipeline", 7, 1, 4,
              f'<span class="block-k">{esc(text["pipeline"])}</span>'
              f'<div class="stages">{"".join(stages)}</div>{"".join(descs)}'),
        block("privacy", 5, 1, 5,
              f'<span class="block-k">{esc(text["privacy"])}</span>'
              f'<ol class="priv" data-priv>{privacy}</ol>'
              f'<p class="priv-cli">{esc(text["cli"])}</p>'),
        block("image", 7, 1, 6,
              f'<img class="block-img" src="{local(project["essay_image"])}" alt="" decoding="async" loading="lazy">'
              f'<span class="block-caption">{t(project["essay_caption"])}</span>',
              extra=" is-image", tag="a", attrs=f' href="{esc(local(pick(project["essay_href"], lang)))}"'),
        block("links", 5, 1, 7,
              f'<span class="block-k">{esc(text["entries"])}</span><div class="entry-list">{links}</div>',
              extra=" is-ink"),
        block("log", 12, 1, 8,
              f'<div class="dots-head"><span class="block-k">{esc(text["log"])}</span>'
              f'<span class="block-k">{esc(text["log_note"])}</span></div>'
              f'<ol class="log">{log}</ol>'),
    ]

    main = "\n".join([
        '<main id="main" class="board enter" data-board tabindex="-1">',
        '    <div class="board-bar">',
        f'        <div class="board-crumb"><a class="pill" href="{up}gallery.html">← {esc(text["back"])}</a>'
        f'<span class="muted">{t(project["title"])}</span></div>',
        '        <div class="board-tools">',
        f'            <div class="seg" role="group" aria-label="{esc(text["modes"])}">'
        f'<button class="seg-btn" type="button" data-mode="board" aria-pressed="true">{esc(text["board"])}</button>'
        f'<button class="seg-btn" type="button" data-mode="present" aria-pressed="false">{esc(text["present"])}</button></div>',
        '            <div class="board-nav">',
        f'                <button class="round-btn ink" type="button" data-slide="-1" aria-label="{esc(text["prev"])}">←</button>',
        f'                <span class="board-pos" data-slide-pos>1 / {len(blocks)}</span>',
        f'                <button class="round-btn ink" type="button" data-slide="1" aria-label="{esc(text["next"])}">→</button>',
        "            </div>",
        "        </div>",
        "    </div>",
        '    <div class="bento" data-track>',
        *blocks,
        "    </div>",
        "</main>",
    ])
    title = f'{pick(project["title"], lang)} · {"Work" if lang == "en" else "作品"} · simoncos'
    head = render_meta(
        config,
        title=(title, title),
        description=(text["description"], text["description"]),
        canonical=rel_path,
        image={
            "url": f'{config["site_url"].rstrip("/")}/assets/og/og-sleep-toolkit.png',
            "width": "1200",
            "height": "630",
            "alt": "Sleep Toolkit",
        },
    )
    html_lang = "zh-Hans" if lang == "zh" else "en"
    document = render_document(config, page, head=head, main=main, html_attrs=f' data-page-lang="{lang}"')
    return document.replace('<html lang="en"', f'<html lang="{html_lang}"', 1)


# ---- Music ------------------------------------------------------------------


def clock(seconds: float) -> str:
    whole = int(seconds)
    return f"{whole // 60}:{whole % 60:02d}"


def wave_path(peaks: list[int]) -> str:
    """One bar per peak, centred on the middle line, in a 0-100 tall box."""
    bars = []
    for i, peak in enumerate(peaks):
        h = max(2.0, peak * 0.96)
        bars.append(f"M{i + 0.18:.2f} {(100 - h) / 2:.1f}h0.64v{h:.1f}h-0.64z")
    return "".join(bars)


def render_song(config: dict[str, Any], site: dict[str, Any], song: dict[str, Any]) -> str:
    rel_path = song["page"]
    page = page_config(config, rel_path)
    work = next(item for item in site["works"] if item["id"] == song["id"])
    measured = load_json(ROOT / song["peaks"])
    peaks = measured["peaks"]
    length = clock(measured["duration"])
    up = "../" * rel_path.count("/")
    audio = song["audio"].rsplit("/", 1)[-1]
    title_en, title_zh = lang_pair(work["title"])
    artist = lang_pair(song["credits"][0]["name"])[1]

    def name(value: Any) -> str:
        en, zh = lang_pair(value)
        return bi(en, zh) if en != zh else f'<span lang="zh-Hans">{esc(zh)}</span>'

    credits = "".join(
        f'<div><dt>{bi_value(credit["role"])}</dt><dd>{name(credit["name"])}</dd></div>'
        for credit in song["credits"]
    )
    stanzas = []
    for stanza in song["lyrics"]:
        lines = "".join(
            f'<span class="ly"><span class="ly-zh">{esc(line["zh"])}</span>'
            f'<span class="ly-en" data-l="en" lang="en">{esc(line["en"])}</span></span>'
            for line in stanza
        )
        stanzas.append(f'                <p class="stanza">{lines}</p>')
    score = []
    if song.get("score"):
        files = []
        for item in song["score"]["files"]:
            size = (ROOT / item["path"]).stat().st_size
            size_text = f"{size / 1e6:.1f} MB" if size >= 1e6 else f"{max(1, round(size / 1e3))} KB"
            files.append(
                f'                <li><a class="song-file" href="{esc(item["path"].rsplit("/", 1)[-1])}" download>'
                f'<span class="song-file-format">{esc(item["format"])}</span>'
                f'<span class="song-file-label">{bi_value(item["label"])}</span>'
                f'<span class="song-file-desc">{bi_value(item["desc"])}</span>'
                f'<span class="song-file-size num">{size_text}</span></a></li>'
            )
        score = [
            '        <section class="block block-score" style="--span:12;--rows:1;--delay:0.18s" aria-labelledby="score-title">',
            f'            <h2 class="block-k" id="score-title">{bi("Score", "乐谱")}</h2>',
            f'            <p class="song-score-note">{bi_value(song["score"]["note"])}</p>',
            '            <ul class="song-files">',
            *files,
            "            </ul>",
            "        </section>",
        ]
    wave = wave_path(peaks)
    svg = (
        f'<svg class="{{cls}}" viewBox="0 0 {len(peaks)} 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
        f'<path d="{wave}"/></svg>'
    )
    play_icon = '<svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z"/></svg>'
    pause_icon = (
        '<svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>'
    )

    main = "\n".join([
        '<main id="main" class="board song enter" tabindex="-1">',
        '    <div class="board-bar">',
        f'        <div class="board-crumb"><a class="pill" href="{up}gallery.html#music">← {bi("Work", "作品")}</a>'
        f'<span class="muted">{bi("Music", "音乐")}</span></div>',
        "    </div>",
        '    <div class="bento">',
        '        <section class="block block-intro rows-2" style="--span:7;--rows:2;--delay:0.00s">',
        f'            <span class="intro-status"><span class="song-dot" aria-hidden="true"></span>'
        f'<span>{bi_value(work["kind"])} · {esc(work["date"][:4])}</span></span>',
        f'            <h1 class="intro-title song-title" lang="zh-Hans">{esc(title_zh)}</h1>',
        f'            <span class="intro-sub" data-l="en">{esc(title_en)}</span>',
        f'            <dl class="song-credits">{credits}</dl>',
        f'            <p class="intro-sum">{bi_value(song["note"])}</p>',
        "        </section>",
        f'        <section class="block block-player is-ink rows-2" style="--span:5;--rows:2;--delay:0.06s"'
        f'{i18n_attrs(aria_label=("Recording", "录音"))} data-song-player data-artist="{esc(artist)}">',
        f'            <span class="block-k">{bi("Recording", "录音")} · <span class="num">{length}</span></span>',
        f'            <audio class="song-audio" src="{esc(audio)}" controls preload="metadata"></audio>',
        '            <div class="song-ui" hidden>',
        f'                <div class="song-wave" data-wave role="slider" tabindex="0" aria-valuemin="0"'
        f' aria-valuemax="{int(measured["duration"])}" aria-valuenow="0" aria-valuetext="0:00 / {length}"'
        f'{i18n_attrs(aria_label=("Position in the song", "播放位置"))}>',
        f"                    {svg.format(cls='wave-base')}",
        f"                    {svg.format(cls='wave-done')}",
        "                </div>",
        '                <div class="song-controls">',
        f'                    <button class="song-play" type="button" data-play>{play_icon}{pause_icon}'
        f'<span class="visually-hidden label-play">{bi("Play", "播放")}</span>'
        f'<span class="visually-hidden label-pause">{bi("Pause", "暂停")}</span></button>',
        f'                    <span class="song-time num"><span data-now>0:00</span> / {length}</span>',
        "                </div>",
        "            </div>",
        "        </section>",
        '        <section class="block block-lyrics" style="--span:12;--rows:1;--delay:0.12s" aria-labelledby="lyrics-title">',
        '            <div class="dots-head">',
        f'                <h2 class="block-k" id="lyrics-title">{bi("Lyrics", "歌词")}</h2>',
        f'                <span class="block-k" data-l="en">Chinese, with an English translation</span>',
        "            </div>",
        '            <div class="lyrics" lang="zh-Hans">',
        *stanzas,
        "            </div>",
        "        </section>",
        *score,
        "    </div>",
        "</main>",
    ])
    desc_en, desc_zh = lang_pair(work["desc"])
    head = render_meta(
        config,
        title=(f"{title_en} · Work · simoncos", f"{title_zh} · 作品 · simoncos"),
        description=(f"{title_en} ({title_zh}): {desc_en}", f"《{title_zh}》：{desc_zh}"),
        canonical=rel_path,
        image={
            "url": f'{config["site_url"].rstrip("/")}/{song["og_image"]}',
            "width": "1200",
            "height": "630",
            "alt": f"{title_en} ({title_zh})",
        },
    )
    return render_document(config, page, head=head, main=main)


# ---- About ------------------------------------------------------------------


def native_name(html: str, name: dict[str, str] | None) -> str:
    """Tag a name written in another script (趙澈 is traditional Chinese)."""
    if not name:
        return html
    text = esc(name["text"])
    return html.replace(text, f'<span lang="{esc(name["lang"])}">{text}</span>')


def render_about(config: dict[str, Any], site: dict[str, Any]) -> str:
    page = page_config(config, "about.html")
    about = site["about"]

    def paragraph(segments: list[list[str]], lang: str) -> str:
        parts = []
        for segment in segments:
            if len(segment) == 1:
                parts.append(esc(segment[0]))
                continue
            link = about["links"][segment[1]]
            parts.append(
                f'<a href="{esc(pick(link["href"], lang))}" data-float="{esc(link["img"])}">{esc(segment[0])}</a>'
            )
        return "".join(parts)

    paragraphs = []
    for para in about["paragraphs"]:
        en = paragraph(para["en"], "en")
        zh = paragraph(para["zh"], "zh")
        if en != zh:
            body = f'<span data-l="en">{en}</span><span data-l="zh" lang="zh-Hans">{zh}</span>'
        elif re.search(r"[\u3400-\u9fff]", en):
            body = en
        else:
            # One English line for both languages ("connecting the dots.").
            body = f'<span lang="en">{en}</span>'
        paragraphs.append(f'        <p class="about-p">{body}</p>')

    contacts = "".join(
        f'<a class="contact"{href_attrs(contact["href"])}>{esc(contact["k"])}'
        '<span class="contact-arrow" aria-hidden="true">↗</span></a>'
        for contact in about["contacts"]
    )
    main = "\n".join([
        '<main id="main" class="about enter" tabindex="-1">',
        '    <section class="about-prose">',
        f'        <h1 class="visually-hidden">{bi("About", "关于")}</h1>',
        # The motto leads the page, set largest: Che's own line, in English in both languages.
        f'        <p class="about-motto" lang="en">{esc(about["motto"])}</p>',
        f'        <p class="about-who">{native_name(bi_value(about["who"]), about.get("native_name"))}</p>',
        *paragraphs,
        "    </section>",
        '    <section class="contacts">',
        f'        <button class="copy-btn" type="button" data-copy="{esc(about["email"])}">'
        f'<span>{esc(about["email"])}</span><span class="copy-state">'
        f'<span class="copy-idle">{bi("Copy", "复制")}</span><span class="copy-done">{bi("Copied", "已复制")}</span>'
        f'<span class="copy-fail">{bi("Copy failed", "复制失败")}</span></span></button>',
        f"        {contacts}",
        "    </section>",
        *([
            # Che's WeChat official account, the same code as on the talk's last slide.
            '    <figure class="about-wechat">'
            f'<img src="{esc(about["wechat_qr"])}" width="320" height="320" alt="" decoding="async" loading="lazy">'
            f'<figcaption>{bi("WeChat official account (in Chinese)", "微信公众号")}'
            f'<span class="about-wechat-hint">{bi("Scan in WeChat", "微信扫一扫，或长按识别")}</span></figcaption></figure>',
        ] if about.get("wechat_qr") else []),
        "</main>",
    ])
    head = render_meta(
        config,
        title=("About · simoncos", "关于 · simoncos"),
        description=(
            "About simoncos: a full-stack builder in Hong Kong, working on AI and data.",
            "关于 simoncos：在香港做 AI 和数据方向的全栈开发。",
        ),
        canonical="about.html",
    )
    return render_document(config, page, head=head, main=main)


# ---- 404 --------------------------------------------------------------------


def render_not_found(config: dict[str, Any]) -> str:
    page = page_config(config, "404.html")
    links = "".join(
        f'<a class="pill" href="/{href}">{bi(en, zh)}</a>'
        for href, en, zh in (
            ("blogs.html", "Articles", "文章"),
            ("gallery.html", "Work", "作品"),
            ("favorites.html", "Favorites", "收藏"),
            ("about.html", "About", "关于"),
        )
    )
    main = "\n".join([
        '<main id="main" class="nf enter" tabindex="-1">',
        '    <span class="nf-path">404<span data-bad-path></span></span>',
        f'    <h1>{bi("Nothing here.", "这里什么都没有。")}</h1>',
        f'    <p class="nf-lede">{bi("The page you’re looking for doesn’t exist, or may have moved. Try one of these instead.", "你要找的页面不存在，或者已经搬走了。可以从这几个地方重新开始。")}</p>',
        '    <div class="nf-links">',
        f'        <a class="pill pill-ink" href="/index.html">{bi("Back to home", "回到首页")} <span aria-hidden="true">→</span></a>{links}',
        "    </div>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=("404 · simoncos", "404 · simoncos"),
        description=("The requested page was not found.", "你要找的页面不存在。"),
        canonical=None,
        robots="noindex",
    )
    return render_document(config, page, head=head, main=main, html_attrs=' data-page="notfound"')


# ---- Main -------------------------------------------------------------------


def build() -> dict[str, str]:
    config = load_config()
    site = load_json(SITE_DATA_PATH)
    articles = article_entries(load_json(ARTICLE_INDEX_PATH))
    outputs = {
        "index.html": render_home(config, site, articles),
        "gallery.html": render_work(config, site),
        "apps.html": render_apps(config, site),
        "about.html": render_about(config, site),
        "404.html": render_not_found(config),
        "gallery/research/zhihu-2015.html": render_research(config),
        "gallery/music/endless-echoes.html": render_music_riddle(config),
        "gallery/music/assets/endless-echoes-cover.svg": render_music_cover(),
        "gallery/music/assets/endless-echoes-poster.svg": render_music_cover(portrait=True),
    }
    for lang in ("en", "zh"):
        project = next(item for item in site["projects"] if item["id"] == "sleep-toolkit")
        outputs[project["href"][lang]] = render_board(config, site, lang)
    for song in site.get("songs", []):
        outputs[song["page"]] = render_song(config, site, song)
    return outputs


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if generated pages are out of date.")
    args = parser.parse_args()

    stale = []
    for rel_path, html in build().items():
        path = ROOT / rel_path
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current == html:
            continue
        stale.append(rel_path)
        if not args.check:
            path.write_text(html, encoding="utf-8")

    if args.check and stale:
        print("Generated pages are out of date:")
        for rel_path in stale:
            print(f"- {rel_path}")
        print("Run: python3 scripts/build_pages.py")
        return 1
    print("Updated pages:" if stale else "Generated pages are current.")
    for rel_path in stale:
        print(f"- {rel_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
