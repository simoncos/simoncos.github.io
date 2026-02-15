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

def find_links(content):
    return re.findall(r'\[([^\]]+)\]\(([^)]+\.html)\)', content)

def get_file_times(file_path):
    """Get file creation and modification times with error handling"""
    try:
        stats = os.stat(file_path)
        created = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        updated = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        return created, updated
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S'), datetime.now().strftime('%Y-%m-%d %H:%M:%S')

def get_file_times_with_metadata(file_path, metadata_date):
    """Prefer frontmatter date for created time, use file mtime for updated."""
    try:
        stats = os.stat(file_path)
        updated = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        updated = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    created_dt = parse_frontmatter_date(metadata_date)
    if created_dt:
        created = created_dt.strftime('%Y-%m-%d %H:%M:%S')
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

def generate_blog_pages():
    """Main blog generation function with error handling"""
    try:
        ensure_directories()
        
        tags_data = defaultdict(list)
        backlinks = defaultdict(list)
        series_data = defaultdict(list)
        blog_posts = []

        template = load_template('templates/blog-template.html')
        
        markdown_files = [f for f in os.listdir('blogs') if f.endswith('.md')]
        if not markdown_files:
            logging.warning("No markdown files found in blogs directory")
            return []

        # Process markdown files
        for md_file in markdown_files:
            try:
                process_markdown_file(md_file, tags_data, backlinks, series_data, blog_posts, template)
            except Exception as e:
                logging.error(f"Error processing {md_file}: {str(e)}")
                continue

        # Save data files
        blog_data = load_existing_blog_data()
        previous_posts = blog_data.get('posts', [])
        previous_markdown = {post.get('markdown') for post in previous_posts if post.get('markdown')}
        current_markdown = {post.get('markdown') for post in blog_posts if post.get('markdown')}

        new_post_detected = len(current_markdown - previous_markdown) > 0
        last_updated = blog_data.get('last_updated')
        if new_post_detected or not last_updated:
            last_updated = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        save_json_data({'last_updated': last_updated, 'posts': blog_posts}, 'blog_data.json')
        save_json_data(series_data, 'series_data.json')
        save_json_data(tags_data, 'tags_data.json')

        logging.info("Blog pages and data generated successfully")
        return blog_posts

    except Exception as e:
        logging.error(f"Error generating blog pages: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blog pages: {str(e)}")

def process_markdown_file(md_file, tags_data, backlinks, series_data, blog_posts, template):
    """Process individual markdown file with error handling"""
    try:
        markdown_path = os.path.join('blogs', md_file)
        html_file = md_file.replace('.md', '.html')
        
        with open(markdown_path, 'r', encoding='utf-8') as file:
            md_content = file.read()
            
        metadata, content = parse_metadata(md_content)
        content = update_image_paths(content)
        
        # Convert markdown to HTML
        try:
            html_content = markdown.markdown(
                content,
                extensions=[
                    'markdown.extensions.fenced_code',
                    'markdown.extensions.attr_list',
                    AnnotateExtension()
                ]
            )
        except Exception as e:
            logging.error(f"Markdown conversion error in {md_file}: {str(e)}")
            raise BlogGenerationError(f"Markdown conversion failed: {str(e)}")

        # Generate and save the blog post
        generate_blog_post(
            markdown_path,  # Pass the markdown_path
            md_file, 
            html_file, 
            metadata, 
            html_content,
            tags_data, 
            backlinks, 
            series_data, 
            blog_posts, 
            template
        )

    except Exception as e:
        logging.error(f"Error processing markdown file {md_file}: {str(e)}")
        raise BlogGenerationError(f"Failed to process markdown file: {str(e)}")

