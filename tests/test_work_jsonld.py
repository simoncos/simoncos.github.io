"""Every local work page in data/site.json carries current, valid JSON-LD (scripts/update_work_jsonld.py)."""
import json, re, subprocess, sys, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import update_work_jsonld as W  # noqa: E402


class WorkJsonLd(unittest.TestCase):
    def test_blocks_are_current(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts/update_work_jsonld.py"), "--check"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_blocks_are_valid(self):
        site = json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))
        seen = 0
        for work in site["works"]:
            for lang, rel in W.pages(work):
                s = (ROOT / rel).read_text(encoding="utf-8")
                blocks = re.findall(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', s, re.S)
                self.assertEqual(len(blocks), 1, rel)
                d = json.loads(blocks[0])
                self.assertEqual(d["@context"], "https://schema.org")
                self.assertEqual(d["@type"], W.TYPES[work["kind"]["en"]], rel)
                self.assertEqual(d["author"]["@type"], "Person")
                self.assertEqual(d["author"]["name"], "simoncos")
                self.assertIn(d["name"], (work["title"]["en"], work["title"]["zh"]))
                self.assertRegex(d["datePublished"], r"^\d{4}(-\d{2}-\d{2})?$")
                self.assertGreaterEqual(d["dateModified"], d["datePublished"])
                canon = re.search(r'<link rel="canonical" href="([^"]+)"', s).group(1)
                self.assertEqual(d["url"], canon, rel)
                html_lang = re.search(r'<html[^>]*\slang="([^"]+)"', s).group(1)
                self.assertIn(html_lang, d["inLanguage"] if isinstance(d["inLanguage"], list) else [d["inLanguage"]], rel)
                self.assertTrue(d["description"], rel)
                seen += 1
        self.assertGreaterEqual(seen, 16)


if __name__ == "__main__":
    unittest.main()
