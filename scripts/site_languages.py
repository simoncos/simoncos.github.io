"""Render true language documents while keeping the existing English URLs.

The bilingual authoring helpers remain useful. This final build-time pass
selects their text/attributes before HTML is served, rather than hiding half
of a document at runtime. Scripts, comments and text entities are preserved.
"""

from __future__ import annotations

from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

SECTIONS = ("index.html", "blogs.html", "gallery.html", "about.html")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def section_path(path: str, language: str) -> str:
    if path.endswith(".zh.html") and path.replace(".zh.html", ".html") in SECTIONS:
        path = path.replace(".zh.html", ".html")
    return path.replace(".html", ".zh.html") if language == "zh" and path in SECTIONS else path


def localized_href(href: str, language: str) -> str:
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return href
    directory, slash, name = parsed.path.rpartition("/")
    # Only the root section names have .zh peers. A nested talk/index.html
    # is a different document, even though it has the same basename.
    if any(part not in ('', '.', '..') for part in directory.split('/')):
        return href
    base = name.replace(".zh.html", ".html")
    if base not in SECTIONS:
        return href
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    requested = query.pop("lang", language)
    requested = requested if requested in ("en", "zh") else language
    path = directory + slash + section_path(base, requested)
    return urlunsplit(("", "", path, urlencode(query), parsed.fragment))


def canonical_url(origin: str, path: str) -> str:
    return origin.rstrip("/") + ("/" if path == "index.html" else "/" + path)


class LanguageDocument(HTMLParser):
    def __init__(self, language: str, page: dict | None = None, origin: str = ""):
        super().__init__(convert_charrefs=False)
        self.language = language
        self.page = page or {}
        self.origin = origin
        self.parts: list[str] = []
        self.stack: list[tuple[str, bool, str | None]] = []

    @property
    def hidden(self):
        return bool(self.stack and self.stack[-1][1])

    def start(self, tag, attrs, self_closing=False):
        attributes = dict(attrs)
        hidden = self.hidden or (attributes.get("data-l") not in (None, self.language))
        title = attributes.get("data-zh") if tag == "title" and self.language == "zh" else None
        if not hidden:
            for name in (attributes.get("data-i18n") or "").split():
                if self.language == "zh" and "data-zh-" + name in attributes:
                    attributes[name] = attributes["data-zh-" + name]
            if tag == "a" and attributes.get("href") and not attributes.get("data-lang-nav"):
                attributes["href"] = localized_href(attributes["href"], self.language)
            if tag == "html":
                attributes["lang"] = "zh-Hans" if self.language == "zh" else "en"
                attributes["data-lang"] = self.language
                attributes["data-page-lang"] = self.language
                if self.page.get("alternates") and self.page.get("path") in (*SECTIONS, *(section_path(p, "zh") for p in SECTIONS)):
                    attributes["data-section-en"] = self.page["alternates"]["en"]
                    attributes["data-section-zh"] = self.page["alternates"]["zh"]
            if self.page.get("canonical"):
                canonical = canonical_url(self.origin, self.page["canonical"])
                if tag == "link" and attributes.get("rel") == "canonical":
                    attributes["href"] = canonical
                if tag == "meta" and attributes.get("property") == "og:url":
                    attributes["content"] = canonical
                if tag == "meta" and attributes.get("property") == "og:locale":
                    attributes["content"] = "zh_CN" if self.language == "zh" else "en_US"
            # Maintain the source attribute order: downstream checks and shell
            # markers stay readable, and inline script text is never reserialized.
            names = [name for name, _ in attrs]
            names += [name for name in attributes if name not in names]
            rendered = []
            for name in names:
                if name in ("data-i18n", "data-en", "data-zh") or name.startswith(("data-zh-", "data-en-")):
                    continue
                value = attributes[name]
                rendered.append(" " + name if value is None else f' {name}="{escape(value, quote=True)}"')
            self.parts.append("<" + tag + "".join(rendered) + (" />" if self_closing else ">"))
        if tag not in VOID and not self_closing:
            self.stack.append((tag, hidden, title))

    def handle_starttag(self, tag, attrs):
        self.start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self.start(tag, attrs, True)

    def handle_endtag(self, tag):
        hidden = self.hidden
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        if not hidden:
            self.parts.append(f"</{tag}>")

    def handle_data(self, data):
        if not self.hidden:
            replacement = self.stack[-1][2] if self.stack else None
            self.parts.append(escape(replacement) if replacement is not None else data)

    def handle_entityref(self, name):
        if not self.hidden:
            self.parts.append(f"&{name};")

    def handle_charref(self, name):
        if not self.hidden:
            self.parts.append(f"&#{name};")

    def handle_comment(self, data):
        if not self.hidden:
            self.parts.append(f"<!--{data}-->")

    def handle_decl(self, decl):
        self.parts.append(f"<!{decl}>")


def language_document(text: str, language: str, page: dict | None = None, origin: str = "") -> str:
    parser = LanguageDocument(language, page, origin)
    parser.feed(text)
    parser.close()
    return "".join(parser.parts)
