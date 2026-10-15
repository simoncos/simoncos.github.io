import json
import sys
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from check_site import parse_html


class WorkRouteTests(unittest.TestCase):
    def test_local_work_routes_match_their_category(self):
        site = json.loads((ROOT / "data/site.json").read_text())
        for work in site["works"]:
            hrefs = work.get("href", {})
            if isinstance(hrefs, str):
                hrefs = {"all": hrefs}
            for href in hrefs.values():
                if urlsplit(href).scheme:
                    continue
                topic = work["work_topic"]
                prefix = "apps/" if topic == "apps" else f"gallery/{topic}/"
                with self.subTest(work=work["id"], href=href):
                    self.assertTrue(href.startswith(prefix))
                    self.assertTrue((ROOT / href).is_file())

    def test_legacy_pages_have_indexable_destinations_and_matching_share_cards(self):
        redirects = json.loads((ROOT / "data/redirects.json").read_text())
        sitemap = ElementTree.parse(ROOT / "sitemap.xml")
        urls = {x.text for x in sitemap.findall(".//{*}loc")}
        for old, target in redirects.items():
            with self.subTest(old=old):
                self.assertNotIn(target, redirects, "redirect chains are not allowed")
                old_doc = parse_html(ROOT / old)
                new_doc = parse_html(ROOT / target)
                canonical = f"https://simoncos.github.io/{target}"
                self.assertEqual(old_doc.canonical(), canonical)
                self.assertEqual(new_doc.canonical(), canonical)
                self.assertIn("noindex", old_doc.meta(name="robots"))
                self.assertNotIn("noindex", new_doc.meta(name="robots"))
                self.assertIn(canonical, urls)
                self.assertNotIn(f"https://simoncos.github.io/{old}", urls)
                for prop in ("og:title", "og:description", "og:url", "og:image"):
                    self.assertEqual(old_doc.meta(property=prop), new_doc.meta(property=prop))


if __name__ == "__main__":
    unittest.main()
