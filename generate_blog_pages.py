import os
import sys
import re
import io
import json
import html as html_lib
import struct
from functools import lru_cache
from html import unescape as html_unescape
import markdown
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from markdown.inlinepatterns import InlineProcessor
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
from xml.etree import ElementTree
from bs4 import BeautifulSoup, NavigableString
from urllib.parse import quote, unquote, urljoin, urlparse
from pathlib import Path
from email.utils import format_datetime

sys.path.insert(0, str(Path(__file__).resolve().parent / 'scripts'))

from site_shell import bi, esc, i18n_attrs  # noqa: E402

SITE_TIMEZONE = timezone(timedelta(hours=8))

def configure_logging():
    """Configure CLI logging without side effects when this module is imported."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('blog_generator.log'),
            logging.StreamHandler(),
        ],
    )

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

def ensure_directories():
    """Ensure required directories exist"""
    required_dirs = ['blogs', 'data', 'src/css', 'src/js']
    for directory in required_dirs:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logging.info(f"Checked directory: {directory}")

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


def og_fallback_image():
    """The site's own share card, used when an article has no usable lead photo."""
    return {
        'url': absolute_site_url('assets/og/og-default.png'),
        'width': '1200',
        'height': '630',
        'alt': 'simoncos — tools and research, articles and field notes',
    }


# Social platforms reject SVG and are unreliable with WebP, so only offer
# formats every crawler renders.
OG_SAFE_IMAGE_SUFFIXES = ('.png', '.jpg', '.jpeg', '.gif')


def build_og_image(rendered_html, title):
    """Pick the share image for an article: its lead photo, else the site card.

    A lead photo makes a far better preview than a generated card, but only if
    the crawler can actually decode it.
    """
    soup = BeautifulSoup(rendered_html or '', 'html.parser')
    for image in soup.find_all('img'):
        source = (image.get('src') or '').strip()
        if not source:
            continue

        path = urlparse(source).path.lower()
        if not path.endswith(OG_SAFE_IMAGE_SUFFIXES):
            continue

        width, height = image.get('width'), image.get('height')
        if not width or not height:
            continue

        # Below roughly 600x315 platforms downgrade to a small square card.
        if int(width) < 600 or int(height) < 315:
            continue

        return {
            'url': urljoin(absolute_site_url('blogs/'), source),
            'width': str(width),
            'height': str(height),
            'alt': (image.get('alt') or title).strip() or title,
        }

    return og_fallback_image()


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


def build_article_sequence(article_groups):
    """Map each article file to its neighbours in reverse-chronological order."""
    ordered = []
    for group in article_groups:
        for language_code, entry in (group.get('languages') or {}).items():
            if entry.get('file'):
                ordered.append((language_code, group, entry))

    sequence = {}
    for language_code in ('en', 'zh'):
        in_language = [item for item in ordered if item[0] == language_code]
        for index, (_, _, entry) in enumerate(in_language):
            previous = in_language[index - 1][2] if index > 0 else None
            following = in_language[index + 1][2] if index + 1 < len(in_language) else None
            # Groups are sorted newest first, so the earlier index is the newer post.
            sequence[entry['file']] = {'newer': previous, 'older': following}
    return sequence


ARTICLE_TEXT = {
    'en': {
        'section': 'Articles', 'toc': 'Contents', 'created': 'Created', 'updated': 'Updated',
        'reading': 'Reading', 'minutes': '{n} min', 'written': 'Written', 'translation': 'Translation',
        'series': 'Series', 'part': 'Part {n}', 'tags': 'Tags', 'links_out': 'This article links to',
        'links_in': 'Linked from', 'links_in_empty': 'No other article links here yet.',
        'newer': 'Newer', 'older': 'Older', 'more': 'More reading', 'top': 'Back to top',
        'other': '中文',
    },
    'zh': {
        'section': '文章', 'toc': '目录', 'created': '创建', 'updated': '更新',
        'reading': '阅读', 'minutes': '{n} 分钟', 'written': '写于', 'translation': '翻译',
        'series': '系列', 'part': '第 {n} 篇', 'tags': '标签', 'links_out': '本文提到',
        'links_in': '提到本文', 'links_in_empty': '暂时还没有其他文章引用这篇。',
        'newer': '更新的一篇', 'older': '更早的一篇', 'more': '继续阅读', 'top': '回到顶部',
        'other': 'English',
    },
}

