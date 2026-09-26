"""Shared page shell for the static site: head resources, header, footer.

Every generator that writes a page (update_site_shell.py for the hand-kept
templates, build_pages.py, update_favorites_pages.py, generate_blog_pages.py)
renders these blocks through this module, so the shell has one definition.
"""

from __future__ import annotations

import json
import re
from datetime import date
from html import escape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SHELL_CONFIG_PATH = ROOT / "data/site_shell.json"

RESOURCE_START = "site-shell:resources:start"
RESOURCE_END = "site-shell:resources:end"
HEADER_START = "site-shell:header:start"
HEADER_END = "site-shell:header:end"
FOOTER_START = "site-shell:footer:start"
FOOTER_END = "site-shell:footer:end"

FONTS_URL = (
    "https://fonts.googleapis.com/css2?family=Geist:wght@300..700"
    "&family=Noto+Sans+SC:wght@400;500;700&display=swap"
)

NAV = (
    ("home", "index.html", "Index", "首页"),
    ("articles", "blogs.html", "Articles", "文章"),
    ("work", "gallery.html", "Work", "作品"),
    ("favorites", "favorites.html", "Favorites", "收藏"),
    ("about", "about.html", "About", "关于"),
)

MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def load_config() -> dict[str, Any]:
    return json.loads(SHELL_CONFIG_PATH.read_text(encoding="utf-8"))


def page_config(config: dict[str, Any], rel_path: str) -> dict[str, Any]:
    for page in config.get("pages", []):
        if page.get("path") == rel_path:
            return page
    raise KeyError(f"data/site_shell.json: no page entry for {rel_path}")


def esc(value: Any) -> str:
    return escape(str(value), quote=True)


def bi(en: str, zh: str | None = None, *, raw: bool = False) -> str:
    """Both languages of one string; CSS shows the one matching data-lang.

    Identical strings are emitted once. `raw` marks already-escaped HTML.
    """
    zh = en if zh is None else zh
    en_html = en if raw else esc(en)
    zh_html = zh if raw else esc(zh)
    if en == zh:
        return en_html
    return f'<span data-l="en">{en_html}</span><span data-l="zh" lang="zh-Hans">{zh_html}</span>'


def lang_pair(value: Any) -> tuple[str, str]:
    """Read an {en, zh} object, or a plain string used for both."""
    if isinstance(value, dict):
        en = value.get("en", "")
        return en, value.get("zh", en)
    return str(value or ""), str(value or "")


def bi_value(value: Any) -> str:
    return bi(*lang_pair(value))


def i18n_attrs(**pairs: tuple[str, str]) -> str:
    """Attributes whose value differs by language, for site.js to swap."""
    names = []
    parts = []
    for name, (en, zh) in pairs.items():
        attr = name.replace("_", "-")
        parts.append(f' {attr}="{esc(en)}"')
        if zh != en:
            names.append(attr)
            parts.append(f' data-zh-{attr}="{esc(zh)}"')
    if names:
        parts.append(f' data-i18n="{" ".join(names)}"')
    return "".join(parts)


def parse_day(value: str) -> date:
    return date.fromisoformat(str(value)[:10])


def updated_label(value: str) -> tuple[str, str]:
    day = parse_day(value)
    return (
        f"Updated {MONTHS[day.month - 1]} {day.day}, {day.year}",
        f"更新于 {day.isoformat()}",
    )


def prefixed(asset_prefix: str, rel_path: str) -> str:
    normalized = rel_path.lstrip("/")
    if asset_prefix == "/":
        return f"/{normalized}"
    return f"{asset_prefix}{normalized}"


def render_attrs(attrs: dict[str, Any]) -> str:
    parts = []
    for name, value in attrs.items():
        if value is True:
            parts.append(f" {esc(name)}")
        elif value not in (False, None):
            parts.append(f' {esc(name)}="{esc(value)}"')
    return "".join(parts)


def render_script_tag(entry: dict[str, Any], asset_prefix: str, config: dict[str, Any]) -> str:
    if entry.get("external_src"):
        src = entry["external_src"]
    else:
        src = prefixed(asset_prefix, f"src/js/{entry['src']}") + f"?v={config['js_version']}"
    attrs: dict[str, Any] = {"src": src}
    if entry.get("defer"):
        attrs["defer"] = True
    attrs.update(entry.get("attrs") or {})
    return f"    <script{render_attrs(attrs)}></script>"


