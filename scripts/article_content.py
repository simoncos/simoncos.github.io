"""Article pipeline: content."""
import os
import re
import json
from html import unescape as html_unescape
import markdown
import logging
from datetime import datetime, timedelta, timezone
from markdown.inlinepatterns import InlineProcessor
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
from xml.etree import ElementTree
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from pathlib import Path


SITE_TIMEZONE = timezone(timedelta(hours=8))


class BlogGenerationError(Exception):
    """Custom exception for blog generation errors"""
    pass


class AnnotatePattern(InlineProcessor):
    def handleMatch(self, m, data):
        word = m.group(1)
        el = ElementTree.Element('span')
        el.set('class', 'annotated-word')
        el.set('data-word', word)
        el.text = word
        return el, m.start(0), m.end(0)


class AnnotatePreprocessor(Preprocessor):
    def run(self, lines):
        new_lines = []
        for line in lines:
            new_line = re.sub(r'\[\[(.*?)\]\]', r'<span class="annotated-word" data-word="\1">\1</span>', line)
            new_lines.append(new_line)
        return new_lines


class AnnotateExtension(Extension):
    def extendMarkdown(self, md):
        md.preprocessors.register(AnnotatePreprocessor(md), 'annotate', 175)


def parse_metadata(md_content):
    """Parse metadata from markdown content with error handling"""
    try:
        metadata = {
            'tags': '',
            'series': '',
            'series_part': '',
            'date': '',
            'updated': ''
        }

        metadata_match = re.match(r'---\n(.*?)\n---\n', md_content, re.DOTALL)
        if metadata_match:
            metadata_str = metadata_match.group(1)
            for line in metadata_str.split('\n'):
                if ':' in line:
                    key, value = [x.strip() for x in line.split(':', 1)]
                    metadata[key] = value
            content = md_content[metadata_match.end():]
        else:
            logging.warning("No metadata found in markdown file")
            content = md_content

        return metadata, content
    except Exception as e:
        logging.error(f"Error parsing metadata: {str(e)}")
        raise BlogGenerationError(f"Failed to parse metadata: {str(e)}")


def parse_page_assets(value):
    """Parse safe, article-local asset paths from comma-separated frontmatter."""
    assets = []
    for raw_asset in str(value or '').split(','):
        asset = raw_asset.strip()
        if not asset:
            continue

        parsed = urlparse(asset)
        path_parts = [part for part in parsed.path.split('/') if part]
        is_local_path = (
            not parsed.scheme
            and not parsed.netloc
            and not asset.startswith(('/', '\\'))
            and '..' not in path_parts
            and re.fullmatch(r'[A-Za-z0-9._~/?=&%+-]+', asset) is not None
        )
        if not is_local_path:
            raise BlogGenerationError(f"Unsafe page asset path: {asset}")
        assets.append(asset)
    return assets


def estimate_reading_minutes(body):
    """Rough reading time from the rendered article body (markdown also works).

    Latin readers average ~230 wpm; CJK reading is usually measured in
    characters, around 400/min. Long essays gave no length signal at all, so
    the Haba post resorted to hand-writing "about 7500 words" in its opening.
    """
    text = re.sub(r'<(script|style|pre|code)\b.*?</\1>', ' ', body or '', flags=re.S | re.I)
    text = re.sub(r'```.*?```', ' ', text, flags=re.S)
    text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html_unescape(text)

    cjk = len(re.findall(r'[一-鿿㐀-䶿]', text))
    latin_words = len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’\-]*", text))

    minutes = cjk / 400 + latin_words / 230
    return max(1, int(round(minutes)))


ARTICLE_TEXT = {
    'en': {
        'section': 'Articles', 'toc': 'Contents', 'created': 'Created', 'updated': 'Updated',
        'reading': 'Reading', 'minutes': '{n} min', 'translation': 'Translation',
        'series': 'Series', 'part': 'Part {n}', 'tags': 'Tags', 'links_out': 'This article links to',
        'links_in': 'Linked from', 'links_in_empty': 'No other article links here yet.',
        'newer': 'Newer', 'older': 'Older', 'more': 'More reading', 'top': 'Back to top',
        'other': '中文',
    },
    'zh': {
        'section': '文章', 'toc': '目录', 'created': '创建', 'updated': '更新',
        'reading': '阅读', 'minutes': '{n} 分钟', 'translation': '翻译',
        'series': '系列', 'part': '第 {n} 篇', 'tags': '标签', 'links_out': '本文提到',
        'links_in': '提到本文', 'links_in_empty': '暂时还没有其他文章引用这篇。',
        'newer': '更新的一篇', 'older': '更早的一篇', 'more': '继续阅读', 'top': '回到顶部',
        'other': 'English',
    },
}


