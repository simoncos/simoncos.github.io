"""Contact / follow block at the end of article and work piece pages."""

from __future__ import annotations

import json
from typing import Any

from page_common import href_attrs, pick
from site_shell import ROOT, bi, esc, i18n_attrs, prefixed

_LABELS = {
    "en": {"follow": "Follow along:", "email": "Email", "aria": "Contact and follow"},
    "zh": {"follow": "保持联系：", "email": "邮件", "aria": "联系与订阅"},
}

_SOCIAL_ORDER = ("GitHub", "LinkedIn", "X")


def load_about() -> dict[str, Any]:
    return json.loads((ROOT / "data/site.json").read_text(encoding="utf-8"))["about"]


def _follow_label(lang: str | None) -> str:
    if lang in _LABELS:
        return esc(_LABELS[lang]["follow"])
    return bi(_LABELS["en"]["follow"], _LABELS["zh"]["follow"])


def _email_label(lang: str | None, email: str) -> str:
    label = esc(_LABELS[lang]["email"]) if lang in _LABELS else bi(_LABELS["en"]["email"], _LABELS["zh"]["email"])
    return f'<a href="mailto:{esc(email)}">{label}</a>'


def _rss_links(about: dict[str, Any], asset_prefix: str, lang: str | None) -> list[str]:
    rss = next((item for item in about["contacts"] if item["k"] == "RSS"), None)
    if not rss:
        return []
    href = rss["href"]
    if lang == "en":
        return [f'<a href="{prefixed(asset_prefix, pick(href, "en"))}">RSS EN</a>']
    if lang == "zh":
        return [
            f'<a href="{prefixed(asset_prefix, pick(href, "zh"))}">RSS <span lang="zh-Hans">中文</span></a>'
        ]
    return [
        f'<a href="{prefixed(asset_prefix, pick(href, "zh"))}">RSS <span lang="zh-Hans">中文</span></a>',
        f'<a href="{prefixed(asset_prefix, pick(href, "en"))}">RSS EN</a>',
    ]


def _social_links(about: dict[str, Any], asset_prefix: str, lang: str | None) -> list[str]:
    by_key = {item["k"]: item for item in about["contacts"]}
    links = []
    for key in _SOCIAL_ORDER:
        contact = by_key.get(key)
        if not contact:
            continue
        if lang:
            target = pick(contact["href"], lang)
            if not target.startswith(("http://", "https://", "mailto:", "#")):
                target = prefixed(asset_prefix, target)
            links.append(f'<a href="{esc(target)}">{esc(key)}</a>')
        else:
            links.append(
                f'<a{href_attrs(contact["href"], prefix=asset_prefix)}>{esc(key)}</a>'
            )
    links.append(_email_label(lang, about["email"]))
    return links


def render_piece_contact_foot(
    asset_prefix: str = "",
    lang: str | None = None,
    about: dict[str, Any] | None = None,
) -> str:
    """RSS plus follow links from about.contacts / email (godobject-style piece foot)."""
    about = about or load_about()
    sep = '<span class="piece-contact-sep" aria-hidden="true">·</span>'
    chunks: list[str] = []
    for index, link in enumerate(_rss_links(about, asset_prefix, lang)):
        if index:
            chunks.append(sep)
        chunks.append(link)
    if chunks:
        chunks.append(sep)
    chunks.append(f'<span class="piece-contact-label k">{_follow_label(lang)}</span>')
    for link in _social_links(about, asset_prefix, lang):
        chunks.append(sep)
        chunks.append(link)
    inner = "".join(chunks)
    return (
        f'<footer class="piece-contact"{i18n_attrs(aria_label=(_LABELS["en"]["aria"], _LABELS["zh"]["aria"]))}>'
        f'<p class="piece-contact-line">{inner}</p></footer>'
    )
