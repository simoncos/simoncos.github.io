"""Article pipeline: listing."""
import logging
from collections import defaultdict

from site_shell import bi, esc, i18n_attrs, apply_shell, load_config, page_config
from article_content import BlogGenerationError, MONTH_NAMES, TAG_LABELS, parse_frontmatter_date, series_info, series_parts, tag_slug


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


def render_date_index(month_counts):
    """The month index that every month heading opens: one row per year,
    newest first, twelve cells per row. A month with articles links to its
    section and shows the count; the others are dots. On a phone the dots
    drop out and the months wrap as chips. It is a popover, so it opens and
    its links work without JavaScript; articles.js only positions it, marks
    the month in view and follows the tag filter."""
    years = defaultdict(dict)
    for key, n in month_counts.items():
        if key:
            years[key[:4]][int(key[5:7])] = n
    heads = ''.join(
        f'<span>{bi(MONTH_NAMES[m - 1][:3], str(m))}</span>' for m in range(1, 13)
    )
    rows = [
        '                <div class="dmi-row dmi-months" aria-hidden="true">'
        f'<span></span><div class="dmi-cells">{heads}</div></div>'
    ]
    for year in sorted(years, reverse=True):
        cells = []
        for m in range(1, 13):
            n = years[year].get(m)
            if not n:
                cells.append('<span class="dmi-cell is-empty" aria-hidden="true"></span>')
                continue
            key = f'{year}-{m:02d}'
            label = i18n_attrs(aria_label=(f'{MONTH_NAMES[m - 1]} {year}', f'{year} 年 {m} 月'))
            cells.append(
                f'<a class="dmi-cell" href="#{key}" data-jump="{key}"{label}>'
                f'<span class="dmi-m">{bi(MONTH_NAMES[m - 1][:3], f"{m} 月")}</span>'
                f'<span class="dmi-n num" data-n>{n}</span></a>'
            )
        latest = f'{year}-{max(years[year]):02d}'
        rows.append(
            f'                <div class="dmi-row" data-year="{year}">'
            f'<a class="dmi-year num" href="#{latest}" data-jump="{latest}">{year}</a>'
            f'<div class="dmi-cells">{"".join(cells)}</div></div>'
        )
    close = i18n_attrs(aria_label=('Close', '关闭'))
    return '\n'.join([
        '            <div class="dmi" id="date-index" popover role="dialog" aria-labelledby="date-index-title" data-date-index>',
        '                <div class="dmi-head">'
        f'<h2 class="dmi-title" id="date-index-title">{bi("Jump to a month", "跳到某年某月")}</h2>'
        f'<button class="dmi-close" type="button" popovertarget="date-index" popovertargetaction="hide"{close}>'
        '<span aria-hidden="true">×</span></button></div>',
        *rows,
        '            </div>',
    ])


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

    # The other language's title is not repeated under each row; the
    # 中文 / EN mark says both exist.
    alt = ''

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
    bilingual = '<span class="arow-bi"><span lang="zh-Hans">中文</span> / EN</span>' if en and zh else ''
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
        f'                            {alt}{series_html}' if alt or series_html else '',
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
    # The part count is in the progress label, so the kicker is only the span.
    meta_en = meta_zh = span

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
        cta = bi("Read", "阅读")
        href = i18n_attrs(href=(f"blogs/{(en or zh).get('file', '')}", f"blogs/{(zh or en).get('file', '')}"))
        details.append(
            f'<div class="spart{state}" data-part-detail="{i}">'
            '<div class="spart-text">'
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
        (f'                        <span class="k-soft num">{esc(meta_en)}</span>' if meta_en else ''),
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
            f'<button class="chip" type="button" data-tag="{esc(tag)}" data-slug="{esc(tag_slug(tag))}" aria-pressed="false">'
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
        # A dated month's heading opens the month index (the popover below);
        # its id is the month, so blogs.html#2012-09 lands on it.
        heading = (
            '<button class="amonth-jump" type="button" popovertarget="date-index">'
            f'{bi(label_en, label_zh)}<span class="amonth-chev" aria-hidden="true"></span></button>'
            if key else bi(label_en, label_zh)
        )
        id_attr = f' id="{esc(key)}"' if key else ''
        month_blocks.append('\n'.join([
            f'            <section class="amonth"{id_attr} data-month="{esc(key)}">',
            f'                <div class="amonth-head"><h2>{heading}</h2>'
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
        render_date_index({key: len(value) for key, value in months.items()}),
        '            <p class="visually-hidden" role="status" data-status></p>',
        '        </div>',
        '        <div class="series-view" data-view-panel="series" id="series">',
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