TAG_LABELS = {
    'life': ('Life', '生活'),
    'thinking': ('Thinking', '思考'),
    'poetry': ('Poetry', '诗'),
    'ai': ('AI', 'AI'),
    'km': ('Knowledge', '知识管理'),
    'hack': ('Hack', 'Hack'),
    'design': ('Design', '设计'),
    'out': ('Outdoors', '户外'),
    'book': ('Books', '书籍'),
    'movie': ('Film', '影视'),
    'music': ('Music', '音乐'),
    'game': ('Games', '游戏'),
}


MONTH_NAMES = (
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
)


def tag_slug(tag):
    # Addresses use the English label (#topic-outdoors), not the frontmatter key (out).
    return TAG_LABELS[tag][0].lower() if tag in TAG_LABELS else tag


def tag_label(tag, language):
    en, zh = TAG_LABELS.get(tag, (tag, tag))
    return zh if language == 'zh' else en


def get_file_times(file_path):
    """Get file creation and modification dates with error handling."""
    try:
        stats = os.stat(file_path)
        created = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d')
        updated = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d')
        return created, updated
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        today = datetime.now().strftime('%Y-%m-%d')
        return today, today


def get_file_times_with_metadata(file_path, metadata_date, metadata_updated=''):
    """Prefer deterministic frontmatter dates, with mtime only as a legacy fallback."""
    try:
        stats = os.stat(file_path)
        fallback_date = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d')
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        fallback_date = datetime.now().strftime('%Y-%m-%d')

    created_dt = parse_frontmatter_date(metadata_date)
    updated_dt = parse_frontmatter_date(metadata_updated)
    created = created_dt.strftime('%Y-%m-%d') if created_dt else fallback_date
    updated = updated_dt.strftime('%Y-%m-%d') if updated_dt else created

    return created, updated


def update_image_paths(content):
    """Update image paths with error handling"""
    try:
        def replace_path(match):
            alt_text = match.group(1)
            old_path = match.group(2)
            new_path = old_path
            logging.debug(f"Processing image path: {new_path}")
            return f'![{alt_text}]({new_path})'

        pattern = r'!\[(.*?)\]\((.*?)\)'
        return re.sub(pattern, replace_path, content)
    except Exception as e:
        logging.error(f"Error updating image paths: {str(e)}")
        return content


