"""Work index and type wheel."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import bi, bi_value, esc, i18n_attrs, lang_pair, page_config, render_document, render_meta


from page_common import count_label, href_attrs, work_title


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
                f'                <{tag} class="wcard{"" if done else " is-wip"}" data-work="{esc(work["id"])}"{attrs}>'
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
            "Apps, research, talks and explainers, games and music from simoncos.",
            "simoncos 的应用、研究、分享、游戏与音乐。",
        ),
        canonical="gallery.html",
    )
    return render_document(config, page, head=head, main=main)
