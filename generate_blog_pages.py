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

SITE_TIMEZONE = timezone(timedelta(hours=8))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('blog_generator.log'),
        logging.StreamHandler()
    ]
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
        'alt': 'simonc site — tools and research, essays and field notes',
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


def build_post_nav(neighbours, language):
    if not neighbours:
        return ''

    labels = {
        'en': {'newer': 'Newer', 'older': 'Older'},
        'zh': {'newer': '更新的一篇', 'older': '更早的一篇'},
    }[language if language in ('en', 'zh') else 'en']

    links = []
    for direction, rel in (('newer', 'prev'), ('older', 'next')):
        entry = neighbours.get(direction)
        if not entry or not entry.get('file'):
            continue
        title = html_lib.escape(entry.get('title') or '')
        links.append(
            f'            <a class="post-nav-link post-nav-{direction}" rel="{rel}" '
            f'href="{html_lib.escape(entry["file"], quote=True)}">'
            f'<span class="post-nav-label">{labels[direction]}</span>'
            f'<span class="post-nav-title">{title}</span></a>'
        )

    if not links:
        return ''

    heading = 'More reading' if language != 'zh' else '继续阅读'
    return (
        '        <nav class="post-nav" aria-label="' + heading + '">\n'
        + '\n'.join(links) + '\n'
        + '        </nav>'
    )


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


def build_post_meta_extra(metadata):
    """Render optional provenance rows that belong beside Created/Updated.

    `written` (when the piece was actually composed, which can predate
    publication) and `translation` used to sit as bare paragraphs at the top of
    the body, where they read as stray text and got scraped into the meta
    description. They are metadata, so they render as metadata.
    """
    rows = []

    written = (metadata.get('written') or '').strip()
    if written:
        rows.append(
            '                        <div class="post-meta-item">'
            '<span class="post-meta-label" data-i18n="written">Written</span>'
            f'<span data-date="{html_lib.escape(written, quote=True)}" data-date-format="medium">'
            f'{html_lib.escape(written)}</span></div>'
        )

    translation = (metadata.get('translation') or '').strip()
    if translation:
        rows.append(
            '                        <div class="post-meta-item">'
            '<span class="post-meta-label" data-i18n="translation">Translation</span>'
            f'<span>{html_lib.escape(translation)}</span></div>'
        )

    return '\n'.join(rows)


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


