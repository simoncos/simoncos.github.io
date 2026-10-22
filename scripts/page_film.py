"""Film pages: a screening, a short introduction, and related reading."""

from piece_contact_foot import render_piece_contact_foot
from site_shell import bi, bi_value, esc, lang_pair, page_config, render_document, render_meta, versioned_asset


def render_film(config, site, work):
    film = work["film"]
    rel_path = work["href"]
    page = page_config(config, rel_path)
    up = "../" * rel_path.count("/")
    en, zh = lang_pair(work["title"])
    original = film.get("original")
    original_reading = []
    if original:
        original_reading = [
            '  <section class="film-reading" aria-labelledby="film-original">',
            f'    <div><h2 id="film-original">{bi("The original prose", "原文")}</h2>',
            f'    <p>{bi("Written in November 2012. The dream before it became a film.", "写于2012年11月。在成为影像之前，这场梦先落在了纸上。")}</p></div>',
            '    <div class="film-reading-links">',
            f'      <a href="{up}{esc(original["zh"])}" lang="zh-Hans">阅读中文原文 <span aria-hidden="true">↗</span></a>',
            f'      <a href="{up}{esc(original["en"])}" lang="en">Read the English translation <span aria-hidden="true">↗</span></a>',
            '    </div>',
            '  </section>',
        ]
    main = "\n".join([
        '<main id="main" class="film-page enter" tabindex="-1">',
        f'  <a class="pill" href="{up}gallery.html#film">← {bi("Films", "影像")}</a>',
        '  <header class="film-heading">',
        f'    <div><p class="film-kicker">{bi("Debut art film", "首部艺术短片")} · 2026</p>',
        f'    <h1>{bi(en, zh)}</h1>',
        f'    <p class="film-subtitle">{bi(zh, en)}</p></div>',
        '    <p class="film-byline"><a href="../../about.html">趙澈 Che Zhao · simoncos</a></p>',
        '  </header>',
        '  <figure class="film-screen">',
        '    <div class="film-frame">',
        f'      <iframe src="https://www.youtube-nocookie.com/embed/{esc(film["youtube"])}?playsinline=1"'
        f' title="{esc(en)} · {esc(zh)}" width="1920" height="1080"'
        ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"'
        ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>',
        '    </div>',
        '    <figcaption class="film-caption">',
        f'      <span>{bi("Without narrative subtitles · Headphones recommended", "无叙事字幕 · 建议戴耳机")}</span>',
        f'      <a href="https://www.youtube.com/watch?v={esc(film["youtube"])}" target="_blank" rel="noopener noreferrer">'
        f'{bi("Watch on YouTube", "在 YouTube 观看")} ↗</a>',
        '    </figcaption>',
        '  </figure>',
        '  <section class="film-story" aria-labelledby="film-about">',
        f'    <h2 id="film-about">{bi("From an old dream", "从一场旧梦出发")}</h2>',
        '    <div class="film-prose">',
        f'      <p class="film-intro">{bi_value(film["intro"])}</p>',
        f'      <p>{bi_value(film["note"])}</p>',
        '    </div>',
        '  </section>',
        *original_reading,
        '  <section class="film-reading" aria-labelledby="film-making">',
        f'    <div><h2 id="film-making">{bi("Making the film", "制作记")}</h2>',
        f'    <p>{bi("Dreams, happy accidents, and the decisions that shaped the film.", "真实梦境、意外收获，以及一次次塑造影片的选择。")}</p></div>',
        '    <div class="film-reading-links">',
        f'      <a href="{up}blogs/void-flower-making-of.html" lang="zh-Hans">阅读中文制作记 <span aria-hidden="true">↗</span></a>',
        f'      <a href="{up}blogs/void-flower-making-of.en.html" lang="en">Read the making-of in English <span aria-hidden="true">↗</span></a>',
        '    </div>',
        '  </section>',
        render_piece_contact_foot(up, about=site["about"]),
        '</main>',
    ])
    head = render_meta(
        config, title=(f"{en} · simoncos", f"{zh} · simoncos"),
        description=lang_pair(work["desc"]), canonical=rel_path, og_type="video.other",
        image={"url": f'{config["site_url"].rstrip("/")}/{work["img"]}',
               "width": "1920", "height": "1080", "alt": f"{en} · {zh}"},
    )
    head += f'\n    <link rel="stylesheet" href="{versioned_asset("gallery/film/film.css", up)}">'
    head += f'\n    <link rel="stylesheet" href="{versioned_asset("blogs/assets/film-embed.css", up)}">'
    return render_document(config, page, head=head, main=main)
