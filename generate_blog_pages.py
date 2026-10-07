import os
import sys
import json
import markdown
import logging
from datetime import datetime
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent / 'scripts'))
from site_shell import bi, esc, i18n_attrs, apply_shell, load_config, page_config
# Re-export the former entrypoint API for scripts and tests; implementation lives in these modules.
from article_content import (
    ARTICLE_TEXT,
    AnnotateExtension,
    AnnotatePattern,
    AnnotatePreprocessor,
    BlogGenerationError,
    MONTH_NAMES,
    SITE_TIMEZONE,
    TAG_LABELS,
    build_post_excerpt,
    entry_for,
    estimate_reading_minutes,
    extract_title_and_content,
    get_creation_date,
    get_file_times,
    get_file_times_with_metadata,
    infer_group_id,
    infer_language_code,
    load_series_meta,
    localize_footnotes,
    parse_frontmatter_date,
    parse_metadata,
    parse_page_assets,
    series_info,
    series_parts,
    tag_label,
    tag_slug,
    update_image_paths,
)
from article_feeds import (
    absolute_site_url,
    build_meta_description,
    build_rss_feed,
    make_links_absolute,
    save_rss_feed,
    strip_html_excerpt,
)
from article_listing import (
    count_label,
    day_label,
    generate_blogs_page,
    month_label,
    render_article_row,
    render_articles_main,
    render_date_index,
    render_series_card,
)
from article_media import (
    ARTICLE_IMAGE_SIZES,
    OG_SAFE_IMAGE_SUFFIXES,
    PHONE_VARIANT_SUFFIX,
    PHONE_VARIANT_WIDTH,
    REMOTE_IMAGE_DIMENSIONS_PATH,
    add_phone_variant,
    build_og_image,
    lead_image,
    load_remote_image_dimensions,
    og_fallback_image,
    optimize_article_images,
    parse_dimension_value,
    read_image_dimensions,
    read_image_dimensions_from_bytes,
    read_jpeg_dimensions,
    read_jpeg_dimensions_from_stream,
    read_svg_dimensions,
    read_svg_dimensions_from_text,
    render_loop_videos,
    resolve_local_article_image,
    wrap_embedded_pages,
)
from article_relations import (
    build_article_groups,
    build_article_index,
    build_article_sequence,
    build_backlinks_data,
    linked_article_files,
    summarize_backlink_source,
    warn_on_metadata_divergence,
)
from article_render import (
    assign_heading_ids,
    build_head_extras,
    build_hreflang_alternates,
    build_post_foot,
    build_post_meta,
    build_post_nav,
    build_toc,
    meta_item,
    render_blog_post,
)


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


def ensure_directories():
    """Ensure required directories exist"""
    required_dirs = ['blogs', 'data', 'src/css', 'src/js']
    for directory in required_dirs:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logging.info(f"Checked directory: {directory}")


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
        save_json_data({**backlinks_data, 'last_updated': last_updated}, 'backlinks_data.json')
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
                    'markdown.extensions.tables',
                    AnnotateExtension()
                ]
            )
        except Exception as e:
            logging.error(f"Markdown conversion error in {md_file}: {str(e)}")
            raise BlogGenerationError(f"Markdown conversion failed: {str(e)}")

        html_content = localize_footnotes(html_content, is_english=md_file.endswith('.en.md'))
        html_content = optimize_article_images(html_content)
        html_content = wrap_embedded_pages(html_content, is_english=md_file.endswith('.en.md'))
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
