"""Article pipeline: feeds."""
import re
from html import unescape as html_unescape
import logging
from datetime import datetime
from xml.etree import ElementTree
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
from email.utils import format_datetime

from article_content import SITE_TIMEZONE, parse_frontmatter_date


def absolute_site_url(path=''):
    base = 'https://simoncos.github.io/'
    normalized = path.lstrip('/')
    return f"{base}{normalized}"


def make_links_absolute(html_content, article_url):
    """Rewrite relative href/src values to absolute URLs.

    - Fragment-only links (#fn:1) → article_url + #fn:1
    - Root-relative links (/blogs/foo.html) → site_base + /blogs/foo.html
    - Already-absolute links and mailto: left unchanged.
    - srcset/sizes are dropped, so readers load the full image from src.
    """
    site_base = absolute_site_url().rstrip('/')
    soup = BeautifulSoup(html_content, 'html.parser')
    for tag in soup.find_all(True):
        # Feed readers get the full image from src; a relative srcset would
        # point nowhere outside the site.
        for attr in ('srcset', 'sizes'):
            if tag.has_attr(attr):
                del tag[attr]
        for attr in ('href', 'src', 'poster'):
            val = tag.get(attr)
            if not val:
                continue
            if val.startswith('http://') or val.startswith('https://') or val.startswith('mailto:'):
                continue
            if val.startswith('#'):
                tag[attr] = article_url + val
            elif val.startswith('/'):
                tag[attr] = site_base + val
            else:
                tag[attr] = urljoin(article_url, val)
    return str(soup)


def strip_html_excerpt(html_content, max_length=280):
    soup = BeautifulSoup(html_content, 'html.parser')
    text = ' '.join(soup.stripped_strings)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) <= max_length:
        return text
    return text[:max_length].rstrip() + '…'


def build_meta_description(text, max_length=180):
    """Return a compact one-line description suitable for meta attributes."""
    description = re.sub(r'\s+', ' ', text or '').strip()
    if len(description) <= max_length:
        return description
    return description[:max_length].rstrip() + '...'


def build_rss_feed(posts, language_code):
    ElementTree.register_namespace('atom', 'http://www.w3.org/2005/Atom')

    rss = ElementTree.Element('rss', attrib={'version': '2.0'})
    channel = ElementTree.SubElement(rss, 'channel')

    title = 'simoncos RSS (中文)' if language_code == 'zh' else 'simoncos RSS (English)'
    description = '中文文章订阅' if language_code == 'zh' else 'English posts feed'
    feed_name = f'feed.{language_code}.xml'

    ElementTree.SubElement(channel, 'title').text = title
    ElementTree.SubElement(channel, 'link').text = absolute_site_url()
    ElementTree.SubElement(channel, 'description').text = description
    ElementTree.SubElement(channel, 'language').text = 'zh-CN' if language_code == 'zh' else 'en'
    ElementTree.SubElement(channel, 'generator').text = 'generate_blog_pages.py'
    ElementTree.SubElement(channel, 'lastBuildDate').text = format_datetime(datetime.now(SITE_TIMEZONE))

    atom_link = ElementTree.SubElement(channel, '{http://www.w3.org/2005/Atom}link')
    atom_link.set('href', absolute_site_url(feed_name))
    atom_link.set('rel', 'self')
    atom_link.set('type', 'application/rss+xml')

    filtered_posts = [post for post in posts if post.get('language') == language_code]
    filtered_posts.sort(
        key=lambda post: parse_frontmatter_date(post.get('date', '')) or datetime.min,
        reverse=True,
    )

    for post in filtered_posts:
        item = ElementTree.SubElement(channel, 'item')
        link = absolute_site_url(f"blogs/{post.get('file', '')}")
        ElementTree.SubElement(item, 'title').text = post.get('title', '')
        ElementTree.SubElement(item, 'link').text = link
        ElementTree.SubElement(item, 'guid').text = link

        pub_dt = parse_frontmatter_date(post.get('date', ''))
        if pub_dt:
            pub_dt = pub_dt.replace(hour=0, minute=0, second=0, tzinfo=SITE_TIMEZONE)
            ElementTree.SubElement(item, 'pubDate').text = format_datetime(pub_dt)

        # Use full HTML content for rich RSS reading experience.
        # Absolutize links so footnotes and cross-references work outside the site.
        # Fall back to excerpt if html_content is missing.
        full_html = post.get('html_content', '') or post.get('rendered_content', '')
        if full_html:
            full_html = make_links_absolute(full_html, link)
        description_text = full_html if full_html else (post.get('excerpt') or strip_html_excerpt(''))
        desc_el = ElementTree.SubElement(item, 'description')
        # Use a placeholder so ElementTree doesn't escape our CDATA wrapper.
        desc_el.text = f'CDATA_PLACEHOLDER_START{description_text}CDATA_PLACEHOLDER_END'

    xml_str = ElementTree.tostring(rss, encoding='utf-8', xml_declaration=True).decode('utf-8')
    # Replace escaped placeholders and unescape HTML entities inside CDATA blocks.
    def _inject_cdata(m):
        inner = html_unescape(m.group(1))
        return f'<![CDATA[{inner}]]>'
    xml_str = re.sub(
        r'CDATA_PLACEHOLDER_START(.*?)CDATA_PLACEHOLDER_END',
        _inject_cdata,
        xml_str,
        flags=re.DOTALL,
    )
    return xml_str


def save_rss_feed(posts, language_code):
    feed_content = build_rss_feed(posts, language_code)
    Path(f'feed.{language_code}.xml').write_text(feed_content, encoding='utf-8')
    logging.info(f"Successfully saved feed.{language_code}.xml")
