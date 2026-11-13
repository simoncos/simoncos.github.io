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


def is_external(target):
    return target.startswith("https://") or target.startswith("http://")


def render_redirect(target, html):
    metadata = RedirectMetadata()
    metadata.feed(html)
    url = target if is_external(target) else "/" + target
    canonical = target if is_external(target) else "https://simoncos.github.io" + url
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page moved · 页面已迁移 · simoncos</title>
    <meta name="robots" content="noindex">
    <link rel="canonical" href="{escape(canonical, quote=True)}">
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
    pages = {}
    for old, new in redirects.items():
        if is_external(new):
            html = ""
        elif new in outputs:
            html = outputs[new]
        else:
            html = (ROOT / new).read_text()
        pages[old] = render_redirect(new, html)
    return pages
