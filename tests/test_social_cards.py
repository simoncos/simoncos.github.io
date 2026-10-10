"""Every published, site-owned work must share its own decodable artwork."""
import json
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Metadata(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.meta = {}
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        if tag == 'meta':
            attrs = dict(attrs)
            self.meta[attrs.get('property', attrs.get('name'))] = attrs.get('content')


class SocialCards(unittest.TestCase):
    def test_published_local_works_have_individual_images(self):
        works = json.loads((ROOT / 'data/site.json').read_text())['works']
        for work in works:
            href = work.get('href')
            paths = href.values() if isinstance(href, dict) else [href]
            for path in paths:
                if not path or urlsplit(path).netloc:
                    continue
                with self.subTest(work=work['id'], page=path):
                    meta = Metadata(ROOT / path).meta
                    image = meta['og:image']
                    self.assertEqual(image, meta['twitter:image'])
                    self.assertEqual(meta['twitter:card'], 'summary_large_image')
                    self.assertNotIn('og-default', image)
                    self.assertNotIn('og-site-', image)
                    self.assertNotIn('og-work-', image)
                    asset = ROOT / urlsplit(image).path.lstrip('/')
                    self.assertTrue(asset.is_file())
                    self.assertIn(asset.suffix, ('.jpg', '.jpeg', '.png', '.gif'))
                    header = asset.read_bytes()[:8]
                    self.assertTrue(header.startswith((b'\xff\xd8\xff', b'\x89PNG', b'GIF8')))

    def test_work_index_has_its_own_card(self):
        meta = Metadata(ROOT / 'gallery.html').meta
        self.assertIn('og-work-v2.jpg', meta['og:image'])
        self.assertEqual(meta['og:image'], meta['twitter:image'])


if __name__ == '__main__':
    unittest.main()
