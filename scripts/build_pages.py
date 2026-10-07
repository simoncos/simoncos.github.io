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
import sys
from pathlib import Path

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


# Re-export the former entrypoint API; CLI orchestration stays here.
from page_about import (
    native_name,
    render_about,
    render_not_found,
)
from page_apps import (
    render_apps,
)
from page_board import (
    render_board,
)
from page_common import (
    load_json,
    ARTICLE_KIND,
    BOARD_TEXT,
    NEWEST_SHOWN,
    TOPICS,
    count_label,
    href_attrs,
    pick,
    work_place,
    work_title,
)
from page_home import (
    article_entries,
    article_topic,
    home_panels,
    home_rows,
    render_home,
)
from page_music import (
    clock,
    render_song,
    wave_path,
)
from page_work import (
    render_work,
)


SITE_DATA_PATH = ROOT / "data/site.json"


ARTICLE_INDEX_PATH = ROOT / "data/article_index.json"


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
