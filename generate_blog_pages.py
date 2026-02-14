import os
import sys
import re
import json
import markdown
import logging
from datetime import datetime
from collections import defaultdict
from markdown.inlinepatterns import InlineProcessor
from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
from xml.etree import ElementTree
from bs4 import BeautifulSoup
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
            'date': datetime.now().strftime('%Y-%m-%d')
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
        created = datetime.fromtimestamp(stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S')
        updated = datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
        return created, updated
    except OSError as e:
        logging.error(f"Error getting file times for {file_path}: {str(e)}")
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S'), datetime.now().strftime('%Y-%m-%d %H:%M:%S')

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
        save_json_data(blog_posts, 'blog_data.json')
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
            "date": metadata.get('date', datetime.now().strftime('%Y-%m-%d'))
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

        created, updated = get_file_times(markdown_path)  # Now markdown_path is available

        tags_html = '<ul class="tag-list">' + ''.join([f'<li><a href="../tags.html#{tag}">{tag}</a></li>' for tag in tags]) + '</ul>'

        html_content = f"""
        <h1>{title}</h1>
        <p class="post-meta">Created: {created} | Last Updated: {updated}</p>
        {content}
        """

        page_content = template.replace('{{TITLE}}', title)
        page_content = page_content.replace('{{CONTENT}}', html_content)
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
    return datetime.fromtimestamp(os.path.getctime(file_path))

def generate_blogs_page(blog_posts):
    """Generate the blogs listing page with error handling"""
    try:
        # Sort blog posts by creation date (newest first)
        sorted_posts = sorted(
            blog_posts, 
            key=lambda x: get_creation_date(os.path.join('blogs', x['markdown'])), 
            reverse=True
        )
        
        # Group posts by month
        posts_by_month = defaultdict(list)
        for post in sorted_posts:
            try:
                date = get_creation_date(os.path.join('blogs', post['markdown']))
                month_key = date.strftime("%B %Y")
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
                        excerpt = content.split('\n\n')[0][:200] + '...' if len(content) > 200 else content
                    
                    date = get_creation_date(os.path.join('blogs', post['markdown']))
                    post_html = f"""
                    <article class="blog-preview">
                        <h4><a href="blogs/{post['file']}">{post['title']}</a></h4>
                        <p class="post-meta">Posted on {date.strftime('%B %d, %Y')}</p>
                        <p>{excerpt}</p>
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