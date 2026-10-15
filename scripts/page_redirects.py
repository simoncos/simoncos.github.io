"""Compatibility pages for published URLs, with metadata from their new page."""

import json
from html import escape
from html.parser import HTMLParser

from site_shell import ROOT


class RedirectMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "meta" and (
            values.get("name") == "description"
            or values.get("property", "").startswith("og:")
            or values.get("name", "").startswith("twitter:")
        ):
            self.parts.append(self.get_starttag_text())


def render_redirect(target, html):
    metadata = RedirectMetadata()
    metadata.feed(html)
    url = "/" + target
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page moved · 页面已迁移 · simoncos</title>
    <meta name="robots" content="noindex">
    <link rel="canonical" href="https://simoncos.github.io{escape(url, quote=True)}">
    {chr(10).join(metadata.parts)}
    <script>
        const target = new URL({json.dumps(url)}, window.location.href);
        target.search = window.location.search;
        target.hash = window.location.hash;
        window.location.replace(target.href);
    </script>
    <noscript><meta http-equiv="refresh" content="0; url={escape(url, quote=True)}"></noscript>
</head>
<body>
    <main><p><a href="{escape(url, quote=True)}">Continue to the page · 前往新地址</a></p></main>
</body>
</html>
'''


def redirect_pages(outputs):
    redirects = json.loads((ROOT / "data/redirects.json").read_text())
    return {
        old: render_redirect(new, outputs[new] if new in outputs else (ROOT / new).read_text())
        for old, new in redirects.items()
    }
