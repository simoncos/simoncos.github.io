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


def css_block(css, selector):
    match = re.search(rf"{re.escape(selector)}\s*\{{(?P<body>.*?)\}}", css, re.S)
    if not match:
        raise AssertionError(f"missing CSS block for {selector}")
    return match.group("body")


class SurfaceContractTests(unittest.TestCase):
    def test_design_tokens_have_one_canonical_root_definition(self):
        css = (ROOT / "src/css/styles.css").read_text()
        root_blocks = re.findall(r"(?m)^:root\s*\{(?P<body>.*?)^\}", css, re.S)

        self.assertEqual(len(root_blocks), 1)
        root = root_blocks[0]
        expected_tokens = {
            "--editorial-paper": "#fbf7ee",
            "--editorial-paper-strong": "#fffdf7",
            "--editorial-ink": "#16213a",
            "--editorial-muted": "#59677d",
            "--editorial-rule": "rgba(33, 46, 72, 0.16)",
            "--editorial-accent": "#087687",
            "--editorial-accent-soft": "rgba(8, 118, 135, 0.1)",
            "--editorial-serif": 'Georgia, "Times New Roman", serif',
            "--site-shell-width": "1340px",
            "--site-shell-gutter": "clamp(1.25rem, 1.875vw, 1.5rem)",
            "--site-title-size": "clamp(2.05rem, 3vw, 2.65rem)",
            "--site-nav-font-size": "0.86rem",
            "--site-nav-row-height": "3.45rem",
            "--site-nav-gap": "clamp(0.72rem, 2vw, 1.55rem)",
            "--home-layout-width": "1216px",
            "--home-layout-gutter": "clamp(1.25rem, 5.7vw, 4.9rem)",
        }
        for token, value in expected_tokens.items():
            with self.subTest(token=token):
                self.assertEqual(len(re.findall(rf"{re.escape(token)}\s*:", root)), 1)
                self.assertIn(f"{token}: {value};", root)

    def test_shared_shell_uses_canonical_width_gutter_and_breakpoints(self):
        css = (ROOT / "src/css/styles.css").read_text()
        shell_width = "min(calc(100% - (2 * var(--site-shell-gutter))), var(--site-shell-width))"
        shared_shell = css.split("/* Shared site shell */", 1)[1]

        self.assertIn(f"width: {shell_width};", css_block(shared_shell, ".site-header"))
        self.assertIn(f"width: {shell_width};", css_block(shared_shell, "#navigation-placeholder"))
        self.assertIn("width: 100%;", css_block(shared_shell, ".site-nav-shell"))
        self.assertNotIn("--design1-width", css)
        self.assertNotIn("--design1-page-gutter", css)
        self.assertNotRegex(css, r"(?m)^\s*\.gallery-index-page\s+\.(?:site-header|header-inner|site-nav-shell)\b")
        self.assertIn("@media (max-width: 899px)", css)
        self.assertIn("@media (max-width: 520px)", css)
        self.assertIn("@media (max-width: 380px)", css)

    def test_final_shared_navigation_rules_have_no_home_or_gallery_selectors(self):
        css = (ROOT / "src/css/styles.css").read_text()
        marker = "/* Shared site shell */"

        self.assertEqual(css.count(marker), 1)
        shared_shell = css.split(marker, 1)[1]
        navigation_target = r"(?:site-header|header-inner|navigation-placeholder|site-nav|nav\b|site-language|theme-toggle)"
        self.assertNotRegex(
            shared_shell,
            rf'body\.home-page\[data-home-layout="route-journal"\][^{{}}]*{navigation_target}',
        )
        self.assertNotRegex(shared_shell, rf"\.gallery-index-page[^{{}}]*{navigation_target}")

    def test_blog_footers_use_runtime_site_config_version(self):
        shell = json.loads((ROOT / "data/site_shell.json").read_text())
        template_pages = [page for page in shell["pages"] if page["path"].startswith("templates/")]

        self.assertTrue(template_pages)
        self.assertTrue(all(page["footer_version"] == "site_config" for page in template_pages))
        for path in (
            "templates/blogs-listing-template.html",
            "templates/blog-template.html",
            "blogs.html",
            "blogs/a-bird-across-models.en.html",
        ):
            with self.subTest(path=path):
                template = (ROOT / path).read_text()
                self.assertIn('data-site-version="site-config"', template)
                self.assertNotIn("{{SITE_VERSION}}", template)

    def test_home_links_have_localized_paths_for_bilingual_internal_targets(self):
        surface = json.loads((ROOT / "data/home_surface.json").read_text())
        renderer = (ROOT / "src/ts/load-home-surface.ts").read_text()
        index_html = (ROOT / "index.html").read_text()

        content_items = surface["surface"]["items"] + surface["trails"]["items"]
        invalid_items = []
        for item in content_items:
            href = item.get("href", "")
            if item.get("skipLangRewrite") or href.startswith(("#", "http:", "https:")):
                continue
            paths = item.get("paths")
            valid_paths = (
                isinstance(paths, dict)
                and {"en", "zh"}.issubset(paths)
                and all(isinstance(paths[language], str) and paths[language] for language in ("en", "zh"))
            )
            if not valid_paths or href.endswith(".en.html"):
                invalid_items.append(href or item.get("title", {}).get("en", "<missing href>"))
                continue
            self.assertIn(f'href="{paths["en"]}"', index_html)
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

        self.assertRegex(gallery_html, r'<nav\b[^>]*class="gallery-section-index"')
        self.assertIn('aria-label="Gallery sections"', gallery_html)
        self.assertIn('data-i18n-aria-label="gallery_sections_label"', gallery_html)
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
        self.assertIn("gallery_sections_label", i18n)
        self.assertIn("gallery_overview", i18n)
        self.assertRegex(i18n, r"gallery_section_index\s*:\s*['\"]Section index['\"]")
        self.assertRegex(i18n, r"gallery_overview\s*:\s*['\"]Overview['\"]")
        self.assertRegex(i18n, r"gallery_section_index\s*:\s*['\"]章节索引['\"]")
        self.assertRegex(i18n, r"gallery_overview\s*:\s*['\"]概览['\"]")
        self.assertRegex(i18n, r"gallery_sections_label\s*:\s*['\"]Gallery sections['\"]")
        self.assertRegex(i18n, r"gallery_sections_label\s*:\s*['\"]作品章节索引['\"]")

    def test_home_mixed_content_feed_uses_recent_updates_label(self):
        index_html = (ROOT / "index.html").read_text()
        i18n = (ROOT / "src/ts/i18n.ts").read_text()

        self.assertIn('data-i18n="recent_updates"', index_html)
        self.assertIn('data-i18n="latest_activity"', index_html)
        self.assertNotIn('data-i18n="recent_writing"', index_html)
        self.assertRegex(i18n, r"recent_updates\s*:\s*['\"]Recent updates['\"]")
        self.assertRegex(i18n, r"recent_updates\s*:\s*['\"]最近更新['\"]")
        self.assertRegex(i18n, r"latest_activity\s*:\s*['\"]Latest activity['\"]")
        self.assertRegex(i18n, r"latest_activity\s*:\s*['\"]最新动态['\"]")
        self.assertRegex(i18n, r"home_dispatch_all\s*:\s*['\"]Browse all writing['\"]")
        self.assertRegex(i18n, r"home_dispatch_all\s*:\s*['\"]浏览全部文章['\"]")


if __name__ == "__main__":
    unittest.main()