# Tag slugs stay as written in the frontmatter; these are their display names.
TAG_LABELS = {
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


def tag_label(tag, language):
    en, zh = TAG_LABELS.get(tag, (tag, tag))
    return zh if language == 'zh' else en


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
    """Created / Updated / Reading, then optional provenance, then the link
    to the translation.

    `written` (when the piece was actually composed, which can predate
    publication) and `translation` used to sit as bare paragraphs at the top of
    the body, where they read as stray text and got scraped into the meta
    description. They are metadata, so they render as metadata.
    """
    text = ARTICLE_TEXT[language]
    rows = [
        meta_item(text['created'], f'<span class="num">{esc(created)}</span>'),
        meta_item(text['updated'], f'<span class="num">{esc(updated)}</span>'),
        meta_item(text['reading'], esc(text['minutes'].format(n=reading_minutes))),
    ]

    written = (metadata.get('written') or '').strip()
    if written:
        rows.append(meta_item(text['written'], f'<span class="num">{esc(written)}</span>'))

    translation = (metadata.get('translation') or '').strip()
    if translation:
        rows.append(meta_item(text['translation'], esc(translation)))

    if paired_entry and paired_entry.get('file'):
        hreflang = 'zh-Hans' if language == 'en' else 'en'
        rows.append(
            f'                    <a class="meta-alt" href="{esc(paired_entry["file"])}" hreflang="{hreflang}" '
            f'data-lang-nav="{"zh" if language == "en" else "en"}">{text["other"]} ↗</a>'
        )

    return '\n'.join(rows)


def assign_heading_ids(rendered_html):
    """Give every section heading a stable anchor and collect the contents.

    Ids follow the numbering the client-side contents list used to assign
    (heading-N over h2/h3/h4 in document order, counting from 1), so links
    into sections from before the redesign keep working.
    """
    soup = BeautifulSoup(rendered_html, 'html.parser')
    entries = []
    for index, heading in enumerate(soup.find_all(['h2', 'h3', 'h4']), start=1):
        if not heading.get('id'):
            heading['id'] = f'heading-{index}'
        if heading.name in ('h2', 'h3'):
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


def linked_article_files(html_content):
    """Article files an article links to, in order of first appearance."""
    soup = BeautifulSoup(html_content or '', 'html.parser')
    files = []
    for anchor in soup.find_all('a', href=True):
        parsed = urlparse(anchor['href'])
        if parsed.scheme and parsed.netloc != 'simoncos.github.io':
            continue
        path = parsed.path
        if parsed.netloc or path.startswith('/'):
            if not re.fullmatch(r'/blogs/[^/]+\.html', path):
                continue
        elif '/' in path and not re.fullmatch(r'\.\./blogs/[^/]+\.html', path):
            continue
        name = path.rsplit('/', 1)[-1]
        if name.endswith('.html') and name not in files:
            files.append(name)
    return files


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


def parse_dimension_value(value):
    if not value:
        return None
    normalized = str(value).strip()
    match = re.match(r'^([0-9]+(?:\.[0-9]+)?)(?:px)?$', normalized)
    if not match:
        return None
    number = float(match.group(1))
    if number <= 0:
        return None
    return int(round(number))


def read_svg_dimensions(path):
    try:
        text = path.read_text(encoding='utf-8', errors='ignore')[:8192]
    except OSError:
        return None
    return read_svg_dimensions_from_text(text)


def read_svg_dimensions_from_text(text):
    svg_match = re.search(r'<svg\b(?P<attrs>[^>]*)>', text, re.I | re.S)
    if not svg_match:
        return None

    attrs = svg_match.group('attrs')

    def attr(name):
        match = re.search(rf'\b{name}\s*=\s*["\']([^"\']+)["\']', attrs, re.I)
        return match.group(1) if match else ''

    width = parse_dimension_value(attr('width'))
    height = parse_dimension_value(attr('height'))
    if width and height:
        return width, height

    view_box = attr('viewBox')
    parts = view_box.replace(',', ' ').split()
    if len(parts) == 4:
        try:
            width = int(round(float(parts[2])))
            height = int(round(float(parts[3])))
        except ValueError:
            return None
        if width > 0 and height > 0:
            return width, height

    return None


def read_jpeg_dimensions(path):
    try:
        with path.open('rb') as file:
            return read_jpeg_dimensions_from_stream(file)
    except OSError:
        return None


def read_jpeg_dimensions_from_stream(file):
    start_of_frame_markers = {
        0xC0, 0xC1, 0xC2, 0xC3,
        0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB,
        0xCD, 0xCE, 0xCF,
    }
    try:
        if file.read(2) != b'\xff\xd8':
            return None

        while True:
            byte = file.read(1)
            while byte and byte != b'\xff':
                byte = file.read(1)
            while byte == b'\xff':
                byte = file.read(1)
            if not byte:
                return None

            marker = byte[0]
            if marker == 0xD9 or marker == 0xDA:
                return None
            if 0xD0 <= marker <= 0xD7:
                continue

            length_bytes = file.read(2)
            if len(length_bytes) != 2:
                return None
            length = struct.unpack('>H', length_bytes)[0]
            if length < 2:
                return None

            if marker in start_of_frame_markers:
                segment = file.read(length - 2)
                if len(segment) < 5:
                    return None
                height = struct.unpack('>H', segment[1:3])[0]
                width = struct.unpack('>H', segment[3:5])[0]
                if width > 0 and height > 0:
                    return width, height
                return None

            file.seek(length - 2, os.SEEK_CUR)
    except OSError:
        return None


def read_image_dimensions(path):
    suffix = path.suffix.lower()
    if suffix == '.svg':
        return read_svg_dimensions(path)

    try:
        with path.open('rb') as file:
            header = file.read(24)
    except OSError:
        return None

    if header.startswith(b'\x89PNG\r\n\x1a\n') and len(header) >= 24:
        width, height = struct.unpack('>II', header[16:24])
        if width > 0 and height > 0:
            return width, height

    if header.startswith(b'GIF87a') or header.startswith(b'GIF89a'):
        width, height = struct.unpack('<HH', header[6:10])
        if width > 0 and height > 0:
            return width, height

    if suffix in ('.jpg', '.jpeg') or header.startswith(b'\xff\xd8'):
        return read_jpeg_dimensions(path)

    return None


def read_image_dimensions_from_bytes(data, suffix=''):
    """Parse intrinsic dimensions from the leading bytes of an image file.

    Mirrors read_image_dimensions() but works on a buffer, so remote images can
    be measured from a ranged HTTP read instead of a full download.
    """
    suffix = (suffix or '').lower()
    if suffix == '.svg':
        return read_svg_dimensions_from_text(data.decode('utf-8', errors='ignore')[:8192])

    if data.startswith(b'\x89PNG\r\n\x1a\n') and len(data) >= 24:
        width, height = struct.unpack('>II', data[16:24])
        if width > 0 and height > 0:
            return width, height

    if data.startswith(b'GIF87a') or data.startswith(b'GIF89a'):
        if len(data) >= 10:
            width, height = struct.unpack('<HH', data[6:10])
            if width > 0 and height > 0:
                return width, height

    if suffix in ('.jpg', '.jpeg') or data.startswith(b'\xff\xd8'):
        return read_jpeg_dimensions_from_stream(io.BytesIO(data))

    return None


REMOTE_IMAGE_DIMENSIONS_PATH = Path('data/image_dimensions.json')


@lru_cache(maxsize=1)
def load_remote_image_dimensions():
    """Build-time cache of intrinsic sizes for externally hosted article images.

    Generation stays offline and deterministic: this only reads the checked-in
    cache. Populate or refresh it with scripts/update_image_dimensions.py.
    """
    try:
        raw = json.loads(REMOTE_IMAGE_DIMENSIONS_PATH.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}

    dimensions = {}
    for url, value in (raw.get('images') or {}).items():
        width = parse_dimension_value(value.get('width'))
        height = parse_dimension_value(value.get('height'))
        if width and height:
            dimensions[url] = (width, height)
    return dimensions


def resolve_local_article_image(src):
    parsed = urlparse(src or '')
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None

    raw_path = unquote(parsed.path)
    root = Path.cwd().resolve()
    if raw_path.startswith('/'):
        candidate = root / raw_path.lstrip('/')
    else:
        candidate = root / 'blogs' / raw_path

    try:
        candidate = candidate.resolve()
        candidate.relative_to(root)
    except (OSError, ValueError):
        return None

    return candidate if candidate.exists() else None


def optimize_article_images(html_content):
    """Add browser image scheduling hints to generated article HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    dimension_cache = {}
    remote_dimensions = load_remote_image_dimensions()

    for index, image in enumerate(soup.find_all('img')):
        image['decoding'] = 'async'
        if index > 0:
            image['loading'] = 'lazy'
        elif image.get('loading') == 'lazy':
            del image['loading']

        source = image.get('src') or ''
        local_path = resolve_local_article_image(source)
        if local_path:
            dimensions = dimension_cache.get(local_path)
            if local_path not in dimension_cache:
                dimensions = read_image_dimensions(local_path)
                dimension_cache[local_path] = dimensions
        else:
            # Article photos are hosted off-site; without width/height a lazy
            # image reserves no space and every one of them shifts the layout.
            dimensions = remote_dimensions.get(source)

        if not dimensions:
            continue

        # Not setdefault(): bs4 Tag has no dict API, so tag.setdefault resolves
        # via __getattr__ to find('setdefault') -> None and then raises.
        width, height = dimensions
        if not image.has_attr('width'):
            image['width'] = str(width)
        if not image.has_attr('height'):
            image['height'] = str(height)

    return str(soup)


def lead_image(rendered_html):
    """The article's first image, as a path from the site root."""
    image = BeautifulSoup(rendered_html or '', 'html.parser').find('img')
    source = (image.get('src') or '').strip() if image else ''
    if not source or urlparse(source).scheme:
        return source
    return f"blogs/{source}"


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


def absolute_site_url(path=''):
    base = 'https://simoncos.github.io/'
    normalized = path.lstrip('/')
    return f"{base}{normalized}"


def make_links_absolute(html_content, article_url):
    """Rewrite relative href/src values to absolute URLs.

    - Fragment-only links (#fn:1) → article_url + #fn:1
    - Root-relative links (/blogs/foo.html) → site_base + /blogs/foo.html
    - Already-absolute links and mailto: left unchanged.
    """
    site_base = absolute_site_url().rstrip('/')
    soup = BeautifulSoup(html_content, 'html.parser')
    for tag in soup.find_all(True):
        for attr in ('href', 'src'):
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


def warn_on_metadata_divergence(group_id, reference_post, candidate_post):
    reference_metadata = reference_post.get('metadata', {})
    candidate_metadata = candidate_post.get('metadata', {})

    comparisons = {
        'date': (reference_post.get('date', ''), candidate_post.get('date', '')),
        'tags': (reference_post.get('tags', []), candidate_post.get('tags', [])),
        'series': (reference_metadata.get('series', ''), candidate_metadata.get('series', '')),
        'series_part': (reference_metadata.get('series_part', ''), candidate_metadata.get('series_part', '')),
    }

    for field_name, (reference_value, candidate_value) in comparisons.items():
        if reference_value != candidate_value:
            logging.warning(
                "Metadata divergence in group %s for %s: %s != %s",
                group_id,
                field_name,
                reference_value,
                candidate_value,
            )


def build_article_groups(posts):
    grouped_posts = defaultdict(dict)
    for post in posts:
        grouped_posts[post['group_id']][post['language']] = post

    article_groups = []
    for group_id, languages in grouped_posts.items():
        reference_post = languages.get('zh') or languages.get('en') or next(iter(languages.values()))

        for language_code, post in languages.items():
            if post is reference_post:
                continue
            warn_on_metadata_divergence(group_id, reference_post, post)

        reference_metadata = reference_post.get('metadata', {})
        series_name = reference_metadata.get('series', '').strip()
        series_part = reference_metadata.get('series_part', '').strip()

        group_entry = {
            'id': group_id,
            'date': reference_post.get('date', ''),
            'tags': reference_post.get('tags', []),
            'series': {
                'name': series_name,
                'part': series_part,
            } if series_name else None,
            'languages': {},
        }

        for language_code in ('zh', 'en'):
            if language_code not in languages:
                continue

            post = languages[language_code]
            group_entry['languages'][language_code] = {
                'title': post.get('title', ''),
                'file': post.get('file', ''),
                'markdown': post.get('markdown', ''),
                'html_content': post.get('html_content', ''),
                'rendered_content': post.get('rendered_content', ''),
                'excerpt': post.get('excerpt', ''),
                'description': post.get('metadata', {}).get('description', ''),
                'image': post.get('image', ''),
                'available': True,
            }

        article_groups.append(group_entry)

    article_groups.sort(
        key=lambda group: parse_frontmatter_date(group.get('date', '')) or datetime.min,
        reverse=True,
    )
    return article_groups


def summarize_backlink_source(group):
    languages = {}
    for language_code, entry in (group.get('languages') or {}).items():
        if not entry or not entry.get('file'):
            continue
        languages[language_code] = {
            'title': entry.get('title', ''),
            'file': entry.get('file', ''),
        }

    return {
        'group_id': group.get('id', ''),
        'date': group.get('date', ''),
        'languages': languages,
    }


def group_links_to_files(group, target_files):
    for entry in (group.get('languages') or {}).values():
        html_content = entry.get('html_content') if entry else ''
        if html_content and set(linked_article_files(html_content)) & set(target_files):
            return True
    return False


def build_backlinks_data(article_groups, last_updated):
    files = {}
    for target_group in article_groups:
        target_files = {
            entry.get('file')
            for entry in (target_group.get('languages') or {}).values()
            if entry and entry.get('file')
        }
        if not target_files:
            continue

        backlinks = []
        for source_group in article_groups:
            if source_group.get('id') == target_group.get('id'):
                continue
            if group_links_to_files(source_group, target_files):
                backlinks.append(summarize_backlink_source(source_group))

        backlinks.sort(
            key=lambda item: parse_frontmatter_date(item.get('date', '')) or datetime.min,
            reverse=True,
        )

        for file_name in sorted(target_files):
            files[file_name] = backlinks

    return {
        'last_updated': last_updated,
        'files': files,
    }


def build_article_index(article_groups, last_updated):
    indexed_groups = []
    for group in article_groups:
        indexed_group = {
            'id': group.get('id', ''),
            'date': group.get('date', ''),
            'tags': group.get('tags', []),
            'series': group.get('series'),
            'languages': {},
        }

        for language_code, entry in (group.get('languages') or {}).items():
            indexed_group['languages'][language_code] = {
                'title': entry.get('title', ''),
                'file': entry.get('file', ''),
                'markdown': entry.get('markdown', ''),
                'excerpt': entry.get('excerpt', ''),
                'description': entry.get('description', ''),
                'image': entry.get('image', ''),
                'available': entry.get('available', True),
            }

        indexed_groups.append(indexed_group)

    return {
        'last_updated': last_updated,
        'groups': indexed_groups,
    }

def generate_blog_pages():
    """Main blog generation function with error handling"""
    try:
        ensure_directories()
        
        blog_posts = []

        template = load_template('templates/blog-template.html')
        
        markdown_files = sorted(f for f in os.listdir('blogs') if f.endswith('.md'))
        if not markdown_files:
            logging.warning("No markdown files found in blogs directory")
            return []

        failures = []

        # First pass: collect metadata/content/indexes across all posts
        for md_file in markdown_files:
            try:
                collect_markdown_file(md_file, blog_posts)
            except Exception as e:
                logging.error(f"Error collecting {md_file}: {str(e)}")
                failures.append(f"collect {md_file}: {str(e)}")

        if failures:
            raise BlogGenerationError("Article collection failed:\n- " + "\n- ".join(failures))

        article_groups = build_article_groups(blog_posts)
        backlinks_data = build_backlinks_data(article_groups, None)
        context = {
            'groups': article_groups,
            'group_map': {group['id']: group for group in article_groups},
            'file_index': {
                entry['file']: group
                for group in article_groups
                for entry in (group.get('languages') or {}).values()
                if entry.get('file')
            },
            'sequence': build_article_sequence(article_groups),
            'backlinks': backlinks_data['files'],
            'series_meta': load_series_meta(),
        }

        # Second pass: render each post
        for post in blog_posts:
            try:
                render_blog_post(post, template, context)
            except Exception as e:
                logging.error(f"Error rendering {post.get('markdown')}: {str(e)}")
                failures.append(f"render {post.get('markdown')}: {str(e)}")

        if failures:
            raise BlogGenerationError("Article rendering failed:\n- " + "\n- ".join(failures))

        # Save data files
        existing_index = load_existing_article_index()
        previous_markdown = {
            entry.get('markdown')
            for group in existing_index.get('groups', [])
            for entry in (group.get('languages') or {}).values()
            if entry and entry.get('markdown')
        }
        current_markdown = {post.get('markdown') for post in blog_posts if post.get('markdown')}

        new_post_detected = len(current_markdown - previous_markdown) > 0
        last_updated = existing_index.get('last_updated')
        if new_post_detected or not last_updated:
            last_updated = datetime.now().strftime('%Y-%m-%d')

        save_json_data(build_article_index(article_groups, last_updated), 'article_index.json')
        save_json_data(build_backlinks_data(article_groups, last_updated), 'backlinks_data.json')
        save_rss_feed(blog_posts, 'zh')
        save_rss_feed(blog_posts, 'en')

        generate_blogs_page(article_groups, context['series_meta'])

        logging.info("Blog pages, data, and RSS feeds generated successfully")
        return blog_posts

    except Exception as e:
        logging.error(f"Error generating blog pages: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blog pages: {str(e)}")

def collect_markdown_file(md_file, blog_posts):
    """Collect metadata and rendered content for a markdown file."""
    try:
        markdown_path = os.path.join('blogs', md_file)
        html_file = md_file.replace('.md', '.html')

        with open(markdown_path, 'r', encoding='utf-8') as file:
            md_content = file.read()

        metadata, content = parse_metadata(md_content)
        content = update_image_paths(content)

        try:
            html_content = markdown.markdown(
                content,
                extensions=[
                    'markdown.extensions.fenced_code',
                    'markdown.extensions.attr_list',
                    'markdown.extensions.footnotes',
                    AnnotateExtension()
                ]
            )
        except Exception as e:
            logging.error(f"Markdown conversion error in {md_file}: {str(e)}")
            raise BlogGenerationError(f"Markdown conversion failed: {str(e)}")

        html_content = localize_footnotes(html_content, is_english=md_file.endswith('.en.md'))
        html_content = optimize_article_images(html_content)
        title, rendered_post_content = extract_title_and_content(html_content)
        excerpt = build_post_excerpt(content)
        image = lead_image(rendered_post_content)

        tags = metadata.get('tags', '').split(',')
        tags = [tag.strip() for tag in tags if tag.strip()]

        blog_posts.append({
            "title": title,
            "file": html_file,
            "markdown": md_file,
            "group_id": infer_group_id(md_file),
            "language": infer_language_code(md_file),
            "html_content": html_content,
            "rendered_content": rendered_post_content,
            "excerpt": excerpt,
            "image": image,
            "date": metadata.get('date', ''),
            "metadata": metadata,
            "markdown_path": markdown_path,
            "tags": tags,
        })

    except Exception as e:
        logging.error(f"Error collecting markdown file {md_file}: {str(e)}")
        raise BlogGenerationError(f"Failed to collect markdown file: {str(e)}")


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
            f'<div class="series-box"><span class="k">{text["series"]} · {esc(title)}</span>{"".join(rows)}</div>'
        )

    if post['tags']:
        tags = ''.join(
            f'<a class="tag" href="../blogs.html#topic-{quote(tag)}">{esc(tag_label(tag, language))}</a>'
            for tag in post['tags']
        )
        parts.append(f'<div class="article-tags"><span class="k">{text["tags"]}</span>{tags}</div>')

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
            f'<div class="xrefs"><span class="k">{text["links_out"]}</span>'
            + ''.join(link_row(group) for group in outgoing) + '</div>'
        )
    incoming = [group_map[item['group_id']] for item in backlinks if item.get('group_id') in group_map]
    if incoming:
        boxes.append(
            f'<div class="xrefs"><span class="k">{text["links_in"]}</span>'
            + ''.join(link_row(group) for group in incoming) + '</div>'
        )
    else:
        boxes.append(
            f'<div class="xrefs is-empty"><span class="k">{text["links_in"]}</span>'
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

def save_json_data(data, filename):
    """Save JSON data with error handling"""
    try:
        os.makedirs('data', exist_ok=True)
        filepath = os.path.join('data', filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logging.info(f"Successfully saved {filename}")
    except Exception as e:
        logging.error(f"Error saving {filename}: {str(e)}")
        raise BlogGenerationError(f"Failed to save {filename}: {str(e)}")

def load_template(template_path):
    """Load template file with error handling"""
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        logging.error(f"Template file not found: {template_path}")
        raise BlogGenerationError(f"Template file not found: {template_path}")
    except Exception as e:
        logging.error(f"Error loading template {template_path}: {str(e)}")
        raise BlogGenerationError(f"Failed to load template: {str(e)}")

def get_creation_date(file_path):
    return datetime.fromtimestamp(os.path.getmtime(file_path))

def load_existing_article_index():
    """Load the lightweight article index to preserve its update metadata."""
    filepath = os.path.join('data', 'article_index.json')
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get('groups'), list):
            return data
    except FileNotFoundError:
        return {'last_updated': None, 'groups': []}
    except Exception as e:
        logging.error(f"Error loading article_index.json: {str(e)}")
        return {'last_updated': None, 'groups': []}

    return {'last_updated': None, 'groups': []}

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

def day_label(date_value):
    day = parse_frontmatter_date(date_value)
    if not day:
        return date_value, date_value
    return f"{MONTH_NAMES[day.month - 1][:3]} {day.day}", f"{day.month} 月 {day.day} 日"


def month_label(key):
    year, month = int(key[:4]), int(key[5:7])
    return f"{MONTH_NAMES[month - 1]} {year}", f"{year} 年 {month} 月"


def count_label(n):
    return (f"{n} article" if n == 1 else f"{n} articles"), f"{n} 篇"


def render_article_row(group, article_groups, series_meta, is_open):
    """One row of the Articles list: date, title, other-language title,
    series pill, and the folding excerpt."""
    languages = group.get('languages') or {}
    en = languages.get('en') or {}
    zh = languages.get('zh') or {}
    title_en = en.get('title') or zh.get('title', '')
    title_zh = zh.get('title') or title_en
    desc_en = en.get('description') or zh.get('description') or ''
    desc_zh = zh.get('description') or desc_en
    href_en = f"blogs/{(en or zh).get('file', '')}"
    href_zh = f"blogs/{(zh or en).get('file', '')}"
    group_id = group['id']
    tags = group.get('tags') or []
    day_en, day_zh = day_label(group.get('date', ''))

    alt = ''
    if title_en != title_zh:
        alt = (
            '<span class="arow-alt"><span data-l="en" lang="zh-Hans">'
            f'{esc(title_zh)}</span><span data-l="zh">{esc(title_en)}</span></span>'
        )

    series_html = ''
    series_attr = ''
    series = group.get('series')
    if series:
        info = series_info(series['name'], series_meta)
        parts = series_parts(article_groups, series['name'])
        index = next(i for i, part in enumerate(parts) if part['id'] == group_id)
        pips = ''.join(
            f'<span class="pip{" is-on" if i == index else ""}"></span>' for i in range(len(parts))
        )
        part_en = f"{index + 1} of {len(parts)}"
        part_zh = f"第 {index + 1} / {len(parts)} 篇"
        series_attr = f' data-series="{esc(info["id"])}"'
        series_html = (
            f'<button class="series-pill" type="button" data-to-series="{esc(info["id"])}">'
            f'<span class="pips" aria-hidden="true">{pips}</span>'
            f'<span class="series-name">{bi(info["title"].get("en", ""), info["title"].get("zh"))}</span>'
            f'<span class="series-of">{bi(part_en, part_zh)}</span>'
            '<span class="series-go" aria-hidden="true">→</span></button>'
        )

    search = ' '.join([title_en, title_zh, desc_en, desc_zh]).lower()
    bilingual = '<span class="arow-bi">中文 / EN</span>' if en and zh else ''
    tag_pills = ''.join(
        f'<span class="tag-label">{bi(*TAG_LABELS.get(tag, (tag, tag)))}</span>' for tag in tags
    )
    expanded = 'true' if is_open else 'false'
    return '\n'.join([
        f'                <article class="arow{" is-open" if is_open else ""}" id="a-{esc(group_id)}" '
        f'data-tags="{esc(" ".join(tags))}"{series_attr} data-search="{esc(search)}">',
        '                    <div class="arow-top">',
        f'                        <span class="arow-date"><span class="num">{bi(day_en, day_zh)}</span>{bilingual}</span>',
        '                        <span class="arow-main">',
        f'                            <button class="arow-title" type="button" aria-expanded="{expanded}" aria-controls="ex-{esc(group_id)}">'
        f'{bi(title_en, title_zh)}</button>',
        f'                            {alt}{series_html}',
        '                        </span>',
        f'                        <button class="arow-toggle" type="button" aria-expanded="{expanded}" aria-controls="ex-{esc(group_id)}"'
        f'{i18n_attrs(aria_label=("Toggle excerpt", "展开摘要"))}>+</button>',
        '                    </div>',
        f'                    <div class="arow-ex" id="ex-{esc(group_id)}">',
        '                        <div class="arow-ex-clip"><div class="arow-ex-in">',
        '                            <span class="arow-spacer" aria-hidden="true"></span>',
        '                            <div class="arow-ex-body">',
        f'                                <p>{bi(desc_en, desc_zh)}</p>',
        '                                <div class="arow-actions">'
        f'<a class="pill pill-ink read-pill"{i18n_attrs(href=(href_en, href_zh))}>{bi("Read", "阅读")}<span aria-hidden="true">→</span></a>'
        f'{tag_pills}</div>',
        '                            </div>',
        '                        </div></div>',
        '                    </div>',
        '                </article>',
    ])


def render_series_card(info, parts, index):
    """A series as a route: numbered parts on a line, the chosen one below."""
    dates = sorted(group.get('date', '')[:7] for group in parts if group.get('date'))
    span = dates[0] if dates and dates[0] == dates[-1] else (f"{dates[0]} — {dates[-1]}" if dates else '')
    meta_en = f"{len(parts)} published" + (f" · {span}" if span else '')
    meta_zh = f"已发布 {len(parts)} 篇" + (f" · {span}" if span else '')

    nodes = []
    details = []
    for i, group in enumerate(parts):
        languages = group.get('languages') or {}
        en = languages.get('en') or {}
        zh = languages.get('zh') or {}
        title_en = en.get('title') or zh.get('title', '')
        title_zh = zh.get('title') or title_en
        desc_en = en.get('description') or zh.get('description') or ''
        desc_zh = zh.get('description') or desc_en
        part = group['series'].get('part') or i + 1
        state = ' is-sel' if i == 0 else ''
        nodes.append(
            f'<button class="rnode{state}" type="button" data-part="{i}" aria-pressed="{"true" if i == 0 else "false"}">'
            + ('<span class="rseg" aria-hidden="true"></span>' if i < len(parts) - 1 else '')
            + f'<span class="rnum">{esc(part)}</span>'
            f'<span class="rtext"><span class="rdate num">{esc(group.get("date", ""))}</span>'
            f'<span class="rtitle">{bi(title_en, title_zh)}</span></span></button>'
        )
        cta = bi("Start here", "从这里开始") if i == 0 else bi("Read", "阅读")
        href = i18n_attrs(href=(f"blogs/{(en or zh).get('file', '')}", f"blogs/{(zh or en).get('file', '')}"))
        details.append(
            f'<div class="spart{state}" data-part-detail="{i}">'
            '<div class="spart-text">'
            f'<span class="k-soft">{bi(f"Part {part}", f"第 {part} 篇")}</span>'
            f'<span class="spart-title">{bi(title_en, title_zh)}</span>'
            f'<p>{bi(desc_en, desc_zh)}</p></div>'
            f'<a class="pill pill-ink read-pill"{href}>{cta}<span aria-hidden="true">→</span></a></div>'
        )

    first = parts[0]['series'].get('part') or 1
    return '\n'.join([
        f'            <section class="scard is-focus" id="series-{esc(info["id"])}" data-series="{esc(info["id"])}" '
        f'style="--n:{len(parts)};--delay:{index * 0.08:.2f}s">',
        '                <div class="scard-head">',
        '                    <div class="scard-text">',
        f'                        <span class="k-soft">{bi(meta_en, meta_zh)}</span>',
        f'                        <h2>{bi(info["title"].get("en", ""), info["title"].get("zh"))}</h2>',
        (f'                        <p>{bi(info["desc"].get("en", ""), info["desc"].get("zh"))}</p>' if info['desc'] else ''),
        '                    </div>',
        f'                    <span class="scard-prog num" data-prog>{bi(f"Part {first} / {len(parts)}", f"第 {first} / {len(parts)} 篇")}</span>',
        '                </div>',
        f'                <div class="route">{"".join(nodes)}</div>',
        f'                <div class="sdetail"><div class="sdetail-clip">{"".join(details)}</div></div>',
        '            </section>',
    ])


def render_articles_main(article_groups, series_meta):
    groups = [group for group in article_groups if group.get('languages')]
    counts = defaultdict(int)
    for group in groups:
        for tag in group.get('tags') or []:
            counts[tag] += 1
    tag_order = [tag for tag in TAG_LABELS if counts.get(tag)] + sorted(
        tag for tag in counts if tag not in TAG_LABELS
    )

    chips = [
        '<button class="chip" type="button" data-tag="all" aria-pressed="true">'
        f'{bi("All", "全部")} <span class="seg-n">{len(groups)}</span></button>'
    ]
    for tag in tag_order:
        chips.append(
            f'<button class="chip" type="button" data-tag="{esc(tag)}" aria-pressed="false">'
            f'{bi(*TAG_LABELS.get(tag, (tag, tag)))} <span class="seg-n">{counts[tag]}</span></button>'
        )
    chips.append(
        f'<a class="rss-pill"{i18n_attrs(href=("feed.en.xml", "feed.zh.xml"))}>RSS <span aria-hidden="true">↗</span></a>'
    )

    months = defaultdict(list)
    for group in groups:
        months[(group.get('date') or '')[:7]].append(group)
    month_blocks = []
    first = True
    for key in sorted(months, reverse=True):
        rows = []
        for group in months[key]:
            rows.append(render_article_row(group, groups, series_meta, first))
            first = False
        label_en, label_zh = month_label(key) if key else ('Undated', '未注明日期')
        n_en, n_zh = count_label(len(months[key]))
        month_blocks.append('\n'.join([
            f'            <section class="amonth" data-month="{esc(key)}">',
            f'                <div class="amonth-head"><h2>{bi(label_en, label_zh)}</h2>'
            f'<span class="amonth-n" data-month-count>{bi(n_en, n_zh)}</span></div>',
            *rows,
            '            </section>',
        ]))

    series_names = []
    for group in groups:
        name = (group.get('series') or {}).get('name')
        if name and name not in series_names:
            series_names.append(name)
    series_cards = [
        render_series_card(series_info(name, series_meta), series_parts(groups, name), index)
        for index, name in enumerate(series_names)
    ]

    return '\n'.join([
        '    <main id="main" class="articles enter" data-articles tabindex="-1">',
        '        <section class="ahead">',
        f'            <h1 class="page-h1">{bi("Articles", "文章")}<sup class="ahead-n num" data-shown>{len(groups)}</sup></h1>',
        '            <div class="ahead-tools">',
        f'                <div class="seg" role="group"{i18n_attrs(aria_label=("View", "视图"))}>'
        '<button class="seg-btn" type="button" data-view="list" aria-pressed="true">'
        f'{bi("All articles", "全部文章")} <span class="seg-n">{len(groups)}</span></button>'
        '<button class="seg-btn" type="button" data-view="series" aria-pressed="false">'
        f'{bi("Series", "系列")} <span class="seg-n">{len(series_cards)}</span></button></div>',
        '                <label class="search" data-list-only><span class="search-icon" aria-hidden="true">⌕</span>'
        f'<input type="search" data-search autocomplete="off"'
        f'{i18n_attrs(placeholder=("Search titles and excerpts", "搜索标题和摘要"), aria_label=("Search titles and excerpts", "搜索标题和摘要"))}>'
        '</label>',
        '            </div>',
        '        </section>',
        '        <div class="alist-view" data-view-panel="list" id="topics">',
        f'            <div class="tagbar" role="group"{i18n_attrs(aria_label=("Tags", "标签"))}>{"".join(chips)}</div>',
        '            <div class="alist">',
        *month_blocks,
        f'                <p class="aempty" data-empty hidden>{bi("Nothing matches that yet.", "暂时没有匹配的文章。")}</p>',
        '            </div>',
        '        </div>',
        '        <div class="series-view" data-view-panel="series" id="reading-paths">',
        *series_cards,
        '        </div>',
        '    </main>',
    ])


def generate_blogs_page(article_groups, series_meta):
    """Render the Articles page: every article and series is in the HTML;
    articles.js only filters, folds and switches views."""
    try:
        with open('templates/blogs-listing-template.html', 'r', encoding='utf-8') as template_file:
            template = template_file.read()

        page = template.replace('{{ARTICLES}}', render_articles_main(article_groups, series_meta))
        with open('blogs.html', 'w', encoding='utf-8') as f:
            f.write(page)

        logging.info("Successfully generated blogs listing page")

    except Exception as e:
        logging.error(f"Error in blogs page generation: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blogs page: {str(e)}")

if __name__ == "__main__":
    configure_logging()
    try:
        generate_blog_pages()
    except BlogGenerationError as e:
        logging.error(f"Blog generation failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        sys.exit(1)
