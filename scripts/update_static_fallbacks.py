#!/usr/bin/env python3
"""Generate static fallback HTML for dynamic entry-page lists."""

from __future__ import annotations

import argparse
import html
import json
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]


def load_json(rel_path: str) -> dict:
    return json.loads((ROOT / rel_path).read_text(encoding="utf-8"))


def escape(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def localized(field: dict | None, language: str = "en") -> str:
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
        paths = item.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        primary_title = localized(item.get("title"), "en")
        secondary_title = localized(item.get("title"), "zh")
        posts.append(
            {
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


def render_home(article_index: dict, projects_payload: dict, gallery_payload: dict) -> str:
    posts = blog_posts(article_index) + project_posts(projects_payload) + gallery_posts(gallery_payload)
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
                f'<li><a href="tags.html#{quote(str(tag))}">{escape(tag)}</a></li>'
                for tag in group.get("tags", [])
            )
            tags_html = f'\n                    <ul class="tag-list blog-preview-tags">{tags}</ul>' if tags else ""
            articles.append(
                f'''                <article class="blog-preview">
                    <div class="blog-preview-header">
                        <div class="blog-preview-meta"><span class="meta-pill">{escape(language_availability(group.get("languages") or {}))}</span><span>{escape(format_day(group.get("date", "")))}</span></div>
                        <h4><a href="blogs/{escape(primary.get("file"))}">{escape(primary.get("title"))}</a></h4>{secondary_title}
                    </div>{tags_html}
                    <div class="blog-excerpt">{escape(excerpt(primary.get("excerpt", "")))}</div>
                    <a href="blogs/{escape(primary.get("file"))}" class="read-more">Read more</a>
                </article>'''
            )
        sections.append(
            f'''            <section class="archive-month">
                <div class="archive-month-header"><h3 class="archive-month-title">{escape(label)}</h3><p class="archive-month-note">{escape(note)}</p></div>
{chr(10).join(articles)}
            </section>'''
        )
    return "\n".join(sections)


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


def render_gallery_cards(gallery_payload: dict) -> str:
    cards = []
    for item in sorted(gallery_payload.get("items", []), key=lambda item: item.get("date") or "", reverse=True):
        paths = item.get("paths") or {}
        href = paths.get("en") or paths.get("zh") or "#"
        title = localized(item.get("title"), "en")
        skip_attr = ' data-skip-lang-rewrite="true"' if item.get("skipLangRewrite") else ""
        cards.append(
            f'''            <article class="project-card gallery-card">
                <a class="project-card-media" href="{escape(href)}"{skip_attr}>
                    <img src="{escape(item.get("cover"))}" alt="{escape(title)} cover" loading="lazy" decoding="async">
                </a>
                <div class="project-card-body">
                    <div class="project-card-meta"><span class="meta-pill meta-pill--gallery">{escape(type_label(item.get("type", "")))}</span><span>{escape(format_day(item.get("date", ""), short_month=True))}</span></div>
                    <h3><a href="{escape(href)}"{skip_attr}>{escape(title)}</a></h3>
                    <p class="project-card-subtitle">{escape(localized(item.get("subtitle"), "en"))}</p>
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
        },
        ROOT / "templates/blogs-listing-template.html": {
            "blog-archive": render_blog_archive(article_index),
        },
        ROOT / "projects.html": {
            "projects-gallery": render_project_cards(projects_payload),
        },
        ROOT / "gallery.html": {
            "gallery-grid": render_gallery_cards(gallery_payload),
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
