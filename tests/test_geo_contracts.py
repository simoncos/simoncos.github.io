import json
import re
import statistics
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


GEO_REPLAY_REDIRECTS = {
    "projects/sleep-2016-2026.en.html": "gallery/research/sleep-2016-2026.en.html",
    "projects/sleep-2016-2026.html": "gallery/research/sleep-2016-2026.html",
    "projects/sleep-toolkit.en.html": "apps/sleep-toolkit.en.html",
    "projects/sleep-toolkit.html": "apps/sleep-toolkit.html",
    "projects/sleep/index.html": "gallery/research/sleep-2016-2026.html",
    "gallery/talks/pkm-2026-05-22/index.html": "gallery/sharing/pkm-2026-06-07/index.html",
    "projects/hn-field-notes/index.html": "https://hn-waywo-dashboard.vercel.app/",
}


class LegacyRouteTests(unittest.TestCase):
    def setUp(self):
        self.redirects = json.loads((ROOT / "data/redirects.json").read_text())

    def test_geo_routes_live_in_the_current_redirect_map(self):
        for source, target in GEO_REPLAY_REDIRECTS.items():
            self.assertEqual(self.redirects.get(source), target)
        sitemap = ElementTree.parse(ROOT / "sitemap.xml")
        locations = {node.text for node in sitemap.findall(".//{*}loc")}
        for source, target in GEO_REPLAY_REDIRECTS.items():
            self.assertNotIn(f"https://simoncos.github.io/{source}", locations)
            if target.startswith("https://") or target.startswith("http://"):
                continue
            self.assertIn(f"https://simoncos.github.io/{target}", locations)
            self.assertNotIn(target, self.redirects, "redirect chains are not allowed")

    def test_only_the_verified_field_notes_entry_is_external(self):
        external = {src: dst for src, dst in self.redirects.items() if dst.startswith("https://") or dst.startswith("http://")}
        self.assertEqual(external, {"projects/hn-field-notes/index.html": "https://hn-waywo-dashboard.vercel.app/"})


class EvidenceRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = {}
        self.current = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr" and attrs.get("id", "").startswith("score-"):
            self.current = attrs["id"]
            self.rows[self.current] = []
        if self.current and tag in ("td", "th"):
            self.cell = ""

    def handle_data(self, text):
        if self.cell is not None:
            self.cell += text

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.rows[self.current].append(self.cell)
            self.cell = None
        if tag == "tr":
            self.current = None


class SleepEvidenceTests(unittest.TestCase):
    def test_bilingual_static_figures_match_published_chart_records(self):
        for suffix in ("", ".en"):
            with self.subTest(language=suffix):
                data = json.loads((ROOT / "gallery/research/assets/sleep/data.json").read_text())["DATA"]
                records = data["scatter"]
                overall = statistics.mean(row["quality"] for row in records)
                nontravel = [row for row in records if "travel" not in row["tags"]]
                groups = {"all": records, "nontravel": nontravel}
                for year in (2019, 2020, 2021):
                    groups[str(year)] = [row for row in records if row["year"] == year]
                html = (ROOT / f"gallery/research/sleep-2016-2026{suffix}.html").read_text()
                parser = EvidenceRows()
                parser.feed(html)
                self.assertEqual(set(parser.rows), {f"score-{group}" for group in groups})
                for group, rows in groups.items():
                    cells = parser.rows[f"score-{group}"]
                    self.assertEqual(cells[1], f"{len(rows):,}")
                    self.assertEqual(cells[2], f"{statistics.mean(row['quality'] for row in rows):.1f}%")
                # Later typography keeps published hero figures (currently 83.2% / 7.1h).
                # The evidence table above is the contract for record-weighted scatter means.
                hero = html.split('class="hero-stats"', 1)[1].split('class="hero-actions"', 1)[0]
                self.assertIn("3,656", hero)
                self.assertRegex(hero, r'class="hero-stat-num">\d+(?:\.\d+)?%</span>')
                self.assertRegex(hero, r'class="hero-stat-num">\d+(?:\.\d+)?h</span>')
                self.assertEqual(max(data["yearly_summary"], key=lambda year: data["yearly_summary"][year]["quality_mean"]), "2020")


if __name__ == "__main__":
    unittest.main()
