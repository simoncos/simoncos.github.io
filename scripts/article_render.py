"""Article pipeline: render."""
import os
import json
import html as html_lib
import logging
from bs4 import BeautifulSoup
from urllib.parse import quote
from pathlib import Path

from site_shell import esc
from article_content import ARTICLE_TEXT, BlogGenerationError, entry_for, estimate_reading_minutes, get_file_times_with_metadata, parse_page_assets, series_info, series_parts, tag_label, tag_slug
from article_feeds import absolute_site_url, build_meta_description
from article_media import build_og_image, og_fallback_image
from article_relations import linked_article_files


def build_post_nav(neighbours, language):
    if not neighbours:
        return ''

    text = ARTICLE_TEXT[language if language in ARTICLE_TEXT else 'en']
    cards = []
    for direction, rel in (('newer', 'prev'), ('older', 'next')):
        entry = neighbours.get(direction)
        if not entry or not entry.get('file'):
            continue
        cards.append(
            f'<a class="post-nav-card post-nav-{direction}" rel="{rel}" href="{esc(entry["file"])}">'
            f'<span class="k">{text[direction]}</span>'
            f'<span class="post-nav-title">{esc(entry.get("title") or "")}</span></a>'
        )

    if not cards:
        return ''
    return f'<nav class="post-nav" aria-label="{text["more"]}">' + ''.join(cards) + '</nav>'


def build_hreflang_alternates(article_languages):
    """Declare the article's translation pair to search engines.

    Bilingual variants live at separate URLs but were not cross-referenced, so
    each language read as an unrelated page.
    """
    hreflang_by_language = {'en': 'en', 'zh': 'zh-Hans'}
    rows = []

    for language, hreflang in hreflang_by_language.items():
        entry = article_languages.get(language) or {}
        file_name = entry.get('file')
        if file_name:
            url = absolute_site_url(f"blogs/{file_name}")
            rows.append(f'    <link rel="alternate" hreflang="{hreflang}" href="{url}">')

    default_entry = article_languages.get('en') or article_languages.get('zh') or {}
    if default_entry.get('file'):
        url = absolute_site_url(f"blogs/{default_entry['file']}")
        rows.append(f'    <link rel="alternate" hreflang="x-default" href="{url}">')

    return '\n'.join(rows)


def meta_item(label, value):
    return (
        '                    <span class="meta-item">'
        f'<span class="k">{esc(label)}</span>{value}</span>'
    )


def build_post_meta(metadata, language, created, updated, reading_minutes, paired_entry):
    """Created / Updated / Reading, then the translator, then the link to the
    translation.

    `translation` used to sit as a bare paragraph at the top of the body, where
    it read as stray text and got scraped into the meta description. It is
    metadata, so it renders as metadata. There is no separate "written" row:
    `date` is when the piece was written (owner's call, 2026-09-30).
    """
    text = ARTICLE_TEXT[language]
    rows = [
        meta_item(text['created'], f'<span class="num">{esc(created)}</span>'),
        meta_item(text['updated'], f'<span class="num">{esc(updated)}</span>'),
        meta_item(text['reading'], esc(text['minutes'].format(n=reading_minutes))),
    ]

    translation = (metadata.get('translation') or '').strip()
    if translation:
        rows.append(meta_item(text['translation'], esc(translation)))

    if paired_entry and paired_entry.get('file'):
        hreflang = 'zh-Hans' if language == 'en' else 'en'
        rows.append(
            f'                    <a class="meta-alt" href="{esc(paired_entry["file"])}" hreflang="{hreflang}" '
            f'lang="{hreflang}" data-lang-nav="{"zh" if language == "en" else "en"}">{text["other"]} ↗</a>'
        )

    return '\n'.join(rows)


def assign_heading_ids(rendered_html):
    """Give every section heading a stable anchor and collect the contents.

    Ids follow the numbering the client-side contents list used to assign
    (heading-N over h2/h3/h4 in document order, counting from 1), so links
    into sections from before the redesign keep working. The contents list
    takes the same three levels, as it did then.
    """
    soup = BeautifulSoup(rendered_html, 'html.parser')
    entries = []
    for index, heading in enumerate(soup.find_all(['h2', 'h3', 'h4']), start=1):
        if not heading.get('id'):
            heading['id'] = f'heading-{index}'
        entries.append((heading.name, heading['id'], heading.get_text(' ', strip=True)))
    return str(soup), entries


