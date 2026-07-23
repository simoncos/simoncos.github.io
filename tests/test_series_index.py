import importlib.util
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/article_index_multiple_series.json"


def load_script(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SeriesIndexTests(unittest.TestCase):
    def test_static_fallback_renders_one_compact_row_per_series_from_article_index(self):
        fallbacks = load_script("series_static_fallbacks", "scripts/update_static_fallbacks.py")
        fixture = json.loads(FIXTURE.read_text())

        self.assertTrue(hasattr(fallbacks, "render_series_index"))
        rendered = fallbacks.render_series_index(fixture)

        self.assertEqual(rendered.count('class="series-ledger-row"'), 2)
        self.assertEqual(rendered.count('class="series-part-row"'), 3)
        self.assertIn("Field Notes", rendered)
        self.assertIn("RedPiggy, an emerging AI existence", rendered)
        self.assertIn("Emerging from the Abyss", rendered)
        self.assertIn("从深渊中浮现", rendered)
        self.assertLess(rendered.index("Emerging from the Abyss"), rendered.index("Across Three Abysses"))

    def test_essays_hub_has_generator_owned_meaningful_series_fallback(self):
        for path in ("blogs.html", "templates/blogs-listing-template.html"):
            with self.subTest(path=path):
                page = (ROOT / path).read_text()
                match = re.search(
                    r"<!-- static-fallback:start series-index -->(?P<content>.*?)<!-- static-fallback:end series-index -->",
                    page,
                    re.S,
                )
                self.assertIsNotNone(match)
                self.assertIn('class="series-ledger-row"', match.group("content"))
                self.assertIn("RedPiggy, an emerging AI existence", match.group("content"))
                self.assertIn("Emerging from the Abyss", match.group("content"))
                self.assertIn("Across Three Abysses", match.group("content"))

    def test_static_fallback_rejects_incomplete_or_unsafe_preferred_entries_atomically(self):
        fallbacks = load_script("series_static_safety", "scripts/update_static_fallbacks.py")
        fixture = json.loads(FIXTURE.read_text())

        for malformed_entry in (
            {"title": "", "file": "redpiggy-part-two.en.html"},
            {"title": "Missing file", "file": ""},
            {"title": "Unsafe", "file": 'unsafe.html" onclick="alert(1)'},
            {"title": "Traversal", "file": "../outside.html"},
        ):
            with self.subTest(entry=malformed_entry):
                payload = json.loads(json.dumps(fixture))
                payload["groups"][0]["languages"]["en"] = malformed_entry
                self.assertEqual(fallbacks.render_series_index(payload), "")

    def test_topic_index_is_derived_into_the_essays_hub(self):
        fallbacks = load_script("topic_static_fallbacks", "scripts/update_static_fallbacks.py")
        fixture = json.loads(FIXTURE.read_text())
        fixture["groups"][0]["tags"] = ["ai"]
        fixture["groups"][1]["tags"] = ["field"]
        rendered = fallbacks.render_topic_index(fixture)

        self.assertIn('href="#topic-', rendered)
        self.assertIn('href="#topics"', rendered)
        self.assertIn('data-i18n="essays_all_topics"', rendered)

    def test_superseded_series_selector_arms_are_removed(self):
        css = (ROOT / "src/css/styles.css").read_text()

        self.assertNotIn(".series-card", css)
        self.assertNotIn(".series-meta", css)
        self.assertNotIn(".series-posts", css)


if __name__ == "__main__":
    unittest.main()
