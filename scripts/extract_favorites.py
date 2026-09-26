#!/usr/bin/env python3
"""Extract the Favorites (收藏) column data from the Obsidian vault.

Reads Che's Douban export and the Reading wiki, keeps every five-star book,
film, album and game, groups them into works, and writes data/favorites.json.
The pages are rendered from that file by scripts/update_favorites_pages.py.

The vault is local only, so this script is not part of `make check`. Run it by
hand after a new Douban export:

    python3 scripts/extract_favorites.py --vault /path/to/vault

Rules come from the column proposal in the vault; see the favorites-column
skill for where it lives. Reviews are copied verbatim.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "data/favorites.json"

DOUBAN_EXPORT = "Knowledge/Douban-Wiki/_dashboard/data/douban_latest.json"
READING_WIKI = "RedPiggy/Projects/Reading/wiki/books"
EXPORT_DATE = "2026-05-30"

CATEGORIES = [
    {"id": "books", "type": "book", "name": "书", "unit": "本"},
    {"id": "film", "type": "movie", "name": "影", "unit": "部"},
    {"id": "music", "type": "music", "name": "音", "unit": "张"},
    {"id": "games", "type": "game", "name": "游", "unit": "款"},
]

CJK = "㐀-鿿豈-﫿"
CJK_RE = re.compile(f"[{CJK}]")
KANA_HANGUL_RE = re.compile(r"[\u3040-\u30ff\u31f0-\u31ff\u1100-\u11ff\uac00-\ud7af]")
SEASON_RE = re.compile(r"^(.+?)\s+((?:第[一二三四五六七八九十\d]+季|最终季|Season\s*\d+).*)$")
# The plain title is the 1995 film, not season one of Stand Alone Complex.
NO_MERGE = {"攻壳机动队"}
CN_NUM = {c: i + 1 for i, c in enumerate("一二三四五六七八九十")}

# Douban's artist field, cleaned (proposal, 音的艺人栏清理, 2026-09-25): one
# spelling per artist, Chinese artists in simplified Chinese, Japanese artists
# in Japanese, role words dropped, several artists split by " / ".
ARTIST_FIX = {
    "樹海 樹海 feat.タイナカサチ タイナカサチ": "樹海 feat. タイナカサチ",
    "Claudio Abbado Berliner Philharmoniker": "Claudio Abbado / Berliner Philharmoniker",
    "千住明 Original Soundtrack": "千住明",
    "Angeleo Badalamenti": "Angelo Badalamenti",
    "安杰洛·巴达拉曼蒂 Angelo Badalamenti": "Angelo Badalamenti",
    "飞儿乐团 F.I.R.": "飞儿乐团",
    "Roy Hargrove The RH Factor": "Roy Hargrove & The RH Factor",
    "林憶蓮": "林忆莲",
    "Original Soundtrack Matt Uelmen": "Matt Uelmen",
    "澤野弘之 Hiroyuki Sawano": "澤野弘之",
    "方大同 Khalil Fong": "方大同",
    "黄霑 James J.S.Wong 雷颂德 Mark": "黄霑 / 雷颂德",
    "窦唯 译": "窦唯",
    "Levin, Minnemann, Rudess": "Levin / Minnemann / Rudess",
    "ゲーム・ミュージック 菅原紗由理 Mina Frances Maya Matsue Hamauzu": "浜渦正志",
    "Ichiko Hashimoto (composer)": "橋本一子",
    "Kimiko Itoh": "伊藤君子",
    "Various Artists": "群星",
    "Toe": "toe",
}

# Book author fields that the general rule below gets wrong.
AUTHOR_FIX = {
    # 特德·蒋 and 姜峯楠 are two Chinese names for Ted Chiang.
    "[美] 特德·蒋 [美] 姜峯楠": "特德·蒋",
}

NATIONALITY_RE = re.compile(rf"[\[【（(]\s*[{CJK}]{{1,5}}\s*[\]】）)]")
PAREN_RE = re.compile(r"\s*[（(][^）)]*[）)]")


def cjk_names(text: str) -> str:
    """Directors: CJK names are space-separated in Douban's field; list at most two."""
    tokens = text.split()
    if not CJK_RE.search(text):
        return text.strip()
    if len(tokens) > 2:
        return f"{tokens[0]} 等"
    return " / ".join(tokens)