def render_resource_block(config: dict[str, Any], page: dict[str, Any]) -> str:
    asset_prefix = page.get("asset_prefix", "")
    icons = config["icons"]
    lines = [
        f"    <!-- {RESOURCE_START} -->",
        f'    <link rel="icon" type="image/png" sizes="32x32" href="{prefixed(asset_prefix, icons["favicon"])}">',
        f'    <link rel="apple-touch-icon" sizes="180x180" href="{prefixed(asset_prefix, icons["apple_touch_icon"])}">',
    ]

    if page.get("head_rss", True):
        for feed in config.get("rss_feeds", []):
            lines.append(
                '    <link rel="alternate" type="application/rss+xml" '
                f'title="{esc(feed["title"])}" href="{prefixed(asset_prefix, feed["href"])}">'
            )

    # Shell pages serve both languages from one URL via ?lang=, so the Chinese
    # variant needs to be declared or search engines only ever see English.
    # Pages kept as one file per language (the project boards) name both
    # files instead.
    site = config.get("site_url", "").rstrip("/")
    canonical = page.get("canonical")
    alternates = page.get("alternates")
    if alternates:
        for hreflang, rel in (("en", alternates["en"]), ("zh-Hans", alternates["zh"]), ("x-default", alternates["en"])):
            lines.append(f'    <link rel="alternate" hreflang="{hreflang}" href="{site}/{rel}">')
    elif canonical:
        base = f"{site}/{canonical.lstrip('/')}" if canonical != "index.html" else f"{site}/"
        for hreflang, href in (("en", base), ("zh-Hans", f"{base}?lang=zh"), ("x-default", base)):
            lines.append(f'    <link rel="alternate" hreflang="{hreflang}" href="{href}">')

    lines.extend([
        '    <link rel="preconnect" href="https://fonts.googleapis.com">',
        '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        f'    <noscript><link rel="stylesheet" href="{esc(FONTS_URL)}"></noscript>',
    ])

    theme_init = config.get("theme_init")
    if theme_init:
        src = prefixed(asset_prefix, f"src/js/{theme_init}") + f"?v={config['js_version']}"
        lines.append(f'    <script src="{src}"></script>')

    lines.append(
        f'    <link rel="stylesheet" href="{prefixed(asset_prefix, "src/css/styles.css")}?v={config["css_version"]}">'
    )
    for script in config["script_profiles"][page["script_profile"]]:
        entry = {"src": script} if isinstance(script, str) else script
        lines.append(render_script_tag(entry, asset_prefix, config))

    lines.append(f"    <!-- {RESOURCE_END} -->")
    return "\n".join(lines)


def render_lang_toggle(page: dict[str, Any]) -> str:
    label = '<span data-l="en" lang="zh-Hans">中文</span><span data-l="zh">EN</span>'
    pair = page.get("lang_pair")
    if pair:
        hreflang = "zh-Hans" if pair["lang"] == "zh" else "en"
        return (
            f'<a class="lang-btn" href="{esc(pair["href"])}" hreflang="{hreflang}" '
            f'data-lang-nav="{pair["lang"]}">{label}</a>'
        )
    if page.get("lang_toggle") == "article":
        # Articles are one language per file; the generator fills in the
        # translation's file name.
        return (
            '<a class="lang-btn" href="{{LANG_ALT_HREF}}" hreflang="{{LANG_ALT_HREFLANG}}" '
            f'data-lang-nav="{{{{LANG_ALT}}}}">{label}</a>'
        )
    return f'<a class="lang-btn" href="?lang=zh" data-lang-toggle>{label}</a>'


def render_header_block(config: dict[str, Any], page: dict[str, Any]) -> str:
    asset_prefix = page.get("asset_prefix", "")
    section = page.get("section")
    tabs = []
    sheet = []
    for number, (key, href, en, zh) in enumerate(NAV, start=1):
        current = ' aria-current="page"' if key == section else ""
        target = prefixed(asset_prefix, href)
        tabs.append(
            f'                <a class="tab" href="{target}"{current}>{bi(en, zh)}'
            '<span class="tab-dot" aria-hidden="true"></span></a>'
        )
        sheet.append(
            f'        <a class="sheet-link" href="{target}"{current}><span>{bi(en, zh)}</span>'
            f'<span class="sheet-n">{number:02d}</span></a>'
        )

    home = prefixed(asset_prefix, "index.html")
    lines = [
        f"    <!-- {HEADER_START} -->",
        f'    <a class="skip" href="#main">{bi("Skip to content", "跳到正文")}</a>',
        '    <header class="hdr">',
        f'        <a class="brand" href="{home}"{i18n_attrs(aria_label=("simoncos — home", "simoncos — 首页"))}>'
        '<span class="brand-dot" aria-hidden="true"></span><span>simoncos</span></a>',
        '        <div class="hdr-right">',
        f'            <nav class="hdr-nav"{i18n_attrs(aria_label=("Primary", "主导航"))}>',
        *tabs,
        "            </nav>",
        '            <div class="hdr-tools">',
        '                <button class="theme-btn" type="button" data-theme-toggle aria-label="Dark mode" title="Dark mode">'
        '<span class="i-moon" aria-hidden="true">☾</span><span class="i-sun" aria-hidden="true">☀</span></button>',
        f"                {render_lang_toggle(page)}",
        '                <button class="menu-btn" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu-sheet">'
        f'<span class="menu-when-closed">{bi("Menu", "菜单")}</span>'
        f'<span class="menu-when-open">{bi("Close", "关闭")}</span></button>',
        "            </div>",
        "        </div>",
        "    </header>",
        f'    <nav class="sheet" id="menu-sheet" hidden{i18n_attrs(aria_label=("Menu", "菜单"))}>',
        *sheet,
        "    </nav>",
        f"    <!-- {HEADER_END} -->",
    ]
    return "\n".join(lines)


