"""Sleep Toolkit board and presentation views."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import esc, page_config, render_document, render_meta


from page_common import BOARD_TEXT, pick


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