def book_authors(raw: str) -> str:
    """One name per author, without nationality markers or bracketed original names."""
    raw = raw.strip()
    if raw in AUTHOR_FIX:
        return AUTHOR_FIX[raw]
    marked = NATIONALITY_RE.search(raw) is not None
    chunks = NATIONALITY_RE.sub("\0", raw).split("\0")
    authors: list[str] = []
    for chunk in chunks:
        chunk = PAREN_RE.sub("", chunk).strip()
        if not chunk:
            continue
        tokens = chunk.split()
        cjk_tokens = [token for token in tokens if CJK_RE.search(token)]
        if marked:
            # A marker starts each author; anything after the first CJK token is an alias.
            names = [cjk_tokens[0]] if cjk_tokens else [chunk]
        else:
            # No markers: CJK tokens are separate authors, Latin tokens beside them are aliases.
            names = cjk_tokens or [chunk]
        authors.extend(names)
    cleaned = []
    for name in authors:
        if not CJK_RE.search(name):
            name = re.sub(r"\.(?=[A-Z])", ". ", name)  # J.K.Rowling and J.K. Rowling -> J. K. Rowling
        if name not in cleaned:
            cleaned.append(name)
    if len(cleaned) > 2:
        return f"{cleaned[0]} 等"
    return " / ".join(cleaned)


def load_reading_wiki(vault: Path) -> dict[str, dict[str, str]]:
    """Book frontmatter keyed by Douban link."""
    pages: dict[str, dict[str, str]] = {}
    for path in sorted((vault / READING_WIKI).glob("*.md")):
        match = re.match(r"^---\n(.*?)\n---", path.read_text(encoding="utf-8"), re.S)
        if not match:
            continue
        fields: dict[str, str] = {}
        for line in match.group(1).splitlines():
            field = re.match(r"^(\w+):\s*(.*)$", line)
            if field:
                fields[field.group(1)] = field.group(2).strip().strip('"')
        link = fields.get("douban_link")
        if link:
            pages.setdefault(link, fields)
    return pages


def book_meta(record: dict[str, Any], wiki: dict[str, dict[str, str]]) -> list[str]:
    parts = [part.strip() for part in (record["简介"] or "").split(" / ")]
    author = parts[0] if parts else ""
    year = next((re.match(r"\d{4}", part).group(0) for part in parts[1:] if re.match(r"\d{4}", part)), "")
    publisher = next((part for part in parts[1:] if part and not re.match(r"\d", part)), "")
    page = wiki.get(record["链接"])
    if page:
        author = page.get("author") or author
        publisher = page.get("publisher") or publisher
        if re.fullmatch(r"\d{4}", page.get("year", "")):
            year = page["year"]
    return [value for value in (book_authors(author) if author else "", f"{publisher} {year}".strip()) if value]


def movie_meta(record: dict[str, Any]) -> list[str]:
    parts = [part.strip() for part in (record["简介"] or "").split(" / ")]
    year = parts[0][:4] if parts and re.match(r"\d{4}", parts[0]) else ""
    country = parts[1].split(" ")[0] if len(parts) > 1 else ""
    director = cjk_names(parts[3]) if len(parts) > 3 and parts[3] else ""
    return [value for value in (director, year, country) if value]


def music_meta(record: dict[str, Any]) -> list[str]:
    parts = [part.strip() for part in (record["简介"] or "").split(" / ")]
    artist = ARTIST_FIX.get(parts[0], parts[0]) if parts else ""
    year = parts[1][:4] if len(parts) > 1 else ""
    return [value for value in (artist, year) if value]


def game_meta(record: dict[str, Any]) -> list[str]:
    # Year only: no developer (proposal decision 11).
    parts = [part.strip() for part in (record["简介"] or "").split("/")]
    date = parts[-1] if parts and re.match(r"\d{4}", parts[-1]) else ""
    return [date[:4]] if date else []


def split_game_title(title: str) -> tuple[str, str | None]:
    """Douban names a game "中文名 原名". Split it, e.g. 黑神话：悟空 Black Myth: Wukong.

    The Chinese name always comes first and ends in a token with a CJK character.
    An original with no CJK at all (English, kana, hangul) is taken at the first
    split that allows it. A Japanese or traditional-Chinese original shares
    characters with the Chinese name (逆转裁判 逆転裁判), so otherwise take the
    split with the most shared characters, then the most even halves.
    """
    tokens = title.split()
    splits = []
    for k in range(1, len(tokens)):
        left, right = " ".join(tokens[:k]), " ".join(tokens[k:])
        if KANA_HANGUL_RE.search(left) or not CJK_RE.search(tokens[k - 1]):
            continue
        splits.append((left, right))
    for left, right in splits:
        if not CJK_RE.search(right):
            return left, right
    best = None
    for left, right in splits:
        shared = len(set(CJK_RE.findall(left)) & set(CJK_RE.findall(right)))
        if not (shared or KANA_HANGUL_RE.search(right)):
            continue
        score = (shared, -abs(len(left) - len(right)))
        if best is None or score > best[0]:
            best = (score, left, right)
    return (best[1], best[2]) if best else (title, None)


