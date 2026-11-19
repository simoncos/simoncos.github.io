"""Shared page helpers and language labels."""

from __future__ import annotations

import sys
import json
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import i18n_attrs, lang_pair


ARTICLE_KIND = {"en": "Article", "zh": "文章"}


# Number of newest items shown before the home list expands.
NEWEST_SHOWN = 10


TOPICS = (
    ("all", "All", "全部"),
    ("build", "Made", "创造"),
    ("body", "Lived", "体验"),
    # The catch-all bucket, last. Labelled 其他 / Other so it does not collide
    # with the Articles page's narrower 思考 / Thinking tag; the key stays "think".
    ("think", "Other", "其他"),
)


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


def work_place(work: dict[str, Any]) -> str:
    """Where the home page sends a work: its card on the Work page, opened on
    its type and highlighted, so a reader sees what it is before leaving the
    site for it. Articles still go straight to the article."""
    return f"gallery.html#{work['work_topic']}/{work['id']}"


def count_label(n: int) -> tuple[str, str]:
    return (f"{n} item" if n == 1 else f"{n} items", f"{n} 件")


BOARD_TEXT = {
    "en": {
        "back": "Work",
        "board": "Board",
        "present": "Present",
        "modes": "View",
        "updated": "updated",
        "pipeline": "How the local tool works",
        "privacy": "How the former web app handled files",
        "cli": "The local CLI keeps your files on your own computer.",
        "entries": "Entry points",
        "log": "Changelog",
        "log_note": "From the project’s commit history",
        "records": "records, 2016–2026",
        "dots_note": "Each cell represents one record. Rows illustrate the total count.",
        "prev": "Previous",
        "next": "Next",
        "preview": "Preview the report",
    },
    "zh": {
        "back": "作品",
        "board": "看板",
        "present": "演示",
        "modes": "视图",
        "updated": "更新于",
        "pipeline": "本地处理流程",
        "privacy": "旧版网页应用的文件处理流程",
        "cli": "使用本地命令行工具时，文件会留在自己的电脑上。",
        "entries": "入口",
        "log": "更新记录",
        "log_note": "来自项目的提交记录",
        "records": "条记录，2016–2026",
        "dots_note": "每格代表一条记录，按总数示意排列。",
        "prev": "上一块",
        "next": "下一块",
        "preview": "预览报告",
    },
}


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))
