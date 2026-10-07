"""Home listings and selected-work panels."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import bi, bi_value, esc, i18n_attrs, lang_pair, page_config, render_document, render_meta, updated_label


from page_common import ARTICLE_KIND, NEWEST_SHOWN, TOPICS, href_attrs, work_place, work_title


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
                "href": work_place(work),
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
            "href": work_place(work),
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