def season_key(mark: dict[str, Any]) -> tuple[int, str]:
    """Expanded seasons read in season order, not marking order (proposal decision 12)."""
    label = mark.get("label") or ""
    match = re.search(r"第([一二三四五六七八九十\d]+)季", label) or re.match(r"版本([一二三四五])", label)
    if match:
        number = match.group(1)
        return (int(number) if number.isdigit() else CN_NUM.get(number, 0), mark["marked_at"])
    if "最终季" in label:
        return (99, mark["marked_at"])
    return (1, mark["marked_at"])  # the bare title is season one


def works_for(records: list[dict[str, Any]], category: dict[str, str], wiki: dict[str, dict[str, str]]) -> list[dict[str, Any]]:
    kind = category["type"]
    groups: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        if record["_type"] != kind or record["我的评分"] != 5:
            continue
        title = record["标题"].strip()
        season = SEASON_RE.match(title) if kind == "movie" else None
        base = season.group(1).strip() if season else title
        key = base if (season or base not in NO_MERGE) else f"§{base}"
        if kind == "book":
            meta = book_meta(record, wiki)
        elif kind == "movie":
            meta = movie_meta(record)
        elif kind == "music":
            meta = music_meta(record)
        else:
            meta = game_meta(record)
        groups.setdefault(key, []).append({
            "title": title,
            "base": base,
            "label": season.group(2).strip() if season else None,
            "marked_at": record["创建时间"],
            "review": (record["评论"] or "").strip(),
            "link": record["链接"],
            "meta": meta,
        })

    works = []
    for marks in groups.values():
        marks.sort(key=lambda mark: mark["marked_at"], reverse=True)
        latest = marks[0]
        if len(marks) > 1:
            same_title = all(mark["title"] == latest["title"] for mark in marks)
            for index, mark in enumerate(sorted(marks, key=lambda mark: mark["marked_at"])):
                mark["label"] = f"版本{'一二三四五'[index]}" if same_title else (mark["label"] or mark["title"])
        title, original = split_game_title(latest["base"]) if kind == "game" else (latest["base"], None)
        meta = list(latest["meta"])
        if len(marks) > 1 and kind == "movie":
            years = sorted({mark["meta"][1] for mark in marks if len(mark["meta"]) > 1 and re.fullmatch(r"\d{4}", mark["meta"][1])})
            if len(years) > 1 and len(meta) > 1:
                meta[1] = f"{years[0]}–{years[-1]}"
        work: dict[str, Any] = {"title": title}
        if original:
            work["original_title"] = original
        work.update({
            "meta": meta,
            "date": latest["marked_at"][:10],
            "link": latest["link"],
            "marks": [
                {
                    **({"label": mark["label"]} if len(marks) > 1 else {}),
                    "date": mark["marked_at"][:10],
                    "link": mark["link"],
                    "review": mark["review"],
                }
                for mark in sorted(marks, key=season_key)
            ],
        })
        works.append((latest["marked_at"], work))

    # Marking time only, newest first; having a review never moves a work.
    works.sort(key=lambda pair: pair[0], reverse=True)
    return [work for _, work in works]


def build(vault: Path) -> dict[str, Any]:
    records = json.loads((vault / DOUBAN_EXPORT).read_text(encoding="utf-8"))
    wiki = load_reading_wiki(vault)
    for record in records:
        review = record.get("评论") or ""
        if "{{" in review or "}}" in review:
            raise ValueError(f"template marker in review of {record['标题']!r}")
    return {
        "export_date": EXPORT_DATE,
        "categories": [
            {**category, "works": works_for(records, category, wiki)}
            for category in CATEGORIES
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vault", default=os.environ.get("OBSIDIAN_VAULT"), help="Obsidian vault root (or set OBSIDIAN_VAULT).")
    args = parser.parse_args()
    if not args.vault:
        parser.error("pass --vault or set OBSIDIAN_VAULT")

    payload = build(Path(args.vault).expanduser())
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for category in payload["categories"]:
        works = category["works"]
        reviewed = sum(any(mark["review"] for mark in work["marks"]) for work in works)
        print(f"{category['name']}: {len(works)} works, {reviewed} reviewed")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
