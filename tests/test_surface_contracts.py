import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class MainLandmarkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.main_count = 0

    def handle_starttag(self, tag, attrs):
        if tag == "main":
            self.main_count += 1


def main_count(html):
    parser = MainLandmarkParser()
    parser.feed(html)
    return parser.main_count


class SurfaceContractTests(unittest.TestCase):
    def test_home_links_have_localized_paths_for_bilingual_internal_targets(self):
        surface = json.loads((ROOT / "data/home_surface.json").read_text())
        renderer = (ROOT / "src/ts/load-home-surface.ts").read_text()

        content_items = surface["surface"]["items"] + surface["trails"]["items"]
        invalid_items = []
        for item in content_items:
            href = item.get("href", "")
            if not href or href.startswith(("#", "http:", "https:")) or item.get("skipLangRewrite"):
                continue
            paths = item.get("paths")
            if not isinstance(paths, dict) or not {"en", "zh"}.issubset(paths) or href.endswith(".en.html"):
                invalid_items.append(href)
        self.assertFalse(invalid_items, f"invalid bilingual home links: {invalid_items}")

        self.assertIn("item.paths", renderer)
        self.assertIn("paths[language]", renderer)

    def test_index_and_tags_have_one_main_landmark_each(self):
        for page in ("index.html", "tags.html"):
            with self.subTest(page=page):
                self.assertEqual(main_count((ROOT / page).read_text()), 1)

    def test_tags_use_page_h2_and_tag_group_h3_headings(self):
        tags_html = (ROOT / "tags.html").read_text()
        tags_renderer = (ROOT / "src/ts/load-tags-page.ts").read_text()

        self.assertRegex(tags_html, r"<h2\b")
        self.assertIn("<h3>${escapeHtml(hash)}</h3>", tags_renderer)
        self.assertNotIn("<h4>", tags_renderer)

    def test_gallery_navigation_is_a_section_index_with_overview_entry(self):
        gallery_html = (ROOT / "gallery.html").read_text()
        i18n = (ROOT / "src/ts/i18n.ts").read_text()

        self.assertIn('aria-label="Gallery sections"', gallery_html)
        self.assertNotIn("gallery-filter-tabs", gallery_html)
        self.assertIn('data-i18n="gallery_section_index"', gallery_html)
        self.assertIn('data-i18n="gallery_overview"', gallery_html)
        all_link = re.search(
            r'<a\b[^>]*data-i18n="gallery_(?:filter_all|overview)"[^>]*>',
            gallery_html,
        )
        self.assertIsNotNone(all_link)
        self.assertNotRegex(all_link.group(0), r'class="[^"]*\bactive\b"')
        self.assertNotIn("aria-current", all_link.group(0))
        self.assertIn("gallery_section_index", i18n)
        self.assertIn("gallery_overview", i18n)
        self.assertRegex(i18n, r"gallery_section_index\s*:\s*['\"]Section index['\"]")
        self.assertRegex(i18n, r"gallery_overview\s*:\s*['\"]Overview['\"]")
        self.assertRegex(i18n, r"gallery_section_index\s*:\s*['\"]章节索引['\"]")
        self.assertRegex(i18n, r"gallery_overview\s*:\s*['\"]概览['\"]")

    def test_home_mixed_content_feed_uses_recent_updates_label(self):
        index_html = (ROOT / "index.html").read_text()
        i18n = (ROOT / "src/ts/i18n.ts").read_text()

        self.assertIn('data-i18n="recent_updates"', index_html)
        self.assertNotIn('data-i18n="recent_writing"', index_html)
        self.assertRegex(i18n, r"recent_updates\s*:\s*['\"]Recent updates['\"]")
        self.assertRegex(i18n, r"recent_updates\s*:\s*['\"]最近更新['\"]")


if __name__ == "__main__":
    unittest.main()