def render_footer_block(config: dict[str, Any], page: dict[str, Any]) -> str:
    asset_prefix = page.get("asset_prefix", "")
    updated_en, updated_zh = updated_label(config["site_updated"])
    feeds = {feed["lang"]: prefixed(asset_prefix, feed["href"]) for feed in config.get("rss_feeds", [])}
    return "\n".join([
        f"    <!-- {FOOTER_START} -->",
        '    <footer class="ftr">',
        '        <span class="ftr-l"><span>© 2026 simoncos</span>'
        f'<span class="num">{bi(updated_en, updated_zh)}</span></span>',
        f'        <span class="ftr-r"><a href="{feeds["zh"]}">RSS <span lang="zh-Hans">中文</span></a>'
        f'<a href="{feeds["en"]}">RSS EN</a></span>',
        "    </footer>",
        f"    <!-- {FOOTER_END} -->",
    ])


def replace_marked_block(text: str, start: str, end: str, replacement: str) -> str | None:
    pattern = re.compile(
        rf"^[ \t]*<!-- {re.escape(start)} -->.*?^[ \t]*<!-- {re.escape(end)} -->\n?",
        re.S | re.M,
    )
    if not pattern.search(text):
        return None
    return pattern.sub(lambda _match: replacement + "\n", text, count=1)


def apply_shell(text: str, config: dict[str, Any], page: dict[str, Any], label: str) -> str:
    for start, end, render in (
        (RESOURCE_START, RESOURCE_END, render_resource_block),
        (HEADER_START, HEADER_END, render_header_block),
        (FOOTER_START, FOOTER_END, render_footer_block),
    ):
        replaced = replace_marked_block(text, start, end, render(config, page))
        if replaced is None:
            raise ValueError(f"{label}: missing <!-- {start} --> block")
        text = replaced
    return text


def render_document(
    config: dict[str, Any],
    page: dict[str, Any],
    *,
    head: str,
    main: str,
    html_attrs: str = "",
    body_attrs: str = "",
    tail: str = "",
) -> str:
    """A full page: document head, shell blocks, the page's <main>."""
    parts = [
        "<!DOCTYPE html>",
        f'<html lang="en"{html_attrs}>',
        "<head>",
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        head.rstrip("\n"),
        render_resource_block(config, page),
        "</head>",
        f"<body{body_attrs}>",
        render_header_block(config, page),
        main.rstrip("\n"),
        render_footer_block(config, page),
    ]
    if tail:
        parts.append(tail.rstrip("\n"))
    parts.extend(["</body>", "</html>", ""])
    return "\n".join(parts)


def render_meta(
    config: dict[str, Any],
    *,
    title: tuple[str, str],
    description: tuple[str, str],
    canonical: str | None,
    og_type: str = "website",
    image: dict[str, str] | None = None,
    robots: str | None = None,
) -> str:
    """Title, description, canonical and share metadata for a shell page."""
    site = config.get("site_url", "").rstrip("/")
    image = image or {
        "url": f"{site}/assets/og/og-default.png",
        "width": "1200",
        "height": "630",
        "alt": "simoncos — tools and research, articles and field notes",
    }
    title_en, title_zh = title
    desc_en, desc_zh = description
    zh_title = f' data-zh="{esc(title_zh)}"' if title_zh != title_en else ""
    lines = [
        f"    <title{zh_title}>{esc(title_en)}</title>",
        f'    <meta name="description" content="{esc(desc_en)}">',
        '    <meta name="author" content="simoncos">',
    ]
    if robots:
        lines.append(f'    <meta name="robots" content="{esc(robots)}">')
    if canonical is not None:
        url = f"{site}/" if canonical == "index.html" else f"{site}/{canonical}"
        lines.append(f'    <link rel="canonical" href="{url}">')
    lines.extend([
        f'    <meta property="og:type" content="{og_type}">',
        f'    <meta property="og:title" content="{esc(title_en)}">',
        f'    <meta property="og:description" content="{esc(desc_en)}">',
    ])
    if canonical is not None:
        lines.append(f'    <meta property="og:url" content="{url}">')
    lines.extend([
        '    <meta property="og:site_name" content="simoncos">',
        f'    <meta property="og:image" content="{esc(image["url"])}">',
        f'    <meta property="og:image:width" content="{image["width"]}">',
        f'    <meta property="og:image:height" content="{image["height"]}">',
        f'    <meta property="og:image:alt" content="{esc(image["alt"])}">',
        '    <meta name="twitter:card" content="summary_large_image">',
        f'    <meta name="twitter:title" content="{esc(title_en)}">',
        f'    <meta name="twitter:description" content="{esc(desc_en)}">',
        f'    <meta name="twitter:image" content="{esc(image["url"])}">',
    ])
    return "\n".join(lines)
