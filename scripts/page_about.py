"""About and 404 pages."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import bi, bi_value, esc, page_config, render_document, render_meta


from page_common import href_attrs, pick


def native_name(html: str, name: dict[str, str] | None) -> str:
    """Tag a name written in another script (趙澈 is traditional Chinese)."""
    if not name:
        return html
    text = esc(name["text"])
    return html.replace(text, f'<span lang="{esc(name["lang"])}">{text}</span>')


def render_about(config: dict[str, Any], site: dict[str, Any]) -> str:
    page = page_config(config, "about.html")
    about = site["about"]

    def paragraph(segments: list[list[str]], lang: str) -> str:
        parts = []
        for segment in segments:
            if len(segment) == 1:
                parts.append(esc(segment[0]))
                continue
            link = about["links"][segment[1]]
            parts.append(
                f'<a href="{esc(pick(link["href"], lang))}" data-float="{esc(link["img"])}">{esc(segment[0])}</a>'
            )
        return "".join(parts)

    paragraphs = []
    for para in about["paragraphs"]:
        en = paragraph(para["en"], "en")
        zh = paragraph(para["zh"], "zh")
        if en != zh:
            body = f'<span data-l="en">{en}</span><span data-l="zh" lang="zh-Hans">{zh}</span>'
        elif re.search(r"[\u3400-\u9fff]", en):
            body = en
        else:
            # One English line for both languages ("connecting the dots.").
            body = f'<span lang="en">{en}</span>'
        paragraphs.append(f'        <p class="about-p">{body}</p>')

    contacts = "".join(
        f'<a class="contact"{href_attrs(contact["href"])}>{esc(contact["k"])}'
        '<span class="contact-arrow" aria-hidden="true">↗</span></a>'
        for contact in about["contacts"]
    )
    main = "\n".join([
        '<main id="main" class="about enter" tabindex="-1">',
        '    <section class="about-prose">',
        f'        <h1 class="visually-hidden">{bi("About", "关于")}</h1>',
        # The motto leads the page, set largest: Che's own line, in English in both languages.
        f'        <p class="about-motto" lang="en">{esc(about["motto"])}</p>',
        f'        <p class="about-who">{native_name(bi_value(about["who"]), about.get("native_name"))}</p>',
        *paragraphs,
        "    </section>",
        '    <section class="contacts">',
        f'        <button class="copy-btn" type="button" data-copy="{esc(about["email"])}">'
        f'<span>{esc(about["email"])}</span><span class="copy-state">'
        f'<span class="copy-idle">{bi("Copy", "复制")}</span><span class="copy-done">{bi("Copied", "已复制")}</span>'
        f'<span class="copy-fail">{bi("Copy failed", "复制失败")}</span></span></button>',
        f"        {contacts}",
        "    </section>",
        *([
            # Che's WeChat official account, the same code as on the talk's last slide.
            '    <figure class="about-wechat">'
            f'<img src="{esc(about["wechat_qr"])}" width="320" height="320" alt="" decoding="async" loading="lazy">'
            f'<figcaption>{bi("WeChat official account (in Chinese)", "微信公众号")}'
            f'<span class="about-wechat-hint">{bi("Scan in WeChat", "微信扫一扫，或长按识别")}</span></figcaption></figure>',
        ] if about.get("wechat_qr") else []),
        "</main>",
    ])
    head = render_meta(
        config,
        title=("About · simoncos", "关于 · simoncos"),
        description=(
            "About simoncos: a full-stack builder in Hong Kong, working on AI and data.",
            "关于 simoncos：在香港做 AI 和数据方向的全栈开发。",
        ),
        canonical="about.html",
    )
    return render_document(config, page, head=head, main=main)


def render_not_found(config: dict[str, Any]) -> str:
    page = page_config(config, "404.html")
    links = "".join(
        f'<a class="pill" href="/{href}">{bi(en, zh)}</a>'
        for href, en, zh in (
            ("blogs.html", "Articles", "文章"),
            ("gallery.html", "Work", "作品"),
            ("favorites.html", "Favorites", "收藏"),
            ("about.html", "About", "关于"),
        )
    )
    main = "\n".join([
        '<main id="main" class="nf enter" tabindex="-1">',
        '    <span class="nf-path">404<span data-bad-path></span></span>',
        f'    <h1>{bi("Nothing here.", "这里什么都没有。")}</h1>',
        f'    <p class="nf-lede">{bi("The page you’re looking for doesn’t exist, or may have moved. Try one of these instead.", "你要找的页面不存在，或者已经搬走了。可以从这几个地方重新开始。")}</p>',
        '    <div class="nf-links">',
        f'        <a class="pill pill-ink" href="/index.html">{bi("Back to home", "回到首页")} <span aria-hidden="true">→</span></a>{links}',
        "    </div>",
        "</main>",
    ])
    head = render_meta(
        config,
        title=("404 · simoncos", "404 · simoncos"),
        description=("The requested page was not found.", "你要找的页面不存在。"),
        canonical=None,
        robots="noindex",
    )
    return render_document(config, page, head=head, main=main, html_attrs=' data-page="notfound"')
