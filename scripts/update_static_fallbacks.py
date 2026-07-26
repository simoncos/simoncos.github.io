#!/usr/bin/env python3
"""Generate static fallback HTML for dynamic entry-page lists."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]


def load_json(rel_path: str) -> dict:
    return json.loads((ROOT / rel_path).read_text(encoding="utf-8"))


def escape(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def localized(field: dict | str | None, language: str = "en") -> str:
    if isinstance(field, str):
        return field
    if not isinstance(field, dict):
        return ""
    return field.get(language) or field.get("en") or field.get("zh") or ""


def format_day(date_value: str, *, short_month: bool = False) -> str:
    try:
        parsed = datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        return date_value
    month = parsed.strftime("%b" if short_month else "%B")
    return f"{month} {parsed.day}, {parsed.year}"


def format_day_parts(date_value: str) -> tuple[str, str]:
    try:
        parsed = datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        return date_value, ""
    return f"{parsed.strftime('%b')} {parsed.day}", str(parsed.year)


def month_label(date_value: str) -> str:
    try:
        parsed = datetime.strptime(date_value, "%Y-%m-%d")
    except ValueError:
        return date_value or "Undated"
    return parsed.strftime("%B %Y")


def type_label(item_type: str) -> str:
    labels = {
        "blog": "Blog",
        "project": "Project",
        "talk": "Talk",
        "visual_essay": "Visual essay",
        "demo": "Demo",
        "artifact": "Artifact",
        "tool": "Tool",
        "field_note": "Field note",
    }
    return labels.get(item_type, item_type.replace("_", " ").title() if item_type else "Item")


def preferred_entry(group: dict, language: str = "en") -> dict | None:
    languages = group.get("languages") or {}
    return languages.get(language) or languages.get("en") or languages.get("zh") or next(iter(languages.values()), None)


def secondary_entry(group: dict, language: str = "en") -> dict | None:
    languages = group.get("languages") or {}
    alternate = "zh" if language == "en" else "en"
    primary = preferred_entry(group, language)
    return languages.get(alternate) or next(
        (entry for entry in languages.values() if entry.get("file") != (primary or {}).get("file")),
        None,
    )


def language_availability(languages: dict) -> str:
    labels = []
    if languages.get("zh"):
        labels.append("中文")
    if languages.get("en"):
        labels.append("EN")
    return " / ".join(labels)


def blog_posts(article_index: dict) -> list[dict]:
    posts = []
    for group in article_index.get("groups", []):
        primary = preferred_entry(group, "en")
        if not primary or not primary.get("file"):
            continue
        secondary = secondary_entry(group, "en")
        posts.append(
            {
                "type": "blog",
                "date": group.get("date", ""),
                "primary_title": primary.get("title", ""),
                "secondary_title": secondary.get("title", "") if secondary else "",
                "href": f"blogs/{primary.get('file', '')}",
                "lang_avail": language_availability(group.get("languages") or {}),
                "tags": group.get("tags") or [],
                "excerpt": primary.get("excerpt", ""),
            }
        )
    return posts


def project_posts(projects_payload: dict) -> list[dict]:
    posts = []
    for project in projects_payload.get("projects", []):
        paths = project.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        primary_title = localized(project.get("title"), "en")
        secondary_title = localized(project.get("title"), "zh")
        posts.append(
            {
                "id": project.get("id", ""),
                "type": "project",
                "date": project.get("date", ""),
                "primary_title": primary_title,
                "secondary_title": secondary_title if secondary_title != primary_title else "",
                "href": href,
                "lang_avail": language_availability(paths),
                "cover": project.get("cover", ""),
                "subtitle": localized(project.get("subtitle"), "en"),
                "summary": localized(project.get("summary"), "en"),
                "project_type": project.get("type", ""),
            }
        )
    return posts


def gallery_posts(gallery_payload: dict) -> list[dict]:
    posts = []
    for item in gallery_payload.get("items", []):
        if "home" not in (item.get("surfaceMembership") or []):
            continue
        paths = item.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        primary_title = localized(item.get("title"), "en")
        secondary_title = localized(item.get("title"), "zh")
        posts.append(
            {
                "id": item.get("id", ""),
                "type": item.get("type") or "gallery",
                "date": item.get("date", ""),
                "primary_title": primary_title,
                "secondary_title": secondary_title if secondary_title != primary_title else "",
                "href": href,
                "lang_avail": "" if item.get("skipLangRewrite") else language_availability(paths),
                "cover": item.get("cover", ""),
                "subtitle": localized(item.get("subtitle"), "en"),
                "summary": localized(item.get("summary"), "en"),
                "skip_lang_rewrite": item.get("skipLangRewrite") is True,
            }
        )
    return posts


def canonical_home_target(value: str) -> str:
    parsed = urlsplit(urljoin("https://simoncos.github.io/", value or ""))
    normalized_path = parsed.path.rstrip("/") or "/"
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), normalized_path, parsed.query, ""))


def deduplicate_home_posts(posts: list[dict]) -> list[dict]:
    unique_posts = []
    seen_ids = set()
    seen_targets = set()
    for post in posts:
        identity = post.get("id") or ""
        target = canonical_home_target(post.get("href") or "")
        if (identity and identity in seen_ids) or (target and target in seen_targets):
            continue
        if identity:
            seen_ids.add(identity)
        if target:
            seen_targets.add(target)
        unique_posts.append(post)
    return unique_posts


def render_home(article_index: dict, projects_payload: dict, gallery_payload: dict) -> str:
    surface_posts = deduplicate_home_posts(project_posts(projects_payload) + gallery_posts(gallery_payload))
    posts = blog_posts(article_index) + surface_posts
    posts.sort(key=lambda item: item.get("date") or "", reverse=True)
    items = []
    for post in posts[:8]:
        skip_attr = ' data-skip-lang-rewrite="true"' if post.get("skip_lang_rewrite") else ""
        secondary = (
            f'\n                            <span class="recent-post-secondary">{escape(post.get("secondary_title"))}</span>'
            if post.get("secondary_title")
            else ""
        )
        lang = (
            f'\n                            <span class="meta-pill">{escape(post.get("lang_avail"))}</span>'
            if post.get("lang_avail")
            else ""
        )
        items.append(
            f'''                <li class="recent-post-card">
                    <a class="recent-post-link" href="{escape(post.get("href"))}"{skip_attr}>
                        <span class="recent-post-main">
                            <span class="recent-post-meta"><span class="meta-pill meta-pill--{escape(post.get("type"))}">{escape(type_label(post.get("type", "")))}</span>{lang}<span>{escape(format_day(post.get("date", ""), short_month=True))}</span></span>
                            <span class="recent-post-title">{escape(post.get("primary_title"))}</span>{secondary}
                        </span>
                    </a>
                </li>'''
        )
    return "\n".join(items)


def excerpt(text: str, limit: int = 240) -> str:
    compact = " ".join(str(text or "").split())
    if len(compact) <= limit:
        return compact
    return compact[:limit].rstrip() + "..."


def render_blog_archive(article_index: dict) -> str:
    groups_by_month: OrderedDict[str, list[dict]] = OrderedDict()
    for group in sorted(article_index.get("groups", []), key=lambda item: item.get("date") or "", reverse=True):
        groups_by_month.setdefault(month_label(group.get("date", "")), []).append(group)

    sections = []
    for label, groups in groups_by_month.items():
        note = "1 post" if len(groups) == 1 else f"{len(groups)} posts"
        articles = []
        for group in groups:
            primary = preferred_entry(group, "en")
            if not primary:
                continue
            secondary = secondary_entry(group, "en")
            secondary_title = (
                f'\n                        <span class="group-secondary-title">{escape(secondary.get("title"))}</span>'
                if secondary and secondary.get("title") != primary.get("title")
                else ""
            )
            tags = "".join(
                f'<li><a href="#topic-{quote(str(tag))}">{escape(tag)}</a></li>'
                for tag in group.get("tags", [])
            )
            tags_html = f'\n                    <ul class="tag-list blog-preview-tags">{tags}</ul>' if tags else ""
            date_month_day, date_year = format_day_parts(group.get("date", ""))
            articles.append(
                f'''                <article class="blog-preview">
                    <time class="blog-preview-date" datetime="{escape(group.get("date", ""))}"><span>{escape(date_month_day)}</span><span>{escape(date_year)}</span></time>
                    <span class="blog-preview-lang">EN</span>
                    <div class="blog-preview-header">
                        <div class="blog-preview-meta"><span class="meta-pill">{escape(language_availability(group.get("languages") or {}))}</span><span>{escape(format_day(group.get("date", "")))}</span></div>
                        <h4><a href="blogs/{escape(primary.get("file"))}">{escape(primary.get("title"))}</a></h4>{secondary_title}
                    </div>{tags_html}
                    <div class="blog-excerpt">{escape(excerpt(primary.get("excerpt", "")))}</div>
                    <a href="blogs/{escape(primary.get("file"))}" class="read-more">Read →</a>
                </article>'''
            )
        sections.append(
            f'''            <section class="archive-month">
                <div class="archive-month-header"><h3 class="archive-month-title">{escape(label)}</h3><p class="archive-month-note">{escape(note)}</p></div>
{chr(10).join(articles)}
            </section>'''
        )
    return "\n".join(sections)


def series_part_value(group: dict) -> tuple[int, str]:
    series = group.get("series") or {}
    try:
        part = int(str(series.get("part", "")).strip())
    except (TypeError, ValueError):
        part = sys.maxsize
    return part, str(group.get("id") or "")


def valid_local_article_filename(value: object) -> bool:
    return (
        isinstance(value, str)
        and re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]*\.html", value) is not None
        and ".." not in value
    )


def complete_article_entry(entry: object) -> bool:
    return (
        isinstance(entry, dict)
        and isinstance(entry.get("title"), str)
        and bool(entry["title"].strip())
        and valid_local_article_filename(entry.get("file"))
    )


def series_group_key(group: dict, series_name: str) -> str:
    series = group.get("series") or {}
    return str(group.get("id") or f'{series_name}:{series.get("part", "")}')


def render_series_index(article_index: dict) -> str:
    series_groups: dict[str, list[dict]] = {}
    for group in article_index.get("groups", []):
        series = group.get("series") or {}
        series_name = series.get("name")
        if not isinstance(series_name, str) or not series_name.strip():
            continue
        primary = preferred_entry(group, "en")
        if not complete_article_entry(primary):
            return ""
        series_groups.setdefault(series_name, []).append(group)

    rows = []
    for series_name in sorted(series_groups):
        parts = []
        groups = sorted(series_groups[series_name], key=series_part_value)
        for group in groups:
            primary = preferred_entry(group, "en")
            secondary = secondary_entry(group, "en")
            primary_title = primary["title"].strip()
            secondary_value = secondary.get("title") if isinstance(secondary, dict) else ""
            secondary_value = secondary_value.strip() if isinstance(secondary_value, str) else ""
            secondary_title = (
                f'\n                                <span class="group-secondary-title">{escape(secondary_value)}</span>'
                if secondary_value and secondary_value != primary_title
                else ""
            )
            part = (group.get("series") or {}).get("part")
            part_label = f'<span class="series-post-part">Part {escape(part)}</span>' if part else ""
            group_key = series_group_key(group, series_name)
            href = f'blogs/{primary["file"]}'
            parts.append(
                f'''                        <li class="series-part-row">{part_label}
                            <span class="series-post-entry"><a data-series-group="{escape(group_key)}" href="{escape(href)}">{escape(primary_title)}</a>{secondary_title}
                            </span>
                        </li>'''
            )
        count = len(groups)
        count_label = "1 part" if count == 1 else f"{count} parts"
        rows.append(
            f'''                <li class="series-ledger-row">
                    <div class="series-ledger-body">
                        <h4>{escape(series_name)}</h4>
                        <p class="series-part-count">{count_label}</p>
                        <ol class="series-part-list">
{chr(10).join(parts)}
                        </ol>
                    </div>
                </li>'''
        )
    return "\n".join(rows)


def render_topic_index(article_index: dict) -> str:
    topic_counts: dict[str, int] = {}
    for group in article_index.get("groups", []):
        for tag in group.get("tags") or []:
            topic = str(tag)
            topic_counts[topic] = topic_counts.get(topic, 0) + 1

    def display_topic(topic: str) -> str:
        return topic.upper() if topic.lower() in {"ai", "km"} else topic[:1].upper() + topic[1:]

    rows = [
        f'                <li><a href="#topic-{quote(topic)}"><span>{escape(display_topic(topic))}</span><span>{count}</span></a></li>'
        for topic, count in sorted(topic_counts.items())
    ]
    all_count = len(topic_counts) + 1
    rows.append(
        f'                <li><a href="#topics"><span data-i18n="essays_all_topics">All topics</span><span>{all_count}</span></a></li>'
    )
    return "\n".join(rows)


def render_project_cards(projects_payload: dict) -> str:
    cards = []
    for project in sorted(projects_payload.get("projects", []), key=lambda item: item.get("date") or "", reverse=True):
        paths = project.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        title = localized(project.get("title"), "en")
        modifier = "featured" if not cards else "compact"
        cards.append(
            f'''            <article class="project-card project-card--{modifier}">
                <a class="project-card-media project-card-media--{modifier}" href="{escape(href)}">
                    <img src="{escape(project.get("cover"))}" alt="{escape(title)} cover" loading="lazy" decoding="async">
                </a>
                <div class="project-card-body project-card-body--{modifier}">
                    <div class="project-card-meta"><span class="meta-pill meta-pill--project">{escape(type_label(project.get("type", "")))}</span><span>{escape(format_day(project.get("date", "")))}</span></div>
                    <h3><a href="{escape(href)}">{escape(title)}</a></h3>
                    <p class="project-card-subtitle">{escape(localized(project.get("subtitle"), "en"))}</p>
                    <p class="project-card-summary">{escape(localized(project.get("summary"), "en"))}</p>
                    <a class="read-more" href="{escape(href)}">Open project</a>
                </div>
            </article>'''
        )
    return "\n".join(cards)


def project_action(project: dict, action_id: str) -> dict | None:
    return next(
        (action for action in project.get("actions", []) if action.get("id") == action_id),
        None,
    )


def render_projects_content(projects_payload: dict) -> str:
    projects = sorted(
        projects_payload.get("projects", []),
        key=lambda item: item.get("date") or "",
        reverse=True,
    )
    if not projects:
        return '<p class="projects-empty">No projects yet.</p>'

    cards = []
    for index, project in enumerate(projects, start=1):
        paths = project.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        project_type = "Tool" if project.get("type") == "tool" else type_label(project.get("type", ""))
        cards.append(
            f'''            <article class="project-index-entry" data-project-id="{escape(project.get("id"))}">
                <a class="project-index-card" href="{escape(href)}">
                    <span class="project-index-number">{index:02d}</span>
                    <span class="project-index-media"><img src="{escape(project.get("cover"))}" alt="" loading="lazy" decoding="async"></span>
                    <span class="project-index-copy">
                        <span class="project-index-meta"><span>{escape(project_type)}</span><span><span class="status-dot" aria-hidden="true"></span>{escape(localized(project.get("status"), "en"))}</span><time datetime="{escape(project.get("date"))}">{escape(str(project.get("date") or "")[:4])}</time></span>
                        <strong class="project-index-title">{escape(localized(project.get("title"), "en"))}</strong>
                        <span class="project-index-subtitle">{escape(localized(project.get("subtitle"), "en"))}</span>
                        <span class="project-index-summary">{escape(localized(project.get("summary"), "en"))}</span>
                        <span class="project-index-cta">View project<span aria-hidden="true">→</span></span>
                    </span>
                </a>
            </article>'''
        )

    return f'''        <div id="projects-index" class="projects-index-list">
{chr(10).join(cards)}
        </div>'''


def render_project_detail(projects_payload: dict, project_id: str, language: str) -> str:
    project = next(
        (item for item in projects_payload.get("projects", []) if item.get("id") == project_id),
        None,
    )
    if not project:
        return '<p class="projects-empty">Project not found.</p>'

    labels = {
        "en": {
            "all_projects": "All projects",
            "choose_path": "Choose a path",
            "details": "Project details",
            "signals": "signals",
        },
        "zh": {
            "all_projects": "全部项目",
            "choose_path": "选择入口",
            "details": "项目详情",
            "signals": "信号",
        },
    }[language]
    detail = project.get("featuredDetail") or {}
    media = detail.get("media") or {}
    metrics = "\n".join(
        f'''                        <div>
                            <dt>{escape(localized(metric.get("label"), language))}</dt>
                            <dd>{escape(localized(metric.get("value"), language))}</dd>
                        </div>'''
        for metric in detail.get("metrics", [])
    )
    facts = []
    for fact in project.get("facts", []):
        meta = localized(fact.get("meta"), language)
        facts.append(
            f'''                    <div>
                        <dt>{escape(localized(fact.get("label"), language))}</dt>
                        <dd>{escape(localized(fact.get("value"), language))}</dd>
                        {f'<dd class="ledger-row-meta">{escape(meta)}</dd>' if meta else ''}
                    </div>'''
        )

    action_cards = []
    for surface in project.get("surfaces", []):
        action = project_action(project, surface.get("actionId", ""))
        if not action:
            continue
        paths = action.get("paths") or {}
        href = paths.get(language) or paths.get("en") or paths.get("zh") or "#"
        modifier = "primary" if surface.get("actionId") == "open" else "secondary"
        arrow = "↗" if surface.get("actionId") == "open" else "→"
        action_cards.append(
            f'''                        <a class="project-action-card project-action-card--{modifier}" href="{escape(href)}">
                            <span class="project-action-card-kind">{escape(surface.get("label"))}</span>
                            <strong>{escape(localized(surface.get("title"), language))}</strong>
                            <span class="project-action-card-summary">{escape(localized(surface.get("summary"), language))}</span>
                            <span class="project-action-card-cta">{escape(localized(action.get("label"), language))}<span aria-hidden="true">{arrow}</span></span>
                        </a>'''
        )

    metrics_html = (
        f'''                <dl class="project-report-metrics" aria-label="{escape(localized(project.get("title"), language))} {escape(labels["signals"])}">
{metrics}
                </dl>'''
        if metrics else ""
    )
    media_src = "/" + str(media.get("src") or "").lstrip("/")
    media_html = (
        f'''            <figure class="project-report-card project-report-ledger">
                <figcaption>
                    <span>{escape(localized(media.get("kicker"), language))}</span>
                    <strong>{escape(localized(media.get("title"), language))}</strong>
                </figcaption>
                <img src="{escape(media_src)}" alt="{escape(localized(media.get("alt"), language))}" loading="lazy" decoding="async">
{metrics_html}
            </figure>'''
        if media.get("src") else ""
    )

    return f'''        <div id="project-detail" data-project-id="{escape(project.get("id"))}">
            <nav class="project-detail-breadcrumb" aria-label="{escape(labels["all_projects"])}">
                <a href="/projects.html">← {escape(labels["all_projects"])}</a>
                <span aria-hidden="true">/</span>
                <span>{escape(localized(project.get("title"), language))}</span>
                <span class="project-detail-status"><span class="status-dot" aria-hidden="true"></span>{escape(localized(project.get("status"), language))}</span>
            </nav>
            <section class="project-ledger-hero" aria-labelledby="project-feature-title">
                <div class="project-feature-number" aria-hidden="true">01</div>
                <div class="project-feature-copy">
                    <p class="section-kicker">{escape(localized(detail.get("kicker"), language))}</p>
                    <h1 id="project-feature-title">{escape(localized(project.get("title"), language))}</h1>
                    <p class="project-feature-subtitle">{escape(localized(project.get("subtitle"), language))}</p>
                    <p>{escape(localized(detail.get("body"), language))}</p>
                    <section class="project-actions-panel" id="project-actions" aria-labelledby="project-actions-title">
                        <h3 id="project-actions-title">{escape(labels["choose_path"])}</h3>
                        <div class="project-feature-actions">
{chr(10).join(action_cards)}
                        </div>
                    </section>
                </div>
{media_html}
            </section>
            <section class="project-ledger-facts" aria-label="{escape(labels["details"])}">
                <dl>
{chr(10).join(facts)}
                </dl>
            </section>
        </div>'''


def render_gallery_cards(gallery_payload: dict) -> str:
    cards = []
    gallery_items = sorted(
        gallery_payload.get("items", []),
        key=lambda item: (item.get("galleryOrder", float("inf")), item.get("date") or ""),
    )
    for item in gallery_items:
        paths = item.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        title = localized(item.get("title"), "en")
        subtitle = localized(item.get("subtitle"), "en")
        subtitle_html = f'\n                    <p class="project-card-subtitle">{escape(subtitle)}</p>' if subtitle else ""
        skip_attr = ' data-skip-lang-rewrite="true"' if item.get("skipLangRewrite") else ""
        card_class = f' {escape(item.get("galleryCardClass", ""))}'.rstrip()
        anchor_id = item.get("sectionId") or ""
        id_attr = f' id="{escape(anchor_id)}"' if anchor_id else ""
        cards.append(
            f'''            <article{id_attr} class="project-card gallery-card{card_class}">
                <a class="project-card-media" href="{escape(href)}"{skip_attr}>
                    <img src="{escape(item.get("cover"))}" alt="{escape(localized(item.get("alt"), "en"))}" loading="lazy" decoding="async">
                </a>
                <div class="project-card-body">
                    <div class="project-card-meta"><span class="meta-pill meta-pill--gallery">{escape(type_label(item.get("type", "")))}</span><span>{escape(format_day(item.get("date", ""), short_month=True))}</span></div>
                    <h3><a href="{escape(href)}"{skip_attr}>{escape(title)}</a></h3>{subtitle_html}
                    <p class="project-card-summary">{escape(localized(item.get("summary"), "en"))}</p>
                    <a class="read-more" href="{escape(href)}"{skip_attr}>Open item</a>
                </div>
            </article>'''
        )
    return "\n".join(cards)


def replace_block(text: str, key: str, replacement: str) -> str:
    start = f"<!-- static-fallback:start {key} -->"
    end = f"<!-- static-fallback:end {key} -->"
    if start not in text or end not in text:
        raise ValueError(f"missing static fallback markers for {key}")
    before, rest = text.split(start, 1)
    _old, after = rest.split(end, 1)
    return f"{before}{start}\n{replacement}\n            {end}{after}"


def update_file(path: Path, replacements: dict[str, str], *, check: bool) -> bool:
    text = path.read_text(encoding="utf-8")
    updated = text
    for key, replacement in replacements.items():
        updated = replace_block(updated, key, replacement)

    if updated == text:
        return False

    if check:
        return True

    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if generated fallbacks are out of date.")
    args = parser.parse_args()

    article_index = load_json("data/article_index.json")
    projects_payload = load_json("data/projects_data.json")
    gallery_payload = load_json("data/gallery_data.json")

    file_specs = {
        ROOT / "index.html": {
            "home-recent": render_home(article_index, projects_payload, gallery_payload),
        },
        ROOT / "blogs.html": {
            "blog-archive": render_blog_archive(article_index),
            "series-index": render_series_index(article_index),
            "topic-index": render_topic_index(article_index),
        },
        ROOT / "templates/blogs-listing-template.html": {
            "blog-archive": render_blog_archive(article_index),
            "series-index": render_series_index(article_index),
            "topic-index": render_topic_index(article_index),
        },
        ROOT / "gallery.html": {
            "gallery-grid": render_gallery_cards(gallery_payload),
        },
        ROOT / "projects.html": {
            "projects-content": render_projects_content(projects_payload),
        },
        ROOT / "projects/sleep-toolkit.en.html": {
            "project-detail-content": render_project_detail(projects_payload, "sleep-toolkit", "en"),
        },
        ROOT / "projects/sleep-toolkit.html": {
            "project-detail-content": render_project_detail(projects_payload, "sleep-toolkit", "zh"),
        },
    }

    changed = []
    for path, replacements in file_specs.items():
        try:
            if update_file(path, replacements, check=args.check):
                changed.append(path.relative_to(ROOT))
        except ValueError as error:
            print(f"{path.relative_to(ROOT)}: {error}")
            return 1

    if args.check and changed:
        print("Static fallback HTML is out of date:")
        for path in changed:
            print(f"- {path}")
        print("Run: python3 scripts/update_static_fallbacks.py")
        return 1

    if changed:
        print("Updated static fallback HTML:")
        for path in changed:
            print(f"- {path}")
    else:
        print("Static fallback HTML is current.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
