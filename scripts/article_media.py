"""Article pipeline: media."""
import os
import re
import io
import json
import struct
from functools import lru_cache
from bs4 import BeautifulSoup
from urllib.parse import unquote, urljoin, urlparse
from pathlib import Path

from article_feeds import absolute_site_url


def og_fallback_image():
    """The site's own share card, used when an article has no usable lead photo."""
    return {
        'url': absolute_site_url('assets/og/og-site-v2.jpg'),
        'width': '1200',
        'height': '630',
        'alt': 'simoncos — connecting the dots.',
    }


OG_SAFE_IMAGE_SUFFIXES = ('.png', '.jpg', '.jpeg', '.gif')


def build_og_image(rendered_html, title):
    """Pick the share image for an article: its lead photo, else a film's
    poster, else the site card.

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

    # An article led by a film rather than a photo shares the film's poster.
    for video in soup.find_all('video'):
        poster = (video.get('poster') or '').strip()
        width, height = video.get('width'), video.get('height')
        if not poster or not urlparse(poster).path.lower().endswith(OG_SAFE_IMAGE_SUFFIXES):
            continue
        if not width or not height or int(width) < 315 or int(height) < 315:
            continue
        return {
            'url': urljoin(absolute_site_url('blogs/'), poster),
            'width': str(width),
            'height': str(height),
            'alt': (video.get('aria-label') or title).strip() or title,
        }

    return og_fallback_image()


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


def render_loop_videos(soup):
    """Turn `![alt](clip.mp4)` into a silent looping clip.

    Clips stand in for animated GIFs (scripts/localize_images.py converts
    them). The .jpg of the same name is the poster and gives the clip its
    size. Controls stay in the HTML for readers without scripts; article.js
    hides them and plays the clip unless the reader prefers reduced motion.
    """
    for image in soup.find_all('img'):
        source = image.get('src') or ''
        parsed = urlparse(source)
        if not parsed.path.lower().endswith('.mp4'):
            continue
        alt = (image.get('alt') or '').strip()
        video = soup.new_tag('video')
        video['class'] = 'post-loop'
        video['src'] = source
        poster = parsed._replace(path=parsed.path[:-len('.mp4')] + '.jpg').geturl()
        poster_path = resolve_local_article_image(poster)
        if poster_path:
            video['poster'] = poster
            dimensions = read_image_dimensions(poster_path)
            if dimensions:
                video['width'], video['height'] = (str(value) for value in dimensions)
        for flag in ('controls', 'loop', 'muted', 'playsinline'):
            video[flag] = ''
        video['preload'] = 'metadata'
        if alt:
            video['aria-label'] = alt
            video.string = alt
        image.replace_with(video)


def optimize_article_images(html_content):
    """Add browser image scheduling hints to generated article HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    render_loop_videos(soup)
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

        if local_path and not image.has_attr('srcset'):
            add_phone_variant(image, source, local_path, width)

    return str(soup)


ARTICLE_IMAGE_SIZES = '(max-width: 800px) calc(100vw - 40px), 760px'


PHONE_VARIANT_SUFFIX = '.1080w.webp'  # written by scripts/image_variants.py


PHONE_VARIANT_WIDTH = 1080


def add_phone_variant(image, source, local_path, width):
    """Offer the 1080 px copy beside an article image as a srcset candidate.

    The original stays as `src` (share cards, feeds, browsers without srcset);
    a phone at up to three device pixels per CSS pixel picks the smaller file.
    """
    variant = local_path.with_name(local_path.stem + PHONE_VARIANT_SUFFIX)
    if width <= PHONE_VARIANT_WIDTH or not variant.exists():
        return
    parsed = urlparse(source)
    variant_source = parsed._replace(
        path=parsed.path[: len(parsed.path) - len(Path(parsed.path).name)] + variant.name
    ).geturl()
    image['srcset'] = f'{variant_source} {PHONE_VARIANT_WIDTH}w, {source} {width}w'
    image['sizes'] = ARTICLE_IMAGE_SIZES


def wrap_embedded_pages(html_content, is_english=False):
    """Keep an embedded page from trapping a finger that scrolls the article.

    `<iframe class="embedded-page">` is a tall scrolling page inside the
    article. On a touch screen or a narrow window, a swipe that lands on it
    scrolls the frame instead of the article. Each one is wrapped with a cover
    link to the same page in a new tab: on coarse pointers and narrow screens
    the CSS lays the cover over the frame, so a swipe scrolls the article and
    a tap opens the page full screen; elsewhere the cover is hidden and the
    frame works as before. The label is the iframe's `data-open-label`, or a
    generic one. A paragraph right after the frame that is only a link to the
    same page duplicates the cover there, so it is marked `embed-fallback` and
    the CSS hides it wherever the cover shows.
    """
    if 'embedded-page' not in html_content:
        return html_content
    soup = BeautifulSoup(html_content, 'html.parser')
    for frame in soup.select('iframe.embedded-page'):
        if frame.parent and 'embed-frame' in (frame.parent.get('class') or []):
            continue
        source = frame.get('src') or ''
        label = (frame.get('data-open-label') or '').strip() or (
            'Open full screen' if is_english else '全屏打开'
        )
        if frame.has_attr('data-open-label'):
            del frame['data-open-label']
        wrapper = soup.new_tag('div')
        wrapper['class'] = 'embed-frame'
        frame.wrap(wrapper)
        cover = soup.new_tag('a', href=source, target='_blank', rel='noopener')
        cover['class'] = 'embed-cover'
        cover['data-noext'] = ''
        text = soup.new_tag('span')
        text['class'] = 'embed-cover-label'
        text.string = f'{label} ↗'
        cover.append(text)
        wrapper.append(cover)
        after = wrapper.find_next_sibling()
        links = after.find_all('a') if after and after.name == 'p' else []
        if (
            len(links) == 1
            and links[0].get('href') == source
            and after.get_text(strip=True) == links[0].get_text(strip=True)
        ):
            after['class'] = 'embed-fallback'
    return str(soup)


def lead_image(rendered_html):
    """The article's first image, as a path from the site root."""
    image = BeautifulSoup(rendered_html or '', 'html.parser').find('img')
    source = (image.get('src') or '').strip() if image else ''
    if not source or urlparse(source).scheme:
        return source
    return f"blogs/{source}"
