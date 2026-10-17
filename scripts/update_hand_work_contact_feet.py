#!/usr/bin/env python3
"""Insert or refresh piece-contact blocks on hand-authored work pages."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from piece_contact_foot import PIECE_CONTACT_END, PIECE_CONTACT_START, render_piece_contact_block

ROOT = Path(__file__).resolve().parents[1]

# rel_path, asset_prefix, lang (en / zh / None for bilingual shell-style)
HAND_WORK_PAGES: tuple[tuple[str, str, str | None], ...] = (
    ("gallery/research/sleep-2016-2026.html", "../../", "zh"),
    ("gallery/research/sleep-2016-2026.en.html", "../../", "en"),
    ("gallery/research/lola-matchups.html", "../../", None),
    ("gallery/research/lola-draft.html", "../../", None),
    ("gallery/sharing/designing-design/index.html", "../../../", "zh"),
    ("gallery/sharing/designing-design/index.en.html", "../../../", "en"),
    ("gallery/sharing/limits-of-problem-analysis/index.html", "../../../", "zh"),
    ("gallery/sharing/limits-of-problem-analysis/index.en.html", "../../../", "en"),
    ("gallery/sharing/problem-solving-and-design/index.html", "../../../", "zh"),
    ("gallery/sharing/problem-solving-and-design/index.en.html", "../../../", "en"),
    ("gallery/sharing/problem-solving-and-design/ch1.html", "../../../", "zh"),
    ("gallery/sharing/problem-solving-and-design/ch1.en.html", "../../../", "en"),
    ("gallery/sharing/problem-solving-and-design/ch2.html", "../../../", "zh"),
    ("gallery/sharing/problem-solving-and-design/ch2.en.html", "../../../", "en"),
    ("gallery/sharing/problem-solving-and-design/ch3.html", "../../../", "zh"),
    ("gallery/sharing/problem-solving-and-design/ch3.en.html", "../../../", "en"),
    ("gallery/sharing/problem-solving-and-design/ch4.html", "../../../", "zh"),
    ("gallery/sharing/problem-solving-and-design/ch4.en.html", "../../../", "en"),
)

SITE_BACK = re.compile(r"\s*<p class=\"site-back\"[^>]*>.*?</p>\s*", re.S)
MARKED = re.compile(
    rf"<!-- {re.escape(PIECE_CONTACT_START)} -->.*?<!-- {re.escape(PIECE_CONTACT_END)} -->\n?",
    re.S,
)


def block_for(rel_path: str, asset_prefix: str, lang: str | None) -> str:
    return render_piece_contact_block(asset_prefix, lang, inline_css=True) + "\n"


def migrate(text: str, block: str, rel_path: str) -> str:
    if MARKED.search(text):
        return MARKED.sub(block, text, count=1)

    text = SITE_BACK.sub("\n", text)

    if rel_path.startswith("gallery/sharing/problem-solving-and-design/ch"):
        anchor = "</footer>\n</div>"
        if anchor not in text:
            raise ValueError(f"{rel_path}: expected chapter layout anchor")
        return text.replace(anchor, f"</footer>\n{block}</div>", 1)

    if "</footer>" in text:
        # Last page footer (sleep essay, lola, interactive essay indices).
        parts = text.rsplit("</footer>", 1)
        return parts[0] + block + "</footer>" + parts[1]

    raise ValueError(f"{rel_path}: could not locate footer to attach piece-contact block")


def update_page(rel_path: str, asset_prefix: str, lang: str | None) -> str | None:
    path = ROOT / rel_path
    if not path.exists():
        raise FileNotFoundError(rel_path)
    block = block_for(rel_path, asset_prefix, lang)
    output = migrate(path.read_text(encoding="utf-8"), block, rel_path)
    if output == path.read_text(encoding="utf-8"):
        return None
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if any page is out of date.")
    args = parser.parse_args()

    stale: list[str] = []
    updated: list[str] = []
    for rel_path, asset_prefix, lang in HAND_WORK_PAGES:
        path = ROOT / rel_path
        block = block_for(rel_path, asset_prefix, lang)
        current = path.read_text(encoding="utf-8")
        expected = migrate(current, block, rel_path)
        if current != expected:
            stale.append(rel_path)
            if not args.check:
                path.write_text(expected, encoding="utf-8")
                updated.append(rel_path)

    if args.check:
        if stale:
            print("Hand-authored work piece-contact blocks are out of date:")
            for rel in stale:
                print(f"- {rel}")
            print("Run: python3 scripts/update_hand_work_contact_feet.py")
            return 1
        print("Hand-authored work piece-contact blocks are current.")
        return 0

    if updated:
        print("Updated hand-authored work piece-contact blocks:")
        for rel in updated:
            print(f"- {rel}")
    else:
        print("Hand-authored work piece-contact blocks are current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
