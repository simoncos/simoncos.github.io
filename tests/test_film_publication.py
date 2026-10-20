"""The screening and both essays expose the same film, before the prose."""
import json
import sys
import unittest
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from article_media import build_og_image, og_fallback_image


class FilmPublicationTests(unittest.TestCase):
    def test_three_pages_embed_the_selected_video(self):
        for path in ("gallery/film/void-flower.html", "blogs/void-flower-making-of.html",
                     "blogs/void-flower-making-of.en.html"):
            with self.subTest(path=path):
                page = BeautifulSoup((ROOT / path).read_text(), "html.parser")
                frames = page.select("main iframe")
                self.assertEqual(len(frames), 1)
                self.assertEqual(frames[0]["src"], "https://www.youtube-nocookie.com/embed/8evBsYyWCjM?playsinline=1")
                self.assertTrue(frames[0].has_attr("allowfullscreen"))
                self.assertEqual(frames[0]["referrerpolicy"], "strict-origin-when-cross-origin")
                self.assertTrue(frames[0]["title"])
                content = page.select_one(".post-content")
                if content:
                    self.assertEqual(content.find(recursive=False).get("class"), ["film-embed"])
                    self.assertIn("2026-10-20", page.select_one(".article-meta").text)

    def test_embedded_film_can_supply_its_share_poster(self):
        result = build_og_image('<iframe data-poster="../gallery/film/assets/void-flower-poster.jpg" '
                                'width="1920" height="1080" title="Flower of the Void"></iframe>', "Essay")
        self.assertEqual(result["url"], "https://simoncos.github.io/gallery/film/assets/void-flower-poster.jpg")
        self.assertEqual(result["alt"], "Flower of the Void")

    def test_invalid_embedded_poster_falls_back(self):
        for dimensions in ('width="100%" height="auto"', 'width="200" height="100"'):
            self.assertEqual(build_og_image(f'<iframe data-poster="poster.jpg" {dimensions}></iframe>', "Essay"),
                             og_fallback_image())

    def test_screening_metadata_identifies_the_video(self):
        page = BeautifulSoup((ROOT / "gallery/film/void-flower.html").read_text(), "html.parser")
        data = json.loads(page.select_one('script[type="application/ld+json"]').string)
        self.assertEqual(data["@type"], "VideoObject")
        self.assertEqual(data["embedUrl"], "https://www.youtube-nocookie.com/embed/8evBsYyWCjM")
        self.assertEqual(data["uploadDate"], "2026-10-20")


if __name__ == "__main__":
    unittest.main()
