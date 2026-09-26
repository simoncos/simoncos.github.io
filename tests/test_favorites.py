import json
import re
import sys
import unittest
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import extract_favorites  # noqa: E402
import update_favorites_pages  # noqa: E402


def load_payload():
    return json.loads((ROOT / "data/favorites.json").read_text(encoding="utf-8"))


class FavoritesDataTests(unittest.TestCase):
    def test_categories_are_the_four_in_order(self):
        payload = load_payload()
        self.assertEqual([c["id"] for c in payload["categories"]], ["books", "film", "music", "games"])
        self.assertEqual([c["name"] for c in payload["categories"]], ["书", "影", "音", "游"])

    def test_works_are_in_marking_order_newest_first(self):
        for category in load_payload()["categories"]:
            dates = [work["date"] for work in category["works"]]
            with self.subTest(category=category["id"]):
                self.assertEqual(dates, sorted(dates, reverse=True))

    def test_a_work_sorts_on_its_most_recent_mark(self):
        for category in load_payload()["categories"]:
            for work in category["works"]:
                with self.subTest(work=work["title"]):
                    self.assertEqual(work["date"], max(mark["date"] for mark in work["marks"]))

    def test_merged_marks_are_labelled_and_read_in_season_order(self):
        for category in load_payload()["categories"]:
            for work in category["works"]:
                marks = work["marks"]
                if len(marks) == 1:
                    self.assertNotIn("label", marks[0])
                    continue
                with self.subTest(work=work["title"]):
                    self.assertTrue(all(mark.get("label") for mark in marks))
                    keys = [extract_favorites.season_key({**mark, "marked_at": mark["date"]})[0] for mark in marks]
                    self.assertEqual(keys, sorted(keys))

    def test_marks_link_to_douban(self):
        for category in load_payload()["categories"]:
            for work in category["works"]:
                for mark in work["marks"]:
                    self.assertRegex(mark["link"], r"^https://(?:book|movie|music|www)\.douban\.com/")

    def test_games_show_the_year_only(self):
        games = next(c for c in load_payload()["categories"] if c["id"] == "games")
        for work in games["works"]:
            with self.subTest(work=work["title"]):
                self.assertTrue(all(re.fullmatch(r"\d{4}", part) for part in work["meta"]))


class FavoritesRuleTests(unittest.TestCase):
    def test_game_titles_split_into_chinese_and_original(self):
        cases = {
            "黑神话：悟空 Black Myth: Wukong": ("黑神话：悟空", "Black Myth: Wukong"),
            "银河战士 生存恐惧 メトロイド ドレッド": ("银河战士 生存恐惧", "メトロイド ドレッド"),
            "逆转裁判 逆転裁判": ("逆转裁判", "逆転裁判"),
            "如龙0 誓约的场所 龍が如く0 誓いの場所": ("如龙0 誓约的场所", "龍が如く0 誓いの場所"),
            "英雄传说 空之轨迹3rd 英雄伝説 空の軌跡 the 3rd": ("英雄传说 空之轨迹3rd", "英雄伝説 空の軌跡 the 3rd"),
            "轩辕剑叁 云和山的彼端 軒轅劍參 雲和山的彼端": ("轩辕剑叁 云和山的彼端", "軒轅劍參 雲和山的彼端"),
            "使命召唤6：现代战争2 战役复刻版 Call of Duty: Modern Warfare 2 Campaign Remastered": (
                "使命召唤6：现代战争2 战役复刻版",
                "Call of Duty: Modern Warfare 2 Campaign Remastered",
            ),
            "泡泡堂 크레이지 아케이드": ("泡泡堂", "크레이지 아케이드"),
            "天地劫序传 幽城幻剑录": ("天地劫序传 幽城幻剑录", None),
            "大富翁4": ("大富翁4", None),
        }
        for title, expected in cases.items():
            with self.subTest(title=title):
                self.assertEqual(extract_favorites.split_game_title(title), expected)

    def test_book_authors_drop_markers_and_aliases(self):
        cases = {
            "[日] 谷口治郎 [日] 梦枕貘": "谷口治郎 / 梦枕貘",
            "【美】傅高义 (Ezra.F.Vogel)": "傅高义",
            "(英) 大卫·米切尔 David Mitchell": "大卫·米切尔",
            "康妮•威利斯 Connie Willis": "康妮•威利斯",
            "金观涛 华国凡": "金观涛 / 华国凡",
            "[美] Brian W. Kernighan [美] Dennis M. Ritchie": "Brian W. Kernighan / Dennis M. Ritchie",
            "J.K.Rowling": "J. K. Rowling",
            "[英] K.J.帕克": "K.J.帕克",
            "[美] 特德·蒋 [美] 姜峯楠": "特德·蒋",
        }
        for raw, expected in cases.items():
            with self.subTest(raw=raw):
                self.assertEqual(extract_favorites.book_authors(raw), expected)


class FavoritesPageTests(unittest.TestCase):
    def test_pages_are_current(self):
        for path, text in update_favorites_pages.render_all().items():
            with self.subTest(path=path.name):
                self.assertEqual(path.read_text(encoding="utf-8"), text, "run scripts/update_favorites_pages.py")

    def test_category_pages_carry_every_work_and_every_review_verbatim(self):
        for category in load_payload()["categories"]:
            html = (ROOT / f"favorites/{category['id']}.html").read_text(encoding="utf-8")
            with self.subTest(category=category["id"]):
                self.assertEqual(html.count('<li class="favorite-row'), len(category["works"]))
                for work in category["works"]:
                    for mark in work["marks"]:
                        if mark["review"]:
                            self.assertIn(escape(mark["review"], quote=True), html)

    def test_rows_do_not_use_the_i18n_date_hook(self):
        # i18n.ts replaces the text of every [data-date] element with a formatted date.
        for path in (ROOT / "favorites").glob("*.html"):
            with self.subTest(path=path.name):
                self.assertNotIn("data-date=", path.read_text(encoding="utf-8"))

    def test_pages_are_chinese_only(self):
        for path in [ROOT / "favorites.html", *sorted((ROOT / "favorites").glob("*.html"))]:
            html = path.read_text(encoding="utf-8")
            with self.subTest(path=path.name):
                self.assertIn('<html lang="zh-Hans">', html)
                self.assertNotIn("hreflang", html)

    def test_nav_entry_shows_in_both_languages(self):
        # The pages are Chinese only, but the English nav still lists the column:
        # the site defaults to English, and hiding it there left no way in.
        for path in ("navigation.html", "src/ts/load-nav.ts"):
            text = (ROOT / path).read_text(encoding="utf-8")
            with self.subTest(path=path):
                self.assertIn('<li><a href="#" data-page="favorites.html"', text)
                self.assertNotIn("data-nav-lang", text)

    def test_essay_links_point_at_published_articles_with_original_dates(self):
        links = {work["link"]: work for c in load_payload()["categories"] for work in c["works"]}
        for link, path in update_favorites_pages.ESSAYS.items():
            with self.subTest(path=path):
                self.assertIn(link, links)
                self.assertTrue((ROOT / path).is_file())
                self.assertRegex(
                    (ROOT / path).with_suffix(".md").read_text(encoding="utf-8"),
                    r"(?m)^date: \d{4}-\d{2}-\d{2}$",
                    "an essay without a frontmatter date is dated by file mtime, i.e. today",
                )


if __name__ == "__main__":
    unittest.main()
