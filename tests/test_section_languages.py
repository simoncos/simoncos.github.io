"""Search and no-JS readers receive the language named by each section URL."""
import json
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from site_languages import SECTIONS, canonical_url, language_document, localized_href, section_path


class SectionLanguages(unittest.TestCase):
    def test_pairs_have_real_reciprocal_documents_and_matching_head_language(self):
        locations = {row.text for row in ET.parse(ROOT / 'sitemap.xml').findall('.//{*}loc')}
        for base in SECTIONS:
            for language in ('en', 'zh'):
                path = section_path(base, language)
                with self.subTest(page=path):
                    soup = BeautifulSoup((ROOT / path).read_text(), 'html.parser')
                    self.assertEqual(soup.html['lang'], 'en' if language == 'en' else 'zh-Hans')
                    self.assertEqual(soup.html['data-page-lang'], language)
                    self.assertEqual({node['data-l'] for node in soup.select('[data-l]')}, {language})
                    self.assertFalse(soup.select('[data-i18n]'))
                    expected = canonical_url('https://simoncos.github.io', path)
                    self.assertEqual(soup.select_one('link[rel="canonical"]')['href'], expected)
                    self.assertEqual(soup.select_one('meta[property="og:url"]')['content'], expected)
                    self.assertIn(expected, locations)
                    alternate = {node['hreflang']: node['href'] for node in soup.select('link[hreflang]') if node['hreflang'] != 'x-default'}
                    self.assertEqual(alternate, {('zh-Hans' if lang == 'zh' else 'en'):
                                     canonical_url('https://simoncos.github.io', section_path(base, lang))
                                     for lang in ('en', 'zh')})
                    peer = section_path(base, 'zh' if language == 'en' else 'en')
                    self.assertEqual(soup.select_one('[data-lang-peer]')['href'], peer)
                    self.assertTrue(soup.title.get_text().strip())
                    self.assertTrue(soup.select_one('meta[name="description"]')['content'].strip())
                    if language == 'zh':
                        self.assertRegex(soup.title.get_text(), '[\u4e00-\u9fff]')
                        self.assertRegex(soup.select_one('meta[name="description"]')['content'], '[\u4e00-\u9fff]')

    def test_localization_preserves_nested_markup_script_entities_and_void_elements(self):
        source = '<!doctype html><html><head><title data-zh="中文 &amp; 标题">English</title></head><body>' \
                 '<span data-l="en"><b>English</b><br></span><span data-l="zh">中文 &amp; &#38;<br></span>' \
                 '<a href="blogs.html?q=a%26b#topics" data-i18n="title" title="Read" data-zh-title="阅读">Go</a>' \
                 '<script>const x = {"a":"<tag>&text"};</script><!-- keep --></body></html>'
        result = language_document(source, 'zh')
        self.assertNotIn('<b>English', result)
        self.assertIn('中文 &amp; &#38;<br>', result)
        self.assertIn('<title>中文 &amp; 标题</title>', result)
        self.assertIn('blogs.zh.html?q=a%26b#topics', result)
        self.assertIn('title="阅读"', result)
        self.assertIn('<script>const x = {"a":"<tag>&text"};</script><!-- keep -->', result)

    def test_href_selection_preserves_queries_and_fragments_without_rewriting_other_sites(self):
        self.assertEqual(localized_href('../gallery.html?view=x&lang=zh#research/sleep', 'en'),
                         '../gallery.zh.html?view=x#research/sleep')
        for href in ('https://example.org/blogs.html', '#main', 'blogs/article.html?q=x', '../gallery/talks/pkm-2026-06-07/index.html'):
            self.assertEqual(localized_href(href, 'zh'), href)

    def test_profiles_share_person_but_describe_their_own_document(self):
        for language in ('en', 'zh'):
            path = section_path('about.html', language)
            soup = BeautifulSoup((ROOT / path).read_text(), 'html.parser')
            nodes = json.loads(soup.select_one('script[type="application/ld+json"]').string)['@graph']
            profile = next(node for node in nodes if node['@type'] == 'ProfilePage')
            self.assertEqual(profile['url'], canonical_url('https://simoncos.github.io', path))
            self.assertEqual(profile['inLanguage'], soup.html['lang'])
            self.assertEqual(profile['mainEntity']['@id'], 'https://simoncos.github.io/about.html#person')

    def test_featured_sleep_opens_the_report_in_each_language(self):
        for language, target in (('en', 'gallery/research/sleep-2016-2026.en.html'),
                                 ('zh', 'gallery/research/sleep-2016-2026.html')):
            soup = BeautifulSoup((ROOT / section_path('index.html', language)).read_text(), 'html.parser')
            self.assertEqual(soup.select_one('a.panel')['href'], target)

    def test_lola_pages_have_localized_body_and_reciprocal_metadata(self):
        origin = "https://simoncos.github.io"
        locations = {row.text for row in ET.parse(ROOT / "sitemap.xml").findall(".//{*}loc")}
        for slug in ("lola-draft", "lola-matchups"):
            links = {lang: f"{origin}/gallery/research/{slug}{suffix}.html"
                     for lang, suffix in (("en", ""), ("zh-Hans", ".zh"))}
            for lang, url in links.items():
                with self.subTest(slug=slug, lang=lang):
                    doc = BeautifulSoup((ROOT / url.removeprefix(origin + "/")).read_text(), "html.parser")
                    self.assertEqual(doc.html["lang"], lang)
                    self.assertEqual(doc.select_one("link[rel=canonical]")["href"], url)
                    self.assertEqual(doc.select_one('meta[property="og:url"]')["content"], url)
                    self.assertEqual({ln["hreflang"]: ln["href"] for ln in doc.head.select("link[hreflang]")},
                                     {**links, "x-default": links["en"]})
                    self.assertIn(url, locations)
                    if lang == "zh-Hans":
                        for key in ("h1", "#absList", ".foot-h"):
                            self.assertRegex(doc.select_one(key).get_text(), r"[\u4e00-\u9fff]")

    def test_lola_chinese_chart_captions_are_present_without_scripts(self):
        snippets = {
            "lola-draft": {
                "#coneNote": ("出场不少于 200 次", "超出运气范围"),
                "#matrixCap": ("8,128 个英雄组合",),
            },
            "lola-matchups": {
                "#netCap": ("段位指", "37,065"),
                "#netLegend": ("上单", "箭头"),
                "#varCap": ("经验贝叶斯", "18,002"),
                "#valCap": ("加权最小二乘拟合", "0.91 ± 0.02"),
            },
        }
        for slug, chart_text in snippets.items():
            with self.subTest(slug=slug):
                doc = BeautifulSoup((ROOT / f"gallery/research/{slug}.zh.html").read_text(), "html.parser")
                captions = doc.select("main figcaption")
                self.assertTrue(captions)
                for caption in captions:
                    self.assertRegex(caption.get_text(), r"[一-鿿]")
                for selector, phrases in chart_text.items():
                    text = doc.select_one(selector).get_text(" ", strip=True)
                    for phrase in phrases:
                        self.assertIn(phrase, text)

    def test_film_search_matches_both_scripts_with_one_disclosure_button(self):
        doc = BeautifulSoup((ROOT / "blogs.zh.html").read_text(), "html.parser")
        for slug in ("void-flower", "void-flower-making-of"):
            row = doc.select_one(f"#a-{slug}")
            self.assertIn("虛無之花", row["data-search"])
            self.assertIn("虚无之花", row["data-search"])
            self.assertEqual(len(row.select("button[aria-controls]")), 1)
            self.assertEqual(row.select_one(".arow-toggle")["aria-hidden"], "true")


if __name__ == '__main__':
    unittest.main()
