"""Article pipeline: relations."""
import re
import logging
from datetime import datetime
from collections import defaultdict
from bs4 import BeautifulSoup
from urllib.parse import urlparse

from article_content import parse_frontmatter_date


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


def build_backlinks_data(article_groups, last_updated):
    # Parse each language variant once, then invert its outgoing links. Keep
    # source positions so equal-date backlinks retain the original group order.
    sources_by_file = defaultdict(list)
    for position, source_group in enumerate(article_groups):
        linked_files = set()
        for entry in (source_group.get('languages') or {}).values():
            if entry and entry.get('html_content'):
                linked_files.update(linked_article_files(entry['html_content']))
        for file_name in linked_files:
            sources_by_file[file_name].append(position)

    files = {}
    for target_group in article_groups:
        target_files = {
            entry.get('file')
            for entry in (target_group.get('languages') or {}).values()
            if entry and entry.get('file')
        }
        if not target_files:
            continue

        source_positions = {
            position
            for file_name in target_files
            for position in sources_by_file.get(file_name, [])
        }
        backlinks = [
            summarize_backlink_source(article_groups[position])
            for position in sorted(source_positions)
            if article_groups[position].get('id') != target_group.get('id')
        ]

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
