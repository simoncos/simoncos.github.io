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


def non_media_css_rules(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

    def collect(text):
        rules = []
        cursor = 0
        while cursor < len(text):
            block_start = text.find("{", cursor)
            if block_start < 0:
                break
            prelude = text[cursor:block_start].strip()
            depth = 1
            block_end = block_start + 1
            while block_end < len(text) and depth:
                if text[block_end] == "{":
                    depth += 1
                elif text[block_end] == "}":
                    depth -= 1
                block_end += 1
            body = text[block_start + 1:block_end - 1]
            if prelude.startswith("@"):
                if not prelude.startswith(("@media", "@keyframes")):
                    rules.extend(collect(body))
            elif prelude:
                rules.append((prelude, body))
            cursor = block_end
        return rules

    return collect(css)


def declaration_names(body):
    return {
        match.group("property")
        for match in re.finditer(r"(?m)^\s*(?P<property>-{0,2}[a-zA-Z][\w-]*)\s*:", body)
    }


def split_css_selectors(selector_group):
    selectors = []
    start = 0
    depth = 0
    for index, character in enumerate(selector_group):
        if character in "([":
            depth += 1
        elif character in ")]":
            depth -= 1
        elif character == "," and depth == 0:
            selectors.append(selector_group[start:index].strip())
            start = index + 1
    selectors.append(selector_group[start:].strip())
    return {selector for selector in selectors if selector}


def shared_dark_target(selector):
    dark_prefix = ":is(body.dark-mode, html.dark-mode body) "
    if not selector.startswith(dark_prefix):
        return None
    target = selector.removeprefix(dark_prefix)
    shared_targets = {
        ".site-kicker",
        ".site-header h1",
        "nav",
        "nav ul li a",
        "nav ul li a:hover",
        "nav ul li a.active",
        ".site-language-switch",
        ".site-language-button",
        ".site-language-button:hover",
        ".site-language-button.active",
        ".theme-toggle",
        ".theme-toggle:hover",
    }
    return target if target in shared_targets else None


class SurfaceContractTests(unittest.TestCase):
    def test_shared_shell_properties_have_one_non_media_owner(self):
        css = (ROOT / "src/css/styles.css").read_text()
        shared_selectors = {
            ".site-header",
            ".header-inner",
            ".site-kicker",
            ".site-header h1",
            "#navigation-placeholder",
            ".site-nav-shell",
            "nav",
            ".nav-inner",
            "nav ul",
            "nav ul li",
            "nav ul li a",
            ".site-nav-controls",
            ".site-language-switch",
            ".site-language-button",
            ".dark-mode-container",
            ".theme-toggle",
            ".theme-toggle-icon",
            ".theme-toggle-text",
            ".theme-toggle-label",
        }
        owners = {}
        for selector_group, body in non_media_css_rules(css):
            selectors = split_css_selectors(selector_group)
            for selector in selectors & shared_selectors:
                for property_name in declaration_names(body):
                    owners.setdefault((selector, property_name), []).append(selector_group)

        duplicates = {
            f"{selector}::{property_name}": selector_groups
            for (selector, property_name), selector_groups in owners.items()
            if len(selector_groups) > 1
        }
        self.assertFalse(duplicates, f"duplicate non-media shared-shell ownership: {duplicates}")

        before_canonical = css.split("/* Shared site shell */", 1)[0]
        pre_canonical_owners = []
        for selector_group, _ in non_media_css_rules(before_canonical):
            selectors = split_css_selectors(selector_group)
            pre_canonical_owners.extend(sorted(selectors & shared_selectors))
        self.assertFalse(
            pre_canonical_owners,
            f"generic shared-shell owners before canonical block: {pre_canonical_owners}",
        )

    def test_shared_dark_shell_properties_have_one_canonical_owner(self):
        css = (ROOT / "src/css/styles.css").read_text()
        owners = {}
        for selector_group, body in non_media_css_rules(css):
            for selector in split_css_selectors(selector_group):
                target = shared_dark_target(selector)
                if target:
                    for property_name in declaration_names(body):
                        owners.setdefault((target, property_name), []).append(selector_group)

        duplicates = {
            f"{target}::{property_name}": selector_groups
            for (target, property_name), selector_groups in owners.items()
            if len(selector_groups) > 1
        }
        self.assertFalse(duplicates, f"duplicate non-media dark shared-shell ownership: {duplicates}")

        before_canonical = css.split("/* Shared site shell */", 1)[0]
        pre_canonical_owners = []
        for selector_group, _ in non_media_css_rules(before_canonical):
            for selector in split_css_selectors(selector_group):
                target = shared_dark_target(selector)
                if target:
                    pre_canonical_owners.append(target)
        self.assertFalse(
            pre_canonical_owners,
            f"dark shared-shell owners before canonical block: {pre_canonical_owners}",
        )

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

    def test_home_and_tags_use_canonical_page_content_frames(self):
        index_html = (ROOT / "index.html").read_text()
        tags_html = (ROOT / "tags.html").read_text()

        self.assertRegex(index_html, r'<main\b[^>]*\bhome-page-content\b')
        self.assertRegex(tags_html, r'<main\b[^>]*\btags-page-content\b')

    def test_canonical_home_and_tags_content_has_compact_responsive_owners(self):
        css = (ROOT / "src/css/styles.css").read_text()
        marker = "/* Canonical Home and Tags page content */"

        self.assertEqual(css.count(marker), 1)
        page_content = css.split(marker, 1)[1].split("/* Shared site shell */", 1)[0]
        frame_width = "min(calc(100% - (2 * var(--home-layout-gutter))), var(--home-layout-width))"

        self.assertIn(f"width: {frame_width};", css_block(page_content, ".home-page-content"))
        self.assertIn(f"width: {frame_width};", css_block(page_content, ".tags-page-content"))
        self.assertIn("grid-template-columns: repeat(3, minmax(0, 1fr));", css_block(page_content, ".home-trail-grid"))
        self.assertIn(
            "grid-template-columns: repeat(2, minmax(0, 1fr));",
            css_block(page_content, ".tags-page-content .tag-list"),
        )
        self.assertIn("@media (max-width: 899px)", page_content)
        self.assertIn("@media (max-width: 520px)", page_content)
        self.assertIn("min-width: 0;", css_block(page_content, ".tags-page-content .page-intro .page-lede"))

    def test_tags_filter_label_has_localized_static_fallback(self):
        tags_html = (ROOT / "tags.html").read_text()
        i18n = (ROOT / "src/ts/i18n.ts").read_text()

        self.assertIn('aria-label="Tag filter"', tags_html)
        self.assertIn('data-i18n-aria-label="tags_filter_label"', tags_html)
        self.assertRegex(i18n, r"tags_filter_label\s*:\s*['\"]Tag filter['\"]")
        self.assertRegex(i18n, r"tags_filter_label\s*:\s*['\"]标签筛选['\"]")

    def test_canonical_page_content_resets_legacy_card_and_list_treatments(self):
        css = (ROOT / "src/css/styles.css").read_text()
        page_content = css.split("/* Canonical Home and Tags page content */", 1)[1].split(
            "/* Shared site shell */", 1
        )[0]

        self.assertIn("border: 0;", css_block(page_content, ".home-page-content .home-system-node"))
        self.assertIn("border: 0;", css_block(page_content, ".home-page-content .home-trail-card"))
        self.assertIn(
            "display: none;",
            css_block(page_content, "#tag-sections .tag-section li::before"),
        )
        self.assertIn(
            ":is(body.dark-mode, html.dark-mode body) .tags-page-content .tag-section",
            page_content,
        )

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

    def test_gallery_collection_is_a_manifest_backed_six_card_mosaic(self):
        manifest = json.loads((ROOT / "data/content_manifest.json").read_text())
        gallery_html = (ROOT / "gallery.html").read_text()
        gallery_items = [item for item in manifest["items"] if "gallery" in item["surfaces"]]
        grid_match = re.search(
            r'<!-- static-fallback:start gallery-grid -->(?P<content>.*?)<!-- static-fallback:end gallery-grid -->',
            gallery_html,
            re.S,
        )

        self.assertEqual(len(gallery_items), 6)
        self.assertEqual(
            {item["id"] for item in gallery_items},
            {
                "pkm-2026-06-07-talk",
                "sleep-2016-2026",
                "hermes-agent-hv-analysis",
                "haba-snow-mountain",
                "sleep-toolkit",
                "ai-personal-information-system",
            },
        )
        self.assertIsNotNone(grid_match)
        self.assertEqual(grid_match.group("content").count('class="project-card gallery-card'), 6)
        after_grid = gallery_html[grid_match.end():gallery_html.index('<section id="personal-data-lab"')]
        self.assertNotIn('class="project-card gallery-card', after_grid)

    def test_personal_data_lab_is_a_compact_title_only_curation_rail(self):
        gallery_html = (ROOT / "gallery.html").read_text()
        css = (ROOT / "src/css/styles.css").read_text()
        rail_match = re.search(
            r'<section id="personal-data-lab"[^>]*>(?P<content>.*?)</section>',
            gallery_html,
            re.S,
        )

        self.assertIsNotNone(rail_match)
        rail = rail_match.group("content")
        self.assertEqual(rail.count('class="personal-data-reference"'), 3)
        self.assertNotIn("project-card", rail)
        self.assertNotIn("project-card-summary", rail)
        self.assertNotIn("personal-data-path-type", rail)
        self.assertNotIn("<small", rail)

        fallback_end = gallery_html.index("<!-- static-fallback:end gallery-grid -->")
        rail_start = gallery_html.index('<section id="personal-data-lab"')
        self.assertLess(fallback_end, rail_start)

        rail_grid_row_owners = []
        for selector_group, body in non_media_css_rules(css):
            if ".gallery-board .personal-data-lab--strip" in split_css_selectors(selector_group):
                if "grid-row" in declaration_names(body):
                    rail_grid_row_owners.append(selector_group)
        self.assertFalse(
            rail_grid_row_owners,
            f"Personal Data Lab must follow the six cards by DOM auto-placement: {rail_grid_row_owners}",
        )

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
