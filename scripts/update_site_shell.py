#!/usr/bin/env python3
"""Synchronize shared head resources and footers for the static site."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SHELL_CONFIG_PATH = ROOT / "data/site_shell.json"
SITE_CONFIG_PATH = ROOT / "src/js/site-config.js"

RESOURCE_START = "site-shell:resources:start"
RESOURCE_END = "site-shell:resources:end"
FOOTER_START = "site-shell:footer:start"
FOOTER_END = "site-shell:footer:end"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def site_version_fallback() -> str:
    text = SITE_CONFIG_PATH.read_text(encoding="utf-8")
    match = re.search(r"siteVersion:\s*['\"]([^'\"]+)['\"]", text)
    if not match:
        raise ValueError("src/js/site-config.js: missing siteVersion")
    return match.group(1)


def prefixed(asset_prefix: str, rel_path: str) -> str:
    normalized = rel_path.lstrip("/")
    if asset_prefix == "/":
        return f"/{normalized}"
    return f"{asset_prefix}{normalized}"


def normalize_script(script: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(script, str):
        return {"src": script}
    return script


def render_resource_block(config: dict[str, Any], page: dict[str, Any]) -> str:
    asset_prefix = page.get("asset_prefix", "")
    profile_name = page["script_profile"]
    scripts = config["script_profiles"][profile_name]
    icons = config["icons"]

    lines = [
        f"    <!-- {RESOURCE_START} -->",
        (
            '    <link rel="icon" type="image/png" sizes="32x32" '
            f'href="{prefixed(asset_prefix, icons["favicon"])}">'
        ),
        (
            '    <link rel="apple-touch-icon" sizes="180x180" '
            f'href="{prefixed(asset_prefix, icons["apple_touch_icon"])}">'
        ),
    ]

    if page.get("head_rss"):
        for feed in config.get("rss_feeds", []):
            lines.append(
                '    <link rel="alternate" type="application/rss+xml" '
                f'title="{feed["title"]}" href="{prefixed(asset_prefix, feed["href"])}">'
            )

    lines.append(
        f'    <link rel="stylesheet" href="{prefixed(asset_prefix, "src/css/styles.css")}?v={config["css_version"]}">'
    )

    for script in scripts:
        entry = normalize_script(script)
        attrs = " defer" if entry.get("defer") else ""
        src = prefixed(asset_prefix, f"src/js/{entry['src']}") + f"?v={config['js_version']}"
        lines.append(f'    <script src="{src}"{attrs}></script>')

    lines.append(f"    <!-- {RESOURCE_END} -->")
    return "\n".join(lines)


def render_footer_block(config: dict[str, Any], page: dict[str, Any], version_fallback: str) -> str:
    asset_prefix = page.get("asset_prefix", "")
    footer_version = page.get("footer_version", "site_config")
    is_template_version = footer_version == "template"
    version_text = "{{SITE_VERSION}}" if is_template_version else version_fallback

    lines = [
        f"        <!-- {FOOTER_START} -->",
        (
            '        <p>&copy; <script>document.write(new Date().getFullYear())</script> '
            '<span data-owner-name>simoncos</span>. All rights reserved.</p>'
        ),
    ]

    if page.get("footer_rss"):
        feed_links = [
            f'<a href="{prefixed(asset_prefix, feed["href"])}">{label}</a>'
            for feed, label in zip(config.get("rss_feeds", []), ("RSS (中文)", "RSS (English)"))
        ]
        lines.append(f"        <p>{' · '.join(feed_links)}</p>")

    if is_template_version:
        lines.append(f'        <p class="site-version">{version_text}</p>')
    else:
        lines.append(
            f'        <p class="site-version" data-site-version="site-config">{version_text}</p>'
        )
    lines.append(f"        <!-- {FOOTER_END} -->")
    return "\n".join(lines)


def replace_marked_block(text: str, start: str, end: str, replacement: str) -> str | None:
    pattern = re.compile(
        rf"^[ \t]*<!-- {re.escape(start)} -->.*?^[ \t]*<!-- {re.escape(end)} -->\n?",
        re.S | re.M,
    )
    if not pattern.search(text):
        return None
    return pattern.sub(replacement + "\n", text, count=1)


def replace_resources(text: str, replacement: str, path: Path) -> str:
    marked = replace_marked_block(text, RESOURCE_START, RESOURCE_END, replacement)
    if marked is not None:
        return marked

    head_end = text.find("\n</head>")
    if head_end < 0:
        raise ValueError(f"{path}: missing </head>")

    block_start = text.rfind("\n    <link rel=\"icon\"", 0, head_end)
    if block_start < 0:
        raise ValueError(f"{path}: missing first managed icon link")

    return text[: block_start + 1] + replacement + text[head_end:]


def replace_footer(text: str, replacement: str, path: Path) -> str:
    marked = replace_marked_block(text, FOOTER_START, FOOTER_END, replacement)
    if marked is not None:
        return marked

    pattern = re.compile(r"(?P<open>^[ \t]*<footer>\n)(?P<body>.*?)(?P<close>^[ \t]*</footer>)", re.S | re.M)
    match = pattern.search(text)
    if not match:
        raise ValueError(f"{path}: missing footer")

    return text[: match.start("body")] + replacement + "\n" + text[match.start("close") :]


def update_file(path: Path, config: dict[str, Any], page: dict[str, Any], *, version_fallback: str, check: bool) -> bool:
    text = path.read_text(encoding="utf-8")
    updated = replace_resources(text, render_resource_block(config, page), path)
    updated = replace_footer(updated, render_footer_block(config, page, version_fallback), path)

    if updated == text:
        return False
    if check:
        return True

    path.write_text(updated, encoding="utf-8")
    return True


def validate_config(config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    profiles = config.get("script_profiles") or {}
    for page in config.get("pages", []):
        rel_path = page.get("path", "<missing>")
        if not (ROOT / rel_path).exists():
            errors.append(f"data/site_shell.json: page does not exist: {rel_path}")
        profile = page.get("script_profile")
        if profile not in profiles:
            errors.append(f"data/site_shell.json: {rel_path} references missing profile {profile!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if shared shell output is out of date.")
    args = parser.parse_args()

    config = load_json(SHELL_CONFIG_PATH)
    errors = validate_config(config)
    if errors:
        print("Site shell config validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    try:
        version_fallback = site_version_fallback()
    except ValueError as error:
        print(error)
        return 1

    changed = []
    for page in config.get("pages", []):
        path = ROOT / page["path"]
        try:
            if update_file(path, config, page, version_fallback=version_fallback, check=args.check):
                changed.append(path.relative_to(ROOT))
        except ValueError as error:
            print(error)
            return 1

    if args.check and changed:
        print("Shared site shell is out of date:")
        for path in changed:
            print(f"- {path}")
        print("Run: python3 scripts/update_site_shell.py")
        return 1

    if changed:
        print("Updated shared site shell:")
        for path in changed:
            print(f"- {path}")
    else:
        print("Shared site shell is current.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