def build_toc(entries, language):
    """The sticky contents rail (wide) and the collapsible box (narrow)."""
    if not entries:
        return '', ''
    text = ARTICLE_TEXT[language]
    links = ''.join(
        f'<a class="toc-link toc-{level}" href="#{esc(anchor)}"><span class="toc-dot" aria-hidden="true"></span>'
        f'<span>{esc(label)}</span></a>'
        for level, anchor, label in entries
    )
    aside = (
        f'            <aside class="toc" aria-label="{text["toc"]}">'
        f'<span class="k toc-k">{text["toc"]}</span>{links}</aside>'
    )
    box = (
        '                <details class="toc-box">'
        f'<summary><span>{text["toc"]}</span><span class="toc-sign" aria-hidden="true"></span></summary>'
        f'<div class="toc-box-links">{links}</div></details>'
    )
    return aside, box


def build_head_extras(metadata):
    """Render optional article-specific styles and ES modules."""
    lines = []
    for href in parse_page_assets(metadata.get('styles', '')):
        lines.append(f'    <link rel="stylesheet" href="{html_lib.escape(href, quote=True)}">')
    for src in parse_page_assets(metadata.get('module_scripts', '')):
        lines.append(
            f'    <script type="module" src="{html_lib.escape(src, quote=True)}"></script>'
        )
    return ''.join(f'{line}\n' for line in lines)


def build_post_foot(post, article_group, article_groups, file_index, group_map, backlinks, neighbours, series_meta):
    """Series box, tags, the links in and out, and newer / older."""
    language = post['language']
    text = ARTICLE_TEXT[language]
    parts = []

    series = article_group.get('series')
    if series:
        info = series_info(series['name'], series_meta)
        rows = []
        for group in series_parts(article_groups, series['name']):
            entry = entry_for(group, language)
            current = ' aria-current="page"' if group['id'] == article_group['id'] else ''
            rows.append(
                f'<a href="{esc(entry.get("file", ""))}"{current}>'
                f'<span class="series-part">{text["part"].format(n=group["series"].get("part"))}</span>'
                f'<span>{esc(entry.get("title", ""))}</span></a>'
            )
        title = info['title'].get(language) or series['name']
        parts.append(
            f'<div class="series-box"><h2 class="k">{text["series"]} · {esc(title)}</h2>{"".join(rows)}</div>'
        )

    if post['tags']:
        tags = ''.join(
            f'<a class="tag" href="../blogs.html#topic-{quote(tag_slug(tag))}">{esc(tag_label(tag, language))}</a>'
            for tag in post['tags']
        )
        parts.append(f'<div class="article-tags"><h2 class="k">{text["tags"]}</h2>{tags}</div>')

    def link_row(group):
        entry = entry_for(group, language)
        return (
            f'<a class="xref" href="{esc(entry.get("file", ""))}"><span>{esc(entry.get("title", ""))}</span>'
            f'<span class="num">{esc(group.get("date", ""))}</span></a>'
        )

    outgoing = []
    for file_name in linked_article_files(post['html_content']):
        group = file_index.get(file_name)
        if group and group['id'] != article_group['id'] and group not in outgoing:
            outgoing.append(group)
    boxes = []
    if outgoing:
        boxes.append(
            f'<div class="xrefs"><h2 class="k">{text["links_out"]}</h2>'
            + ''.join(link_row(group) for group in outgoing) + '</div>'
        )
    incoming = [group_map[item['group_id']] for item in backlinks if item.get('group_id') in group_map]
    if incoming:
        boxes.append(
            f'<div class="xrefs"><h2 class="k">{text["links_in"]}</h2>'
            + ''.join(link_row(group) for group in incoming) + '</div>'
        )
    else:
        boxes.append(
            f'<div class="xrefs is-empty"><h2 class="k">{text["links_in"]}</h2>'
            f'<span class="xrefs-empty">{text["links_in_empty"]}</span></div>'
        )
    parts.append(f'<section class="xref-grid">{"".join(boxes)}</section>')

    post_nav = build_post_nav(neighbours, language)
    if post_nav:
        parts.append(post_nav)

    return '\n'.join(f'                {part}' for part in parts)


