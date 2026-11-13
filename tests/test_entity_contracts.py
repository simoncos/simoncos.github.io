"""Credits and dates must agree across what readers see and machines receive."""

import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import site_entities as entities
import sync_discovery as discovery


def document(path):
    return BeautifulSoup((ROOT / path).read_text(encoding="utf-8"), "html.parser")


def graph(soup):
    scripts = soup.select('script[type="application/ld+json"]')
    if len(scripts) != 1:
        raise AssertionError(f"Expected one JSON-LD block, got {len(scripts)}")
    data = json.loads(scripts[0].string)
    if data.get("@context") != "https://schema.org":
        raise AssertionError("Unexpected JSON-LD context")
    return data.get("@graph", [data])


class EntityContracts(unittest.TestCase):
    def test_profile_identity_matches_visible_name_and_contact_links(self):
        soup = document("about.html")
        nodes = graph(soup)
        person = next(node for node in nodes if node["@type"] == "Person")
        profile = next(node for node in nodes if node["@type"] == "ProfilePage")
        self.assertEqual(profile["mainEntity"]["@id"], person["@id"])
        self.assertIn(person["name"], soup.select_one(".about-who").get_text())
        for name in person["alternateName"]:
            self.assertIn(name, soup.get_text())
        links = {a.get("href") for a in soup.select("a[href]")}
        self.assertTrue(set(person["sameAs"]) <= links)
        self.assertNotIn("jobTitle", person)
        home = graph(document("index.html"))[0]
        self.assertEqual(profile["isPartOf"]["@id"], home["@id"])

    def test_all_articles_have_visible_credits_and_source_dates(self):
        index = json.loads((ROOT / "data/article_index.json").read_text())
        sitemap = ET.parse(ROOT / "sitemap.xml")
        ns = {"sm": discovery.NS}
        sitemap_dates = {row.findtext("sm:loc", namespaces=ns): row.findtext("sm:lastmod", namespaces=ns)
                         for row in sitemap.findall("sm:url", ns)}
        ai_only = set()
        for group in index["groups"]:
            for language, entry in group["languages"].items():
                with self.subTest(article=entry["file"]):
                    soup = document("blogs/" + entry["file"])
                    nodes = graph(soup)
                    article = next(node for node in nodes if node["@type"] == "BlogPosting")
                    url = soup.select_one('link[rel="canonical"]')["href"]
                    self.assertEqual(article["url"], url)
                    self.assertEqual(article["mainEntityOfPage"], url)
                    self.assertEqual(article["headline"], soup.h1.get_text())
                    self.assertEqual(article["inLanguage"], soup.html["lang"])
                    metadata = (ROOT / "blogs" / entry["markdown"]).read_text().split("\n---\n", 1)[0]
                    dates = dict(re.findall(r"^(date|updated): (\S+)$", metadata, re.M))
                    self.assertEqual(article["dateCreated"], dates["date"])
                    self.assertEqual(article["dateModified"], dates.get("updated", dates["date"]))
                    self.assertEqual(entry["updated"], article["dateModified"])
                    self.assertEqual(sitemap_dates[url], article["dateModified"])
                    self.assertNotIn("datePublished", article)
                    visible = soup.select_one(".article-meta")
                    self.assertEqual([time["datetime"] for time in visible.select("time")],
                                     [article["dateCreated"], article["dateModified"]])
                    credit_names = []
                    for credit in entry["credits"]:
                        self.assertIn(credit["label"], visible.get_text())
                        self.assertIn(credit["name"], visible.get_text())
                        self.assertIn(credit["name"], article["creditText"])
                        if credit["role"] in ("author", "narrator"):
                            credit_names.append(credit["name"])
                    self.assertEqual(soup.select_one('meta[name="author"]')["content"], ", ".join(credit_names))
                    people = [node for node in nodes if node["@type"] == "Person"]
                    if any(credit["kind"] == "person" for credit in entry["credits"]):
                        self.assertEqual(len(people), 1)
                        self.assertEqual(article["author"]["@id"], people[0]["@id"])
                        self.assertIn(people[0]["name"], visible.select_one('a[rel="author"]').get_text())
                    else:
                        ai_only.add(group["id"])
                        self.assertEqual(people, [])
                        self.assertNotIn("author", article)
        self.assertEqual(ai_only, {"emerging-from-abyss", "a-bird-across-models"})

    def test_json_ld_titles_cannot_close_script_or_inject_markup(self):
        malicious = {'headline': '</script><img src=x onerror="alert(1)"> & \u2028'}
        rendered = entities.render_json_ld(malicious)
        soup = BeautifulSoup(rendered, "html.parser")
        self.assertIsNone(soup.img)
        self.assertEqual(len(soup.select("script")), 1)
        self.assertEqual(json.loads(soup.script.string), malicious)

    def test_ai_cannot_acquire_a_human_author_role(self):
        source = {"default": [{"id": "redpiggy", "role": "author"}],
                  "agents": {"redpiggy": {"name": "RedPiggy"}}, "articles": {}}
        with self.assertRaises(ValueError):
            entities.article_credits("essay", "en", source=source)

    def test_article_date_sync_leaves_unrelated_research_dates_and_urls_intact(self):
        source = f'<urlset xmlns="{discovery.NS}"><url><loc>https://example.org/research.html</loc>' \
                 '<lastmod>2020-01-01</lastmod></url><url><loc>https://example.org/blogs/essay.html</loc>' \
                 '<lastmod>2016-01-01</lastmod></url></urlset>'
        rendered = discovery.render_sitemap(source, {"https://example.org/blogs/essay.html": "2026-10-04"})
        self.assertEqual(discovery.render_sitemap(rendered, {"https://example.org/blogs/essay.html": "2026-10-04"}), rendered)
        root = ET.fromstring(rendered)
        values = {row.findtext(f"{{{discovery.NS}}}loc"): row.findtext(f"{{{discovery.NS}}}lastmod") for row in root}
        self.assertEqual(values["https://example.org/research.html"], "2020-01-01")
        self.assertEqual(len(values), 2)

    def test_discovery_identity_and_exception_credits_match_articles(self):
        index = json.loads((ROOT / "data/article_index.json").read_text())
        agents = json.loads((ROOT / "agent-index.json").read_text())
        owner = next(node for node in graph(document("about.html")) if node["@type"] == "Person")
        self.assertEqual(agents["identity"], owner)
        exceptions = entities.load_credits()["articles"]
        self.assertEqual(set(agents["article_credits"]), set(exceptions))
        groups = {group["id"]: group for group in index["groups"]}
        for group_id in exceptions:
            for language, credits in agents["article_credits"][group_id].items():
                self.assertEqual(credits, groups[group_id]["languages"][language]["credits"])
        llms = (ROOT / "llms.txt").read_text()
        self.assertIn(owner["name"], llms)
        self.assertIn("RedPiggy is an AI agent", llms)


if __name__ == "__main__":
    unittest.main()