def extract_title_and_content(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    h1 = soup.find('h1')
    if h1:
        title = h1.text
        h1.extract()  # Remove the h1 from the content
        content = str(soup)
    else:
        title = "Untitled"
        content = html_content
    return title, content


def localize_footnotes(html_content, is_english=False):
    """Improve footnote ref/backref rendering for readability across browsers."""
    soup = BeautifulSoup(html_content, 'html.parser')

    for ref in soup.select('a.footnote-ref'):
        ref['aria-label'] = 'Footnote' if is_english else '脚注'

    back_label = 'Back to text' if is_english else '返回正文'
    for backref in soup.select('a.footnote-backref'):
        backref.clear()
        backref['aria-label'] = back_label
        backref['title'] = back_label

        svg = soup.new_tag('svg', attrs={
            'viewBox': '0 0 24 24',
            'width': '16',
            'height': '16',
            'aria-hidden': 'true',
            'focusable': 'false',
            'class': 'footnote-backref-icon'
        })
        polyline = soup.new_tag('polyline', attrs={'points': '9 14 4 9 9 4'})
        path = soup.new_tag('path', attrs={'d': 'M20 20v-7a4 4 0 0 0-4-4H4'})
        svg.append(polyline)
        svg.append(path)
        backref.append(svg)

    return str(soup)


def infer_language_code(file_name):
    return 'en' if '.en.' in file_name else 'zh'


def infer_group_id(file_name):
    if file_name.endswith('.en.md'):
        return file_name[:-len('.en.md')]
    if file_name.endswith('.en.html'):
        return file_name[:-len('.en.html')]
    if file_name.endswith('.md'):
        return file_name[:-len('.md')]
    if file_name.endswith('.html'):
        return file_name[:-len('.html')]
    return file_name


def load_series_meta():
    """Display titles and blurbs for series, keyed by their frontmatter name."""
    try:
        data = json.loads(Path('data/site.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}
    return {entry['name']: entry for entry in data.get('series', [])}


def series_info(name, series_meta):
    meta = series_meta.get(name) or {}
    slug = meta.get('id') or re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    title = meta.get('title') or {'en': name, 'zh': name}
    return {'id': slug, 'title': title, 'desc': meta.get('desc') or {}}


def series_parts(article_groups, name):
    parts = [group for group in article_groups if (group.get('series') or {}).get('name') == name]
    return sorted(parts, key=lambda group: (int(group['series'].get('part') or 0), group.get('date', '')))


def entry_for(group, language):
    languages = group.get('languages') or {}
    return languages.get(language) or languages.get('zh') or languages.get('en') or {}


def get_creation_date(file_path):
    return datetime.fromtimestamp(os.path.getmtime(file_path))


def parse_frontmatter_date(date_str):
    if not date_str:
        return None

    date_str = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def build_post_excerpt(markdown_body, word_limit=100, cjk_char_limit=100):
    """Build a plain-text excerpt from markdown body.

    - Strips the top-level title (first H1) if present.
    - Removes code blocks.
    - Returns first `word_limit` words for space-delimited languages.
    - For CJK-heavy text without spaces, falls back to first `cjk_char_limit` characters.
    """
    try:
        sanitized_markdown = re.sub(
            r'^\[\^[^\]]+\]:.*(?:\n(?: {4,}|\t).*)*',
            '',
            markdown_body,
            flags=re.MULTILINE,
        )
        html_content = markdown.markdown(
            sanitized_markdown,
            extensions=[
                'markdown.extensions.fenced_code',
                'markdown.extensions.attr_list',
                'markdown.extensions.tables',
                AnnotateExtension(),
            ],
        )
        soup = BeautifulSoup(html_content, 'html.parser')

        h1 = soup.find('h1')
        if h1:
            h1.extract()

        for tag in soup.find_all(['pre', 'code']):
            tag.decompose()

        segments = []
        for element in soup.find_all(['p', 'li', 'h2', 'h3', 'h4', 'h5', 'h6']):
            # A loose list wraps each item in <p>; the <li> already carries its text.
            if element.name == 'p' and element.find_parent('li'):
                continue
            segment = ' '.join(element.stripped_strings)
            if not segment:
                continue
            if element.name == 'li':
                segment = f'• {segment}'
            segments.append(segment)

        text = '\n'.join(segments) if segments else soup.get_text(' ', strip=True)
    except Exception:
        text = re.sub(r'^\[\^[^\]]+\]:.*(?:\n(?: {4,}|\t).*)*', '', markdown_body, flags=re.MULTILINE)
        text = re.sub(r'```.*?```', ' ', text, flags=re.DOTALL)
        text = re.sub(r'`[^`]*`', ' ', text)
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
        text = re.sub(r'\[[^\]]*\]\([^)]*\)', ' ', text)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = text.strip()

    # Normalize whitespace but keep newlines as separators.
    text = re.sub(r'\r\n?', '\n', text)
    text = re.sub(r'\[\^[^\]]+\]', '', text)
    text = re.sub(r'[ \t\f\v]+', ' ', text)
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)
    text = re.sub(r'([([{“‘])\s+', r'\1', text)
    text = re.sub(r'\s+([)\]}”’])', r'\1', text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    if not text:
        return ''

    cjk_count = len(re.findall(r'[\u4e00-\u9fff]', text))
    latin_count = len(re.findall(r'[A-Za-z0-9]', text))

    lines = [ln.strip() for ln in text.split('\n')]
    lines = [ln for ln in lines if ln]
    if not lines:
        return ''

    merged_lines = []
    i = 0
    while i < len(lines):
        if lines[i] in ('-', '•') and i + 1 < len(lines):
            merged_lines.append(f"• {lines[i + 1].lstrip()}")
            i += 2
            continue
        merged_lines.append(lines[i])
        i += 1
    lines = merged_lines

    def render_bullets(line):
        # Convert markdown unordered list markers into visible bullets for previews.
        m = re.match(r'^([-*+])\s+(.*)$', line)
        if m:
            return f"• {m.group(2)}"
        return line

    # Heuristic: for CJK-heavy posts, show first N CJK characters while preserving lines.
    if cjk_count > 0 and cjk_count >= latin_count:
        out_lines = []
        cjk_seen = 0
        for ln in lines:
            ln_cjk = len(re.findall(r'[\u4e00-\u9fff]', ln))
            if cjk_seen + ln_cjk <= cjk_char_limit:
                out_lines.append(render_bullets(ln))
                cjk_seen += ln_cjk
                continue

            # Need to slice within this line
            remaining = max(0, cjk_char_limit - cjk_seen)
            if remaining == 0:
                break

            sliced = []
            kept_cjk = 0
            for ch in ln:
                if re.match(r'[\u4e00-\u9fff]', ch):
                    if kept_cjk >= remaining:
                        break
                    kept_cjk += 1
                sliced.append(ch)
            out_lines.append(render_bullets(''.join(sliced).rstrip()) + '...')
            break

        return '\n'.join(out_lines)

    # Word-based excerpt while preserving lines.
    out_lines = []
    words_seen = 0
    for ln in lines:
        ln_words = ln.split()
        if not ln_words:
            continue

        if words_seen + len(ln_words) <= word_limit:
            out_lines.append(render_bullets(ln))
            words_seen += len(ln_words)
            continue

        remaining = max(0, word_limit - words_seen)
        if remaining == 0:
            break

        out_lines.append(render_bullets(' '.join(ln_words[:remaining])) + '...')
        break

    return '\n'.join(out_lines)
