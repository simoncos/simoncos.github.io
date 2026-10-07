"""Song pages and waveform metadata."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))


from site_shell import ROOT, bi, bi_value, esc, i18n_attrs, lang_pair, page_config, render_document, render_meta


from page_common import load_json


def clock(seconds: float) -> str:
    whole = int(seconds)
    return f"{whole // 60}:{whole % 60:02d}"


def wave_path(peaks: list[int]) -> str:
    """One bar per peak, centred on the middle line, in a 0-100 tall box."""
    bars = []
    for i, peak in enumerate(peaks):
        h = max(2.0, peak * 0.96)
        bars.append(f"M{i + 0.18:.2f} {(100 - h) / 2:.1f}h0.64v{h:.1f}h-0.64z")
    return "".join(bars)


def render_song(config: dict[str, Any], site: dict[str, Any], song: dict[str, Any]) -> str:
    rel_path = song["page"]
    page = page_config(config, rel_path)
    work = next(item for item in site["works"] if item["id"] == song["id"])
    measured = load_json(ROOT / song["peaks"])
    peaks = measured["peaks"]
    length = clock(measured["duration"])
    up = "../" * rel_path.count("/")
    audio = song["audio"].rsplit("/", 1)[-1]
    title_en, title_zh = lang_pair(work["title"])
    artist = lang_pair(song["credits"][0]["name"])[1]

    def name(value: Any) -> str:
        en, zh = lang_pair(value)
        return bi(en, zh) if en != zh else f'<span lang="zh-Hans">{esc(zh)}</span>'

    credits = "".join(
        f'<div><dt>{bi_value(credit["role"])}</dt><dd>{name(credit["name"])}</dd></div>'
        for credit in song["credits"]
    )
    stanzas = []
    for stanza in song["lyrics"]:
        lines = "".join(
            f'<span class="ly"><span class="ly-zh">{esc(line["zh"])}</span>'
            f'<span class="ly-en" data-l="en" lang="en">{esc(line["en"])}</span></span>'
            for line in stanza
        )
        stanzas.append(f'                <p class="stanza">{lines}</p>')
    score = []
    if song.get("score"):
        files = []
        for item in song["score"]["files"]:
            size = (ROOT / item["path"]).stat().st_size
            size_text = f"{size / 1e6:.1f} MB" if size >= 1e6 else f"{max(1, round(size / 1e3))} KB"
            files.append(
                f'                <li><a class="song-file" href="{esc(item["path"].rsplit("/", 1)[-1])}" download>'
                f'<span class="song-file-format">{esc(item["format"])}</span>'
                f'<span class="song-file-label">{bi_value(item["label"])}</span>'
                f'<span class="song-file-desc">{bi_value(item["desc"])}</span>'
                f'<span class="song-file-size num">{size_text}</span></a></li>'
            )
        score = [
            '        <section class="block block-score" style="--span:12;--rows:1;--delay:0.18s" aria-labelledby="score-title">',
            f'            <h2 class="block-k" id="score-title">{bi("Score", "乐谱")}</h2>',
            f'            <p class="song-score-note">{bi_value(song["score"]["note"])}</p>',
            '            <ul class="song-files">',
            *files,
            "            </ul>",
            "        </section>",
        ]
    wave = wave_path(peaks)
    svg = (
        f'<svg class="{{cls}}" viewBox="0 0 {len(peaks)} 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">'
        f'<path d="{wave}"/></svg>'
    )
    play_icon = '<svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l11-6.5z"/></svg>'
    pause_icon = (
        '<svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
        '<path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>'
    )

    main = "\n".join([
        '<main id="main" class="board song enter" tabindex="-1">',
        '    <div class="board-bar">',
        f'        <div class="board-crumb"><a class="pill" href="{up}gallery.html#music">← {bi("Work", "作品")}</a>'
        f'<span class="muted">{bi("Music", "音乐")}</span></div>',
        "    </div>",
        '    <div class="bento">',
        '        <section class="block block-intro rows-2" style="--span:7;--rows:2;--delay:0.00s">',
        f'            <span class="intro-status"><span class="song-dot" aria-hidden="true"></span>'
        f'<span>{bi_value(work["kind"])} · {esc(work["date"][:4])}</span></span>',
        f'            <h1 class="intro-title song-title" lang="zh-Hans">{esc(title_zh)}</h1>',
        f'            <span class="intro-sub" data-l="en">{esc(title_en)}</span>',
        f'            <dl class="song-credits">{credits}</dl>',
        f'            <p class="intro-sum">{bi_value(song["note"])}</p>',
        "        </section>",
        f'        <section class="block block-player is-ink rows-2" style="--span:5;--rows:2;--delay:0.06s"'
        f'{i18n_attrs(aria_label=("Recording", "录音"))} data-song-player data-artist="{esc(artist)}">',
        f'            <span class="block-k">{bi("Recording", "录音")} · <span class="num">{length}</span></span>',
        f'            <audio class="song-audio" src="{esc(audio)}" controls preload="metadata"></audio>',
        '            <div class="song-ui" hidden>',
        f'                <div class="song-wave" data-wave role="slider" tabindex="0" aria-valuemin="0"'
        f' aria-valuemax="{int(measured["duration"])}" aria-valuenow="0" aria-valuetext="0:00 / {length}"'
        f'{i18n_attrs(aria_label=("Position in the song", "播放位置"))}>',
        f"                    {svg.format(cls='wave-base')}",
        f"                    {svg.format(cls='wave-done')}",
        "                </div>",
        '                <div class="song-controls">',
        f'                    <button class="song-play" type="button" data-play>{play_icon}{pause_icon}'
        f'<span class="visually-hidden label-play">{bi("Play", "播放")}</span>'
        f'<span class="visually-hidden label-pause">{bi("Pause", "暂停")}</span></button>',
        f'                    <span class="song-time num"><span data-now>0:00</span> / {length}</span>',
        "                </div>",
        "            </div>",
        "        </section>",
        '        <section class="block block-lyrics" style="--span:12;--rows:1;--delay:0.12s" aria-labelledby="lyrics-title">',
        '            <div class="dots-head">',
        f'                <h2 class="block-k" id="lyrics-title">{bi("Lyrics", "歌词")}</h2>',
        f'                <span class="block-k" data-l="en">Chinese, with an English translation</span>',
        "            </div>",
        '            <div class="lyrics" lang="zh-Hans">',
        *stanzas,
        "            </div>",
        "        </section>",
        *score,
        "    </div>",
        "</main>",
    ])
    desc_en, desc_zh = lang_pair(work["desc"])
    head = render_meta(
        config,
        title=(f"{title_en} · Work · simoncos", f"{title_zh} · 作品 · simoncos"),
        description=(f"{title_en} ({title_zh}): {desc_en}", f"《{title_zh}》：{desc_zh}"),
        canonical=rel_path,
        image={
            "url": f'{config["site_url"].rstrip("/")}/{song["og_image"]}',
            "width": "1200",
            "height": "630",
            "alt": f"{title_en} ({title_zh})",
        },
    )
    return render_document(config, page, head=head, main=main)
