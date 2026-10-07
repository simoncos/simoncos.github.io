"""Preserve bilingual backlink semantics and keep parsing linear in articles."""
import unittest
from unittest.mock import patch

import generate_blog_pages as generator
import article_relations


def group(name, date="2026-01-01", zh="", en=""):
    return {"id": name, "date": date, "languages": {
        "zh": {"file": name + ".html", "title": name, "html_content": zh},
        "en": {"file": name + ".en.html", "title": name, "html_content": en},
    }}


class BacklinkTests(unittest.TestCase):
    def test_bilingual_links_are_deduplicated_and_self_links_excluded(self):
        target = group("target", zh='<a href="target.en.html">Translation</a>')
        source = group("source", zh='<a href="target.html#heading-1">One</a>'
                       '<a href="/blogs/target.en.html?lang=en">Two</a>',
                       en='<a href="https://simoncos.github.io/blogs/target.html">Three</a>')
        unrelated = group("external", zh='<a href="https://example.com/blogs/target.html">Elsewhere</a>')
        result = generator.build_backlinks_data([target, source, unrelated], "2026-10-04")
        self.assertEqual(result["last_updated"], "2026-10-04")
        for name in ("target.html", "target.en.html"):
            self.assertEqual([entry["group_id"] for entry in result["files"][name]], ["source"])
            self.assertEqual(set(result["files"][name][0]["languages"]), {"en", "zh"})
        self.assertEqual(result["files"]["source.html"], [])

    def test_backlinks_keep_date_order_and_stable_ties(self):
        link = '<a href="../blogs/target.html">Target</a>'
        groups = [group("target"), group("older", "2024-01-01", zh=link),
                  group("first", "2026-01-01", en=link), group("second", "2026-01-01", zh=link)]
        result = generator.build_backlinks_data(groups, None)
        self.assertEqual([entry["group_id"] for entry in result["files"]["target.html"]],
                         ["first", "second", "older"])

    def test_each_nonempty_variant_is_parsed_once_as_collection_grows(self):
        groups = [group(str(i), zh=f'<a href="{(i + 1) % 300}.html">Next</a>', en="<p>English</p>")
                  for i in range(300)]
        with patch.object(article_relations, "linked_article_files", wraps=generator.linked_article_files) as parser:
            generator.build_backlinks_data(groups, None)
        self.assertEqual(parser.call_count, 600)