def generate_blog_post(markdown_path, md_file, html_file, metadata, html_content, tags_data, backlinks, series_data, blog_posts, template):
    """Generate and save individual blog post"""
    try:
        title, content = extract_title_and_content(html_content)

        md_path = Path('blogs') / md_file
        if md_file.endswith('.en.md'):
            paired_md_file = md_file[:-len('.en.md')] + '.md'
            paired_label = '中文'
            paired_html_file = paired_md_file.replace('.md', '.html')
        else:
            paired_md_file = md_file[:-len('.md')] + '.en.md'
            paired_label = 'English'
            paired_html_file = paired_md_file.replace('.md', '.html')

        paired_md_path = Path('blogs') / paired_md_file
        if paired_md_path.exists():
            lang_switch_html = (
                f'<div class="lang-switch">'
                f'<a class="lang-switch-link" href="{paired_html_file}">{paired_label}</a>'
                f'</div>'
            )
        else:
            lang_switch_html = ''
        
        blog_posts.append({
            "title": title,
            "file": html_file,
            "markdown": md_file,
            "html_content": html_content,
            "date": metadata.get('date', '')
        })

        tags = metadata.get('tags', '').split(',')
        tags = [tag.strip() for tag in tags if tag.strip()]

        for tag in tags:
            tags_data[tag].append({
                'title': title,
                'file': html_file
            })

        links = find_links(content)
        for link_text, link_url in links:
            backlinks[link_url].append({"title": title, "file": html_file})

        created, updated = get_file_times_with_metadata(markdown_path, metadata.get('date', ''))

        tags_html = '<ul class="tag-list">' + ''.join([
            f'<li><a href="../tags.html#{quote(tag)}">{html_lib.escape(tag)}</a></li>'
            for tag in tags
        ]) + '</ul>'

        rendered_post_content = content

        page_content = template.replace('{{TITLE}}', title)
        page_content = page_content.replace('{{CONTENT}}', rendered_post_content)
        page_content = page_content.replace('{{CREATED}}', created)
        page_content = page_content.replace('{{UPDATED}}', updated)
        page_content = page_content.replace('{{BACKLINKS}}', json.dumps(backlinks[html_file]))
        page_content = page_content.replace('{{TAGS}}', tags_html)
        page_content = page_content.replace('{{LANG_SWITCH}}', lang_switch_html)

        with open(os.path.join('blogs', html_file), 'w', encoding='utf-8') as f:
            f.write(page_content)

        series_name = metadata.get('series', '').strip()
        if series_name:
            series_data[series_name].append({
                'title': title,
                'file': html_file,
                'part': metadata.get('series_part', '')
            })

    except Exception as e:
        logging.error(f"Error generating blog post {md_file}: {str(e)}")
        raise BlogGenerationError(f"Failed to generate blog post: {str(e)}")

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
        html_content = markdown.markdown(
            markdown_body,
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

        for li in soup.find_all('li'):
            # Prefix list items so bullets remain visible after text extraction.
            if li.contents:
                li.insert(0, NavigableString('• '))
            else:
                li.string = '•'

        # Keep block/line separation so previews don't become one huge line.
        text = soup.get_text('\n', strip=True)
    except Exception:
        text = re.sub(r'```.*?```', ' ', markdown_body, flags=re.DOTALL)
        text = re.sub(r'`[^`]*`', ' ', text)
        text = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', text)
        text = re.sub(r'\[[^\]]*\]\([^)]*\)', ' ', text)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = text.strip()

    # Normalize whitespace but keep newlines as separators.
    text = re.sub(r'\r\n?', '\n', text)
    text = re.sub(r'[ \t\f\v]+', ' ', text)
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

def generate_blogs_page(blog_posts):
    """Generate the blogs listing page with error handling"""
    try:
        def get_post_datetime(post):
            dt = parse_frontmatter_date(post.get('date'))
            if dt:
                return dt
            return get_creation_date(os.path.join('blogs', post['markdown']))

        # Sort blog posts by frontmatter date (newest first), fallback to file creation date
        sorted_posts = sorted(blog_posts, key=get_post_datetime, reverse=True)
        
        # Group posts by month
        posts_by_month = defaultdict(list)
        for post in sorted_posts:
            try:
                dt = get_post_datetime(post)
                month_key = dt.strftime("%B %Y")
                posts_by_month[month_key].append(post)
            except Exception as e:
                logging.error(f"Error processing post for listing: {post['markdown']}: {str(e)}")
                continue
        
        # Generate HTML content
        html_content = []
        for month, posts in posts_by_month.items():
            month_content = [f"<h3>{month}</h3>"]
            
            for post in posts:
                try:
                    with open(os.path.join('blogs', post['markdown']), 'r', encoding='utf-8') as md_file:
                        md_content = md_file.read()
                        metadata, content = parse_metadata(md_content)
                        excerpt_text = build_post_excerpt(content, word_limit=100)
                        excerpt = html_lib.escape(excerpt_text)

                        tags = [tag.strip() for tag in metadata.get('tags', '').split(',') if tag.strip()]
                        if tags:
                            tags_items = ''.join(
                                f'<li><a href="tags.html#{quote(tag)}">{html_lib.escape(tag)}</a></li>'
                                for tag in tags
                            )
                            tags_html = f'<ul class="tag-list blog-preview-tags">{tags_items}</ul>'
                        else:
                            tags_html = ''

                    dt = get_post_datetime(post)
                    post_html = f"""
                    <article class="blog-preview">
                        <h4><a href="blogs/{post['file']}">{post['title']}</a></h4>
                        <p class="post-meta">Posted on {dt.strftime('%B %d, %Y')}</p>
                        {tags_html}
                        <p class="blog-excerpt">{excerpt}</p>
                        <a href="blogs/{post['file']}" class="read-more">Read more</a>
                    </article>
                    """
                    month_content.append(post_html)
                except Exception as e:
                    logging.error(f"Error generating preview for {post['markdown']}: {str(e)}")
                    continue
            
            html_content.extend(month_content)
        
        # Load and apply template
        try:
            with open('templates/blogs-listing-template.html', 'r', encoding='utf-8') as template_file:
                template = template_file.read()
            
            page_content = template.replace('{{BLOG_LISTINGS}}', '\n'.join(html_content))
            
            with open('blogs.html', 'w', encoding='utf-8') as f:
                f.write(page_content)
                
            logging.info("Successfully generated blogs listing page")
            
        except Exception as e:
            logging.error(f"Error writing blogs listing page: {str(e)}")
            raise BlogGenerationError(f"Failed to generate blogs listing: {str(e)}")
            
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