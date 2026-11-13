"""Public identity and article credits, shared by HTML and discovery files.

The owner's facts come from the About source, not from a second biography.
AI credits remain text: an agent is neither a Person nor an Organization.
"""

from __future__ import annotations

import json
from functools import lru_cache
from html import escape
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


@lru_cache(maxsize=1)
def load_site() -> dict[str, Any]:
    return json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_credits() -> dict[str, Any]:
    return json.loads((ROOT / "data/article_credits.json").read_text(encoding="utf-8"))


def origin(config: dict[str, Any]) -> str:
    return config["site_url"].rstrip("/")


def about_name(site: dict[str, Any], language: str) -> str:
    about = site["about"]
    identity = about["identity"]
    return " · ".join((identity["name"], about["native_name"]["text"], identity["location"][language]))


def person(config: dict[str, Any], site: dict[str, Any] | None = None) -> dict[str, Any]:
    about = (site or load_site())["about"]
    identity = about["identity"]
    url = f"{origin(config)}/about.html"
    return {
        "@type": "Person",
        "@id": f"{url}#person",
        "name": identity["name"],
        "alternateName": [about["native_name"]["text"], identity["handle"]],
        "url": url,
        "sameAs": [contact["href"] for contact in about["contacts"]
                   if isinstance(contact["href"], str) and contact["href"].startswith("https://")],
    }


def website(config: dict[str, Any], site: dict[str, Any] | None = None) -> dict[str, Any]:
    identity = (site or load_site())["about"]["identity"]
    return {
        "@type": "WebSite",
        "@id": f"{origin(config)}/#website",
        "url": f"{origin(config)}/",
        "name": identity["handle"],
        "inLanguage": ["en", "zh-Hans"],
    }


def profile_graph(config: dict[str, Any], site: dict[str, Any], *, language: str = "en", path: str = "about.html") -> dict[str, Any]:
    owner = person(config, site)
    url = f"{origin(config)}/{path}"
    page = {
        "@type": "ProfilePage",
        "@id": f"{url}#profile",
        "url": url,
        "name": f"{'关于' if language == 'zh' else 'About'} · {site['about']['identity']['handle']}",
        "mainEntity": {"@id": owner["@id"]},
        "isPartOf": {"@id": website(config, site)["@id"]},
        "inLanguage": "zh-Hans" if language == "zh" else "en",
    }
    return {"@context": "https://schema.org", "@graph": [page, owner, website(config, site)]}


def render_json_ld(value: dict[str, Any]) -> str:
    # HTML parsing ends a script at </script>, even in a JSON string. Escaping
    # markup delimiters keeps quotes, titles and future credits inert.
    payload = json.dumps(value, ensure_ascii=False, indent=2)
    for char, escaped in (("&", "\\u0026"), ("<", "\\u003c"), (">", "\\u003e"),
                          ("\u2028", "\\u2028"), ("\u2029", "\\u2029")):
        payload = payload.replace(char, escaped)
    return f'    <script type="application/ld+json">\n{payload}\n    </script>'


def work_collection(config: dict[str, Any], site: dict[str, Any], language: str, path: str) -> dict[str, Any]:
    # A link in the collection describes a public entry, not a completed or
    # clinically validated product. Unlinked work remains visibly in progress.
    entries = []
    for work in site['works']:
        href = work.get('href')
        if not href:
            continue
        target = href[language] if isinstance(href, dict) else href
        url = target if target.startswith('https://') else f'{origin(config)}/{target}'
        entries.append({'@type':'ListItem', 'position':len(entries)+1, 'name':work['title'][language], 'url':url})
    return {'@context':'https://schema.org', '@type':'CollectionPage', 'url':f'{origin(config)}/{path}',
            'name':f'{"Work" if language=="en" else "作品"} · simoncos',
            'inLanguage':'en' if language=='en' else 'zh-Hans',
            'mainEntity':{'@type':'ItemList','itemListElement':entries}}


ROLE_LABELS = {
    "author": {"en": "Author", "zh": "作者"},
    "narrator": {"en": "AI narration", "zh": "AI 自述"},
    "collaboration": {"en": "AI collaboration", "zh": "AI 协作"},
}


def article_credits(group_id: str, language: str,
                    source: dict[str, Any] | None = None,
                    site: dict[str, Any] | None = None) -> list[dict[str, str]]:
    source = source or load_credits()
    site = site or load_site()
    credits = source["articles"].get(group_id, source["default"])
    result = []
    for credit in credits:
        credit_id, role = credit["id"], credit["role"]
        if credit_id == "owner":
            if role != "author":
                raise ValueError("The owner credit must describe the actual author role")
            name = site["about"]["identity"]["name"]
            kind = "person"
        else:
            agent = source["agents"][credit_id]
            if role not in ("narrator", "collaboration"):
                raise ValueError("AI agents must have an explicit AI credit role")
            name, kind = agent["name"], "ai_agent"
        result.append({"id": credit_id, "role": role, "label": ROLE_LABELS[role][language],
                       "name": name, "kind": kind})
    return result


def credit_text(credits: list[dict[str, str]]) -> str:
    return "; ".join(f"{row['label']}: {row['name']}" for row in credits)


def credit_html(credit: dict[str, str], language: str) -> str:
    name = escape(credit["name"])
    if credit["kind"] == "person":
        return f'<a href="../about.html?lang={language}" rel="author">{name}</a>'
    return f'<span>{name}</span>'


def article_graph(config: dict[str, Any], *, url: str, title: str, description: str,
                  language: str, created: str, updated: str,
                  credits: list[dict[str, str]], image: str | None = None,
                  translation: str = "") -> dict[str, Any]:
    article = {
        "@type": "BlogPosting",
        "@id": f"{url}#article",
        "url": url,
        "mainEntityOfPage": url,
        "headline": title,
        "description": description,
        "inLanguage": "zh-Hans" if language == "zh" else "en",
        # date is completion of writing; first publication is not established.
        "dateCreated": created,
        "dateModified": updated,
        "isPartOf": {"@id": website(config)["@id"]},
        "creditText": credit_text(credits),
    }
    graph = [article, website(config)]
    if any(credit["kind"] == "person" and credit["role"] == "author" for credit in credits):
        owner = person(config)
        article["author"] = {"@id": owner["@id"]}
        graph.append(owner)
    if image:
        article["image"] = image
    if translation:
        label = "翻译" if language == "zh" else "Translation"
        article["creditText"] += f"; {label}: {translation}"
    return {"@context": "https://schema.org", "@graph": graph}
