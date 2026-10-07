"""Maintained apps index."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import bi, bi_value, esc, lang_pair, page_config, render_document, render_meta


from page_common import href_attrs


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