def get_site_version():
    """Return version string from git describe, e.g. v1.0 or v1.0-3-gabcdef."""
    override = os.environ.get('SITE_VERSION_OVERRIDE')
    if override:
        return override

    try:
        import subprocess
        result = subprocess.run(
            ['git', 'describe', '--tags', '--always'],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except Exception:
        return 'unknown'


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

    title = 'simonc site RSS (中文)' if language_code == 'zh' else 'simonc site RSS (English)'
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
        if not html_content:
            continue

        soup = BeautifulSoup(html_content, 'html.parser')
        for anchor in soup.find_all('a', href=True):
            if anchor.get('href') in target_files:
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
        
        tags_data = defaultdict(list)
        series_data = defaultdict(list)
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
                collect_markdown_file(md_file, tags_data, series_data, blog_posts)
            except Exception as e:
                logging.error(f"Error collecting {md_file}: {str(e)}")
                failures.append(f"collect {md_file}: {str(e)}")

        if failures:
            raise BlogGenerationError("Article collection failed:\n- " + "\n- ".join(failures))

        article_groups = build_article_groups(blog_posts)
        article_group_map = {group['id']: group for group in article_groups}
        article_sequence = build_article_sequence(article_groups)

        # Second pass: render each post
        for post in blog_posts:
            try:
                render_blog_post(post, template, article_group_map, article_sequence)
            except Exception as e:
                logging.error(f"Error rendering {post.get('markdown')}: {str(e)}")
                failures.append(f"render {post.get('markdown')}: {str(e)}")

        if failures:
            raise BlogGenerationError("Article rendering failed:\n- " + "\n- ".join(failures))

        # Save data files
        blog_data = load_existing_blog_data()
        previous_posts = blog_data.get('posts', [])
        previous_markdown = {post.get('markdown') for post in previous_posts if post.get('markdown')}
        current_markdown = {post.get('markdown') for post in blog_posts if post.get('markdown')}

        new_post_detected = len(current_markdown - previous_markdown) > 0
        last_updated = blog_data.get('last_updated')
        if new_post_detected or not last_updated:
            last_updated = datetime.now().strftime('%Y-%m-%d')

        save_json_data({'last_updated': last_updated, 'posts': blog_posts}, 'blog_data.json')
        save_json_data({'last_updated': last_updated, 'groups': article_groups}, 'article_groups.json')
        save_json_data(build_article_index(article_groups, last_updated), 'article_index.json')
        save_json_data(build_backlinks_data(article_groups, last_updated), 'backlinks_data.json')
        save_json_data(series_data, 'series_data.json')
        save_json_data(tags_data, 'tags_data.json')
        save_rss_feed(blog_posts, 'zh')
        save_rss_feed(blog_posts, 'en')

        logging.info("Blog pages, data, and RSS feeds generated successfully")
        return blog_posts

    except Exception as e:
        logging.error(f"Error generating blog pages: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blog pages: {str(e)}")

def collect_markdown_file(md_file, tags_data, series_data, blog_posts):
    """Collect metadata, content, and indexes for a markdown file."""
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

        tags = metadata.get('tags', '').split(',')
        tags = [tag.strip() for tag in tags if tag.strip()]
        for tag in tags:
            tags_data[tag].append({
                'title': title,
                'file': html_file
            })

        series_name = metadata.get('series', '').strip()
        if series_name:
            series_data[series_name].append({
                'title': title,
                'file': html_file,
                'part': metadata.get('series_part', '')
            })

        blog_posts.append({
            "title": title,
            "file": html_file,
            "markdown": md_file,
            "group_id": infer_group_id(md_file),
            "language": infer_language_code(md_file),
            "html_content": html_content,
            "rendered_content": rendered_post_content,
            "excerpt": excerpt,
            "date": metadata.get('date', ''),
            "metadata": metadata,
            "markdown_path": markdown_path,
            "tags": tags,
        })

    except Exception as e:
        logging.error(f"Error collecting markdown file {md_file}: {str(e)}")
        raise BlogGenerationError(f"Failed to collect markdown file: {str(e)}")


def render_blog_post(post, template, article_group_map, article_sequence=None):
    """Render and save individual blog post."""
    try:
        md_file = post['markdown']
        html_file = post['file']
        metadata = post['metadata']
        title = post['title']
        rendered_post_content = post['rendered_content']
        markdown_path = post['markdown_path']
        tags = post['tags']

        article_group = article_group_map.get(post['group_id'], {})
        article_languages = article_group.get('languages', {})
        target_language = 'zh' if post['language'] == 'en' else 'en'
        paired_entry = article_languages.get(target_language)
        paired_label = '中文' if target_language == 'zh' else 'English'

        if paired_entry and paired_entry.get('file'):
            lang_switch_html = (
                f'<div class="lang-switch">'
                f'<a class="lang-switch-link" data-language-switch data-target-language="{target_language}" href="{paired_entry["file"]}">{paired_label}</a>'
                f'</div>'
            )
        else:
            lang_switch_html = ''

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
        og_locale = 'zh_CN' if post['language'] == 'zh' else 'en_US'
        post_meta_extra = build_post_meta_extra(metadata)
        og_image = build_og_image(rendered_post_content, title)
        reading_minutes = estimate_reading_minutes(rendered_post_content)
        post_nav = build_post_nav((article_sequence or {}).get(html_file), post['language'])

        tags_html = '<ul class="tag-list">' + ''.join([
            f'<li><a href="../blogs.html#topic-{quote(tag)}">{html_lib.escape(tag)}</a></li>'
            for tag in tags
        ]) + '</ul>'

        head_extras = build_head_extras(metadata)

        page_content = template.replace('{{TITLE}}', title)
        page_content = page_content.replace('{{TITLE_ATTR}}', html_lib.escape(title, quote=True))
        page_content = page_content.replace('{{META_DESCRIPTION}}', html_lib.escape(meta_description, quote=True))
        page_content = page_content.replace('{{CANONICAL_URL}}', canonical_url)
        hreflang_alternates = build_hreflang_alternates(article_languages)
        page_content = page_content.replace(
            '\n{{HREFLANG_ALTERNATES}}', f'\n{hreflang_alternates}' if hreflang_alternates else ''
        )
        page_content = page_content.replace('{{OG_LOCALE}}', og_locale)
        page_content = page_content.replace('{{OG_IMAGE}}', html_lib.escape(og_image['url'], quote=True))
        page_content = page_content.replace('{{OG_IMAGE_WIDTH}}', og_image['width'])
        page_content = page_content.replace('{{OG_IMAGE_HEIGHT}}', og_image['height'])
        page_content = page_content.replace('{{OG_IMAGE_ALT}}', html_lib.escape(og_image['alt'], quote=True))
        page_content = page_content.replace('{{PAGE_LANGUAGE}}', 'zh-CN' if post['language'] == 'zh' else 'en')
        page_content = page_content.replace('{{ARTICLE_GROUP_ID}}', post['group_id'])
        page_content = page_content.replace('{{ARTICLE_LANGUAGE}}', post['language'])
        page_content = page_content.replace('{{ARTICLE_EN_FILE}}', article_languages.get('en', {}).get('file', ''))
        page_content = page_content.replace('{{ARTICLE_ZH_FILE}}', article_languages.get('zh', {}).get('file', ''))
        page_content = page_content.replace('{{CONTENT}}', rendered_post_content)
        page_content = page_content.replace('{{CREATED}}', created)
        page_content = page_content.replace('{{UPDATED}}', updated)
        # Consume the placeholder's own line when there is nothing to render.
        page_content = page_content.replace(
            '\n{{POST_META_EXTRA}}', f'\n{post_meta_extra}' if post_meta_extra else ''
        )
        page_content = page_content.replace('{{TAGS}}', tags_html)
        page_content = page_content.replace('{{READING_MINUTES}}', str(reading_minutes))
        page_content = page_content.replace(
            '\n{{POST_NAV}}', f'\n{post_nav}' if post_nav else ''
        )
        page_content = page_content.replace('{{LANG_SWITCH}}', lang_switch_html)
        page_content = page_content.replace('{{HEAD_EXTRAS}}', head_extras)
        page_content = page_content.replace('{{SITE_VERSION}}', get_site_version())

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

def load_existing_blog_data():
    """Load existing blog_data.json if present to preserve last_updated."""
    filepath = os.path.join('data', 'blog_data.json')
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            return {'last_updated': None, 'posts': data}
        if isinstance(data, dict) and isinstance(data.get('posts'), list):
            return data
    except FileNotFoundError:
        return {'last_updated': None, 'posts': []}
    except Exception as e:
        logging.error(f"Error loading blog_data.json: {str(e)}")
        return {'last_updated': None, 'posts': []}

    return {'last_updated': None, 'posts': []}

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

def infer_language_label(file_name):
    return 'EN' if file_name.endswith('.en.html') else '中文'

def generate_blogs_page(blog_posts):
    """Generate the blogs listing shell; archive previews are rendered client-side."""
    try:
        with open('templates/blogs-listing-template.html', 'r', encoding='utf-8') as template_file:
            template = template_file.read()

        with open('blogs.html', 'w', encoding='utf-8') as f:
            f.write(template.replace('{{SITE_VERSION}}', get_site_version()))

        logging.info("Successfully generated blogs listing page")

    except Exception as e:
        logging.error(f"Error in blogs page generation: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blogs page: {str(e)}")

if __name__ == "__main__":
    try:
        blog_posts = generate_blog_pages()
        generate_blogs_page(blog_posts)
    except BlogGenerationError as e:
        logging.error(f"Blog generation failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}")
        sys.exit(1)
