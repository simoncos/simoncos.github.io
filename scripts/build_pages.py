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
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

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
TOPICS = (
    ("all", "All", "全部"),
    ("build", "Building", "造东西"),
    ("think", "Thinking", "思考"),
    ("body", "Body & field", "身体与现场"),
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def href_attrs(value: Any, prefix: str = "") -> str:
    """href for English, with the Chinese target swapped in by site.js."""
    en, zh = lang_pair(value)

    def resolve(target: str) -> str:
        if not target or target.startswith(("http://", "https://", "mailto:", "#")):
            return target
        return f"{prefix}{target}"

    return i18n_attrs(href=(resolve(en), resolve(zh)))


def pick(value: Any, lang: str) -> str:
    en, zh = lang_pair(value)
    return zh if lang == "zh" else en


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
            panels.append({
                "kind": work["kind"],
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
    for work in site["works"]:
        rows.append({
            "date": work["date"],
            "title": work["title"],
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
        on = " is-on" if i == 0 else ""
        bars.append(
            f'                <button class="sel-bar{on}" type="button" data-i="{i}"'
            f'{i18n_attrs(aria_label=(title_en, title_zh))}>'
            '<span class="sel-track"><span class="sel-fill"></span></span></button>'
        )
        stage.append("\n".join([
            f'            <a class="panel{on}" data-i="{i}"{href_attrs(panel["href"])}>',
            f'                <img class="panel-img" src="{esc(panel["img"])}" alt="" decoding="async">',
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
    for row in rows:
        title_en, title_zh = lang_pair(row["title"])
        alt = ""
        if title_en != title_zh:
            alt = (
                '<span class="row-alt"><span data-l="en" lang="zh-Hans">'
                f'{esc(title_zh)}</span><span data-l="zh">{esc(title_en)}</span></span>'
            )
        float_attr = f' data-float="{esc(row["img"])}"' if row["img"] else ""
        bilingual = '<span class="row-bi">中文 / EN</span>' if row["bilingual"] else ""
        row_html.append(
            f'            <a class="row" data-topic="{row["topic"]}"{href_attrs(row["href"])}{float_attr}>'
            f'<span class="row-main"><span class="row-t">{bi(title_en, title_zh)}</span>{alt}</span>'
            f'<span class="row-meta">{bilingual}<span>{bi_value(row["kind"])}</span>'
            f'<span class="num">{esc(row["date"])}</span></span></a>'
        )

    updated_en, updated_zh = updated_label(config["site_updated"])
    main = "\n".join([
        '<main id="main" class="home enter" tabindex="-1">',
        '    <section class="sel" data-sel aria-labelledby="sel-title">',
        '        <div class="sel-head">',
        f'            <h1 class="sel-h1" id="sel-title">{bi("Selected work", "代表作品")}</h1>',
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
        '        <div class="rows" data-rows>',
        *row_html,
        "        </div>",
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
        n_en, n_zh = count_label(len(by_topic[topic["id"]]))
        titles.append("\n".join([
            f'                <div class="wheel-title{" is-on" if i == 0 else ""}" data-i="{i}"{"" if i == 0 else " aria-hidden=\"true\""}>',
            f'                    <span class="wheel-kicker">{bi("Type", "类别")} · {bi(n_en, n_zh)}</span>',
            f'                    <p class="wheel-name">{bi_value(topic["title"])}</p>',
            f'                    <span class="wheel-line">{bi_value(topic["line"])}</span>',
            "                </div>",
        ]))

    # Three laps of the topics make a ring big enough to read as a wheel.
    cards = []
    ring = len(topics) * 3
    for i in range(ring):
        topic = topics[i % len(topics)]
        works = by_topic[topic["id"]][:3]
        k = max(1, len(works))
        faces = "".join(
            f'<img src="{esc(work["img"])}" alt="" draggable="false" decoding="async" '
            f'style="top:{j * 100 / k:.4g}%;height:{100 / k:.4g}%">'
            for j, work in enumerate(works)
        )
        n_en, n_zh = count_label(len(works))
        title_en, title_zh = lang_pair(topic["title"])
        cards.append(
            f'            <button class="wheel-card" type="button" data-i="{i}" data-topic="{topic["id"]}" tabindex="-1"'
            f'{i18n_attrs(aria_label=(title_en, title_zh))}>'
            f'<span class="wheel-face">{faces}</span>'
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
        visuals = "".join(
            f'<img class="{"is-on" if j == 0 else ""}" data-w="{j}" src="{esc(work["img"])}" alt="" decoding="async" loading="lazy">'
            for j, work in enumerate(works)
        )
        open_titles = "".join(
            f'<span class="topic-open-title{" is-on" if j == 0 else ""}" data-w="{j}">'
            f'{bi_value(work.get("work_title") or work["title"])}</span>'
            for j, work in enumerate(works)
        )
        items = []
        for j, work in enumerate(works):
            items.append(
                f'                    <a class="work-item{" is-on" if j == 0 else ""}" data-w="{j}"{href_attrs(work["href"])}>'
                f'<span class="work-meta"><span>{j + 1:02d} · {bi_value(work.get("work_kind") or work["kind"])}</span>'
                f'<span>{esc(work["date"])}</span></span>'
                f'<span class="work-title">{bi_value(work.get("work_title") or work["title"])}</span>'
                f'<span class="work-desc"><span><span>{bi_value(work["desc"])}</span></span></span></a>'
            )
        related = ""
        if topic.get("related"):
            links = "".join(
                f'<a{href_attrs(item["href"])}><span class="related-t">{bi_value(item["label"])}</span>'
                f'<span class="related-k">{bi_value(item["kind"])} {esc(item["arrow"])}</span></a>'
                for item in topic["related"]
            )
            related = (
                '                    <div class="related">'
                f'<span class="related-label">{bi("Related elsewhere on the site", "站内相关")}</span>'
                f"{links}</div>"
            )
        first = works[0]
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
            '        <div class="topic-split">',
            '            <div class="topic-visual">',
            f'                <a data-topic-open{href_attrs(first["href"])}>{visuals}'
            f'<span class="topic-open">{bi("Open", "打开")} {open_titles} <span aria-hidden="true">↗</span></span></a>',
            "            </div>",
            '            <div class="works">',
            *items,
            *([related] if related else []),
            "            </div>",
            "        </div>",
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
            "Projects, talks, research and visual essays from simoncos.",
            "simoncos 的项目、演讲、研究与视觉随笔。",
        ),
        canonical="gallery.html",
    )
    return render_document(config, page, head=head, main=main)


# ---- Projects ---------------------------------------------------------------


def render_projects(config: dict[str, Any], site: dict[str, Any]) -> str:
    page = page_config(config, "projects.html")
    rows = []
    for i, project in enumerate(site["projects"]):
        rows.append(
            f'        <a class="prow"{href_attrs(project["href"])}>'
            f'<span class="prow-n">{i + 1:02d}</span>'
            '<span class="prow-main">'
            f'<span class="prow-title">{bi_value(project["title"])}</span>'
            f'<span class="prow-line">{bi_value(project["line"])}</span>'
            '<span class="prow-facts">'
            f'<span class="prow-status"><span class="live-dot" aria-hidden="true"></span>{bi_value(project["status"])}</span>'
            f'<span>{esc(project["years"])}</span><span>{esc(project["tags"])}</span></span></span>'
            f'<span class="prow-cover"><img src="{esc(project["cover"])}" alt="" decoding="async" loading="lazy"></span></a>'
        )
    main = "\n".join([
        '<main id="main" class="projects enter" tabindex="-1">',
        '    <section class="page-head">',
        f'        <h1 class="page-h1">{bi("Projects", "项目")}</h1>',
        f'        <p class="page-lead">{bi("Things that are maintained and running. Each opens as its own board. Finished pieces live in Work.", "在维护、在运行的东西。每个项目打开都是一块独立看板；定稿作品在「作品」里。")}</p>',
        "    </section>",
        '    <div class="plist">',
        *rows,
        "    </div>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=("Projects · Work · simoncos", "项目 · 作品 · simoncos"),
        description=(
            "Maintained public-facing projects from simoncos: tools, deployed systems, and data essays.",
            "simoncos 持续维护的公开项目：工具、已部署的系统与数据长文。",
        ),
        canonical="projects.html",
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
        stages.append(f'<button class="stage-btn{on}" type="button" data-stage="{i}" aria-pressed="{"true" if i == 0 else "false"}">{t(stage["label"])}</button>')
        if i < len(project["stages"]) - 1:
            stages.append('<span class="stage-arrow" aria-hidden="true"></span>')
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


# ---- About ------------------------------------------------------------------


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
        body = en if en == zh else f'<span data-l="en">{en}</span><span data-l="zh" lang="zh-Hans">{zh}</span>'
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
        f'        <p class="about-who">{bi_value(about["who"])}</p>',
        *paragraphs,
        "    </section>",
        '    <section class="contacts">',
        f'        <button class="copy-btn" type="button" data-copy="{esc(about["email"])}">'
        f'<span>{esc(about["email"])}</span><span class="copy-state">'
        f'<span class="copy-idle">{bi("Copy", "复制")}</span><span class="copy-done">{bi("Copied", "已复制")}</span></span></button>',
        f"        {contacts}",
        "    </section>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=("About · simoncos", "关于 · simoncos"),
        description=(
            "About simoncos, a full-stack builder working across AI and data in Hong Kong.",
            "关于 simoncos：在香港从事 AI 与数据工作的全栈构建者。",
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
        "projects.html": render_projects(config, site),
        "about.html": render_about(config, site),
        "404.html": render_not_found(config),
    }
    for lang in ("en", "zh"):
        project = next(item for item in site["projects"] if item["id"] == "sleep-toolkit")
        outputs[project["href"][lang]] = render_board(config, site, lang)
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
