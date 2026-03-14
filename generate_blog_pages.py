import os
import sys
import re
import json
import html as html_lib
import markdown
import logging
from datetime import datetime
from collections import defaultdict
from markdown.inlinepatterns import InlineProcessor
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
from xml.etree import ElementTree
from bs4 import BeautifulSoup, NavigableString
from urllib.parse import quote
from pathlib import Path
from email.utils import format_datetime

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
            'date': ''
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

def get_file_times_with_metadata(file_path, metadata_date):
    """Prefer frontmatter date for created date, use file mtime for updated date."""
    try:
        stats = os.stat(file_path)
        updated = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d')
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        updated = datetime.now().strftime('%Y-%m-%d')

    created_dt = parse_frontmatter_date(metadata_date)
    if created_dt:
        created = created_dt.strftime('%Y-%m-%d')
    else:
        created = updated

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


def absolute_site_url(path=''):
    base = 'https://simoncos.github.io/'
    normalized = path.lstrip('/')
    return f"{base}{normalized}"


def strip_html_excerpt(html_content, max_length=280):
    soup = BeautifulSoup(html_content, 'html.parser')
    text = ' '.join(soup.stripped_strings)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) <= max_length:
        return text
    return text[:max_length].rstrip() + '…'


def build_rss_feed(posts, language_code):
    rss = ElementTree.Element('rss', attrib={
        'version': '2.0',
        'xmlns:atom': 'http://www.w3.org/2005/Atom'
    })
    channel = ElementTree.SubElement(rss, 'channel')

    title = 'simonc site RSS (中文)' if language_code == 'zh' else 'simonc site RSS (English)'
    description = '中文文章订阅' if language_code == 'zh' else 'English posts feed'
    feed_name = f'feed.{language_code}.xml'

    ElementTree.SubElement(channel, 'title').text = title
    ElementTree.SubElement(channel, 'link').text = absolute_site_url()
    ElementTree.SubElement(channel, 'description').text = description
    ElementTree.SubElement(channel, 'language').text = 'zh-CN' if language_code == 'zh' else 'en'
    ElementTree.SubElement(channel, 'generator').text = 'generate_blog_pages.py'
    ElementTree.SubElement(channel, 'lastBuildDate').text = format_datetime(datetime.now().astimezone())

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
            pub_dt = pub_dt.replace(hour=0, minute=0, second=0)
            ElementTree.SubElement(item, 'pubDate').text = format_datetime(pub_dt.astimezone())

        description_text = post.get('excerpt') or strip_html_excerpt(post.get('rendered_content', '') or post.get('html_content', ''))
        ElementTree.SubElement(item, 'description').text = description_text

    return ElementTree.tostring(rss, encoding='utf-8', xml_declaration=True).decode('utf-8')


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

def generate_blog_pages():
    """Main blog generation function with error handling"""
    try:
        ensure_directories()
        
        tags_data = defaultdict(list)
        series_data = defaultdict(list)
        blog_posts = []

        template = load_template('templates/blog-template.html')
        
        markdown_files = [f for f in os.listdir('blogs') if f.endswith('.md')]
        if not markdown_files:
            logging.warning("No markdown files found in blogs directory")
            return []

        # First pass: collect metadata/content/indexes across all posts
        for md_file in markdown_files:
            try:
                collect_markdown_file(md_file, tags_data, series_data, blog_posts)
            except Exception as e:
                logging.error(f"Error collecting {md_file}: {str(e)}")
                continue

        article_groups = build_article_groups(blog_posts)
        article_group_map = {group['id']: group for group in article_groups}

        # Second pass: render each post
        for post in blog_posts:
            try:
                render_blog_post(post, template, article_group_map)
            except Exception as e:
                logging.error(f"Error rendering {post.get('markdown')}: {str(e)}")
                continue

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


def render_blog_post(post, template, article_group_map):
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

        created, updated = get_file_times_with_metadata(markdown_path, metadata.get('date', ''))

        tags_html = '<ul class="tag-list">' + ''.join([
            f'<li><a href="../tags.html#{quote(tag)}">{html_lib.escape(tag)}</a></li>'
            for tag in tags
        ]) + '</ul>'

        page_content = template.replace('{{TITLE}}', title)
        page_content = page_content.replace('{{PAGE_LANGUAGE}}', 'zh-CN' if post['language'] == 'zh' else 'en')
        page_content = page_content.replace('{{ARTICLE_GROUP_ID}}', post['group_id'])
        page_content = page_content.replace('{{ARTICLE_LANGUAGE}}', post['language'])
        page_content = page_content.replace('{{ARTICLE_EN_FILE}}', article_languages.get('en', {}).get('file', ''))
        page_content = page_content.replace('{{ARTICLE_ZH_FILE}}', article_languages.get('zh', {}).get('file', ''))
        page_content = page_content.replace('{{CONTENT}}', rendered_post_content)
        page_content = page_content.replace('{{CREATED}}', created)
        page_content = page_content.replace('{{UPDATED}}', updated)
        page_content = page_content.replace('{{TAGS}}', tags_html)
        page_content = page_content.replace('{{LANG_SWITCH}}', lang_switch_html)

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
            f.write(template)

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