def render_blog_post(post, template, context):
    """Render and save individual blog post."""
    try:
        html_file = post['file']
        metadata = post['metadata']
        title = post['title']
        markdown_path = post['markdown_path']
        language = post['language']
        text = ARTICLE_TEXT[language]

        article_group = context['group_map'].get(post['group_id'], {})
        article_languages = article_group.get('languages', {})
        paired_entry = article_languages.get('zh' if language == 'en' else 'en')

        created, updated = get_file_times_with_metadata(
            markdown_path,
            metadata.get('date', ''),
            metadata.get('updated', ''),
        )
        canonical_url = absolute_site_url(f"blogs/{html_file}")
        # An authored `description:` wins over the auto-excerpt, which otherwise
        # scrapes whatever the article opens with -- including TLDR notes.
        meta_description = build_meta_description(
            metadata.get('description') or post.get('excerpt') or title
        )
        og_locale = 'zh_CN' if language == 'zh' else 'en_US'
        rendered_content, toc_entries = assign_heading_ids(post['rendered_content'])
        og_image = build_og_image(rendered_content, title)
        reading_minutes = estimate_reading_minutes(rendered_content)
        toc_aside, toc_box = build_toc(toc_entries, language)
        post_meta = build_post_meta(metadata, language, created, updated, reading_minutes, paired_entry)
        post_foot = build_post_foot(
            post,
            article_group,
            context['groups'],
            context['file_index'],
            context['group_map'],
            context['backlinks'].get(html_file, []),
            context['sequence'].get(html_file),
            context['series_meta'],
        )

        if paired_entry and paired_entry.get('file'):
            alt_href = paired_entry['file']
        else:
            alt_href = f"../blogs.html?lang={'zh' if language == 'en' else 'en'}"

        replacements = {
            '{{TITLE}}': html_lib.escape(title, quote=False),
            '{{TITLE_ATTR}}': html_lib.escape(title, quote=True),
            '{{SECTION_LABEL}}': text['section'],
            '{{META_DESCRIPTION}}': html_lib.escape(meta_description, quote=True),
            '{{CANONICAL_URL}}': canonical_url,
            '{{OG_LOCALE}}': og_locale,
            '{{OG_IMAGE}}': html_lib.escape(og_image['url'], quote=True),
            '{{OG_IMAGE_WIDTH}}': og_image['width'],
            '{{OG_IMAGE_HEIGHT}}': og_image['height'],
            '{{OG_IMAGE_ALT}}': html_lib.escape(og_image['alt'], quote=True),
            '{{PAGE_LANGUAGE}}': 'zh-Hans' if language == 'zh' else 'en',
            '{{ARTICLE_GROUP_ID}}': post['group_id'],
            '{{ARTICLE_LANGUAGE}}': language,
            '{{LANG_ALT_HREF}}': html_lib.escape(alt_href, quote=True),
            '{{LANG_ALT_HREFLANG}}': 'zh-Hans' if language == 'en' else 'en',
            '{{LANG_ALT}}': 'zh' if language == 'en' else 'en',
            '{{TOP_LABEL}}': text['top'],
            '{{HEAD_EXTRAS}}': build_head_extras(metadata),
        }
        # Blocks that may be empty consume their own line.
        blocks = {
            '{{HREFLANG_ALTERNATES}}': build_hreflang_alternates(article_languages),
            '{{TOC_ASIDE}}': toc_aside,
            '{{TOC_BOX}}': toc_box,
            '{{POST_META}}': post_meta,
            '{{POST_FOOT}}': post_foot,
            '{{CONTENT}}': rendered_content,
        }

        page_content = template
        for placeholder, value in blocks.items():
            page_content = page_content.replace(f'\n{placeholder}', f'\n{value}' if value else '')
        for placeholder, value in replacements.items():
            page_content = page_content.replace(placeholder, value)

        with open(os.path.join('blogs', html_file), 'w', encoding='utf-8') as f:
            f.write(page_content)

    except Exception as e:
        logging.error(f"Error rendering blog post {post.get('markdown')}: {str(e)}")
        raise BlogGenerationError(f"Failed to render blog post: {str(e)}")
