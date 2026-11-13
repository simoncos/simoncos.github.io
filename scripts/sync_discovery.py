#!/usr/bin/env python3
"""Keep article sitemap dates and public identity discovery in sync.

Article dates and credits come from the generated article index. Other sitemap
entries and the curated discovery map remain explicitly maintained.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

from site_entities import credit_text, load_credits, person
from site_languages import SECTIONS, canonical_url, section_path

ROOT = Path(__file__).resolve().parents[1]
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
START = "<!-- site-identity:start -->"
END = "<!-- site-identity:end -->"


def sitemap_dates(index: dict, site_url: str) -> dict[str, str]:
    dates = {}
    for group in index["groups"]:
        for entry in group["languages"].values():
            revision = entry.get("updated") or group["date"]
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", revision):
                raise ValueError(f"{entry['file']}: invalid article revision date {revision!r}")
            dates[f"{site_url.rstrip('/')}/blogs/{entry['file']}"] = revision
    return dates


def render_sitemap(text: str, dates: dict[str, str]) -> str:
    """Update articles without stamping unrelated research/projects with today."""
    ET.register_namespace("", NS)
    root = ET.fromstring(text)
    seen = set()
    for row in root.findall(f"{{{NS}}}url"):
        url = row.findtext(f"{{{NS}}}loc")
        if url not in dates:
            continue
        if url in seen:
            raise ValueError(f"Duplicate sitemap URL: {url}")
        seen.add(url)
        lastmod = row.find(f"{{{NS}}}lastmod")
        if lastmod is None:
            lastmod = ET.SubElement(row, f"{{{NS}}}lastmod")
        lastmod.text = dates[url]
    for url in sorted(dates.keys() - seen):
        row = ET.SubElement(root, f"{{{NS}}}url")
        ET.SubElement(row, f"{{{NS}}}loc").text = url
        ET.SubElement(row, f"{{{NS}}}lastmod").text = dates[url]
    ET.indent(root, space="  ")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding="unicode") + "\n"


def identity_block(owner: dict, index: dict) -> str:
    groups = {group["id"]: group for group in index["groups"]}
    lines = [START, "## Authorship and dates", "",
             f"- [{owner['name']} ({owner['alternateName'][0]}) · {owner['alternateName'][1]}]({owner['url']}): the site's owner and the author of articles unless a different credit is shown."]
    for group_id in load_credits()["articles"]:
        group = groups[group_id]
        entry = group["languages"].get("en") or group["languages"]["zh"]
        url = owner["url"].rsplit("/", 1)[0] + "/blogs/" + entry["file"]
        lines.append(f"- [{entry['title']}]({url}): {credit_text(entry['credits'])}.")
    lines += ["- RedPiggy is an AI agent. AI narration and collaboration credits do not identify a human author.",
              "- Article Created dates indicate when writing was completed; Updated dates indicate a site revision. Do not infer a first-publication date from Created.",
              END]
    return "\n".join(lines)


def render_llms(text: str, block: str, owner: dict) -> str:
    text = text.replace("simoncos / Che ZHAO", f"simoncos / {owner['name']}")
    if START in text:
        if text.count(START) != 1 or text.count(END) != 1:
            raise ValueError("llms.txt: identity markers must occur exactly once")
        return re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.S)
    if END in text:
        raise ValueError("llms.txt: unmatched identity marker")
    if "\n## Start here\n" not in text:
        raise ValueError("llms.txt: missing identity insertion point")
    return text.replace("\n## Start here\n", f"\n{block}\n\n## Start here\n", 1)


def build() -> dict[str, str]:
    config = json.loads((ROOT / "data/site_shell.json").read_text())
    site = json.loads((ROOT / "data/site.json").read_text())
    index = json.loads((ROOT / "data/article_index.json").read_text())
    owner = person(config, site)
    agent_index = json.loads((ROOT / "agent-index.json").read_text())
    agent_index["site"]["owner"] = f"simoncos / {owner['name']}"
    agent_index["identity"] = owner
    agent_index["article_credits"] = {
        group["id"]: {language: entry["credits"] for language, entry in group["languages"].items()}
        for group in index["groups"] if group["id"] in load_credits()["articles"]
    }
    agent_index["site"]["last_updated"] = config["site_updated"]
    work_index = [{"id":work['id'], "type":work['work_topic'], "title":work['title'],
                   "state":work.get('state') or ('public_entry' if work.get('href') else 'in_progress'),
                   "date":work['date'], "url":work.get('href'),
                   "language_mode":"Chinese only" if work.get('zh_only') else "single URL" if work.get('single') else "language pair"}
                  for work in site['works']]
    agent_index['works'] = work_index
    toolkit = next(project for project in site['projects'] if project['id']=='sleep-toolkit')
    work_map = {work['id']:work for work in site['works']}
    for surface in agent_index['current_surfaces']:
        work_id = {'sleep-research':'sleep','hn-llm-research':'hn-llm-research'}.get(surface['id'])
        if work_id:
            surface['description'] = work_map[work_id]['desc']['en']
        if surface['id']=='sleep-toolkit':
            surface['description'] = toolkit['availability_note']['en']
            surface['availability'] = {'state':'unavailable','checked':'2026-10-05','http_status':404}
    agent_index['reading_companions'] = [{'id':item['id'],'title':item['title'],
          'languages':{lang:config['site_url'].rstrip('/')+f'/topics/{item["id"]}{".en" if lang=="en" else ""}.html' for lang in ('en','zh')}}
          for item in json.loads((ROOT/'data/topic_readers.json').read_text())['readers']]
    agent_index['language_policy']['english_page_pattern'] = 'Articles/research/toolkit/topic readers: *.en.html; core sections: existing *.html URLs.'
    agent_index['language_policy']['chinese_page_pattern'] = 'Articles/research/toolkit/topic readers: *.html; core sections: *.zh.html.'
    agent_index["language_policy"]["section_pages"] = "Index, Articles, Work and About have independent documents: existing .html URLs are English; .zh.html URLs are Chinese. Favorites keeps bilingual controls and Chinese reviews. Legacy ?lang= and saved language choices remain supported."
    for entry in agent_index["entrypoints"]:
        path = {"home": "index.html", "articles": "blogs.html", "work": "gallery.html", "about": "about.html"}.get(entry["id"])
        if path:
            entry["languages"] = {lang: canonical_url(config["site_url"], section_path(path, lang)) for lang in ("en", "zh")}
    dates = sitemap_dates(index, config["site_url"])
    for path, revision in site.get("page_revisions", {}).items():
        dates[canonical_url(config["site_url"], path)] = revision
        if path in SECTIONS:
            dates[canonical_url(config["site_url"], section_path(path, "zh"))] = revision
    llms = (ROOT / "llms.txt").read_text()
    for surface_id in ('sleep-toolkit','sleep-research','hn-llm-research'):
        surface=next(item for item in agent_index['current_surfaces'] if item['id']==surface_id)
        url=surface['url'].rstrip('/')
        llms=re.sub(r'(?m)^(\- \[[^\n]+\]\('+re.escape(url)+r'/?\): )[^\n]+$',
                    lambda match:match[1]+surface['description'],llms)
    llms = llms.replace("Section pages carry both languages in the HTML and switch with `?lang=zh`.",
                        "Index, Articles, Work and About have independent English documents at their existing URLs and Chinese documents ending in `.zh.html`. Favorites retains bilingual controls and Chinese titles/reviews. Legacy `?lang=zh` links and saved language choices remain compatible.")
    companion_block='<!-- reading-companions:start -->\n## Reading companions\n\n'+ '\n'.join(
        f'- [{item["title"]["en"]}]({item["languages"]["en"]}) · [中文]({item["languages"]["zh"]})'
        for item in agent_index['reading_companions'])+'\n<!-- reading-companions:end -->'
    if '<!-- reading-companions:start -->' in llms:
        llms=re.sub(r'<!-- reading-companions:start -->.*?<!-- reading-companions:end -->',lambda _:companion_block,llms,flags=re.S)
    else:llms=llms.rstrip()+'\n\n'+companion_block+'\n'
    return {
        "sitemap.xml": render_sitemap((ROOT / "sitemap.xml").read_text(), dates),
        "agent-index.json": json.dumps(agent_index, ensure_ascii=False, indent=2) + "\n",
        "llms.txt": render_llms(llms, identity_block(owner, index), owner),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    stale = []
    for rel_path, output in build().items():
        path = ROOT / rel_path
        if path.read_text(encoding="utf-8") != output:
            stale.append(rel_path)
            if not args.check:
                path.write_text(output, encoding="utf-8")
    if args.check and stale:
        print("Discovery files are out of date: " + ", ".join(stale))
        print("Run: python3 scripts/sync_discovery.py")
        return 1
    print("Discovery files are current." if not stale else "Updated: " + ", ".join(stale))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
