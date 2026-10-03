"""Restore the music riddle as a generated, bilingual Work page."""
import base64
import json
from music_riddle_data import FLOWERS, presentation, load as load_music_riddle
from music_riddle_layout import curves, svg_path, route_geometry, labels
from site_shell import ROOT, bi, esc, i18n_attrs, page_config, render_document, render_meta

PAGE = 'gallery/music/endless-echoes.html'


def edge_path(start, end, *, inset=False):
    return svg_path(curves(start, end, inset=inset))


def flower_svg(family=0, special=False):
    name = FLOWERS[family]
    size = 64 if special else 50
    return f'<g class="echo-petals"><image href="assets/echo-flower-{name}.webp" x="{-size/2:g}" y="{-size/2:g}" width="{size}" height="{size}"/></g>'


# Aura hues are the page's --bloom-* tokens (set in endless-echoes.css), so a palette change is one edit.
AURA = {'poppy': 'var(--bloom-coral)', 'blue': 'var(--bloom-blue)', 'ivory': 'var(--bloom-gold)', 'dahlia': 'var(--bloom-orange)'}


def arrow_marker(name, fill, size=10):
    return f'<marker id="echo-arrow{name}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="{size}" markerHeight="{size}" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 L2 5 Z" fill="{fill}"/></marker>'


def glow_gradient(name, color, peak):
    def stop(at, opacity):
        return f'<stop offset="{at}" style="stop-color:{color}" stop-opacity="{opacity}"/>'
    return f'<radialGradient id="echo-{name}">{stop(0, peak)}{stop(.5, round(peak / 3.2, 3))}{stop(1, 0)}</radialGradient>'


def keyboard_html(low=48, high=72):
    """The author's chord range (C3-C5, MIDI 48-72) as a quiet keyboard; script lights the keys of the current chord."""
    white = (0, 2, 4, 5, 7, 9, 11)
    notes = range(low, high + 1)
    whites = [n for n in notes if n % 12 in white]
    keys = ''.join(f'<i class="echo-key" data-midi="{n}"></i>' for n in whites)
    keys += ''.join(f'<b class="echo-key echo-key-black" data-midi="{n}" style="--k:{whites.index(n - 1) + 1}"></b>' for n in notes if n % 12 not in white)
    return f'<div class="echo-keys echo-js" data-keys aria-hidden="true" style="--whites:{len(whites)}">{keys}</div>'


def map_svg(data):
    nodes = {n['id']: n for n in data['nodes']}
    song_count = len(nodes) - bool(data.get('bonus'))
    geometry = route_geometry(data)
    label_offsets = labels(data, geometry)
    parts = [f'<svg class="echo-map" viewBox="0 0 {data["map"]["width"]} {data["map"]["height"]}" style="--echo-map-width:{data["map"]["width"]}px" role="group" aria-labelledby="echo-map-title">',
             f'<title id="echo-map-title">{song_count} songs connected by {sum(len(n["next"]) for n in nodes.values())} paths · {song_count} 首歌，{sum(len(n["next"]) for n in nodes.values())} 条路径</title>']
    defs = arrow_marker('', '#777782') + arrow_marker('-active', '#f1b291', 13) + arrow_marker('-walked', '#efd9a8', 13) + arrow_marker('-incoming', '#91b5ed', 13)
    defs += ''.join(glow_gradient('aura-' + name, color, .34) for name, color in AURA.items()) + glow_gradient('spot', '#ffe9c9', .22)
    parts.append(f'<defs>{defs}</defs>')
    for node in nodes.values():
        for target in node['next']:
            path = svg_path(geometry[node['id'], target])
            parts.append(f'<g class="echo-route"><path class="echo-edge-clearance" d="{path}"/><path class="echo-edge-glow" d="{path}"/><path class="echo-edge" data-from="{node["id"]}" data-to="{target}" marker-end="url(#echo-arrow)" d="{path}"/></g>')
    # Light gathers where the player has been: one soft aura per song, a lantern under the current one.
    sx, sy = nodes[data['start']]['position']
    auras = ''.join(f'<circle class="echo-aura{" is-ending" if n["id"] == data["ending"] else ""}{" is-found" if n["id"] == data["start"] else ""}" data-aura="{n["id"]}" cx="{n["position"][0]}" cy="{n["position"][1]}" r="{210 if n["id"] == data["ending"] else 150}" fill="url(#echo-aura-{presentation(n)["flower"]})"/>' for n in data['nodes'])
    parts.append(f'<g class="echo-aura-layer" data-aura-layer aria-hidden="true"><circle class="echo-spotlight" data-spotlight r="250" fill="url(#echo-spot)" style="transform:translate({sx}px,{sy}px)"/>{auras}</g>')
    if data.get('bonus'):
        ending, bonus = nodes[data['ending']], nodes[data['bonus']]
        parts.append(f'<path class="echo-bonus-link is-hidden" data-bonus-link d="{edge_path(ending["position"],bonus["position"],inset=True)}"/>')
    parts.append('<path class="echo-travel-glow" data-travel-glow pathLength="1" aria-hidden="true"/>')
    for i, node in enumerate(data['nodes'], 1):
        x, y = node['position']
        start = node['id'] == data['start']
        bonus = node['id'] == data.get('bonus')
        ending = node['id'] == data['ending']
        role_class = 'is-start' if start else 'is-ending' if ending else ''
        role_label = '起点' if start else '终点' if ending else ''
        role_text = f'<text class="echo-node-kind" y="48" text-anchor="middle">{role_label}</text>' if role_label else ''
        family = FLOWERS.index(presentation(node)['flower'])
        # Labels occupy open space; their hit areas remain usable beside the flower.
        dx, dy, anchor = label_offsets[node['id']]
        label_position = f'x="{dx}" y="{dy}" text-anchor="{anchor}"'
        label_width = sum(11 if ord(c)<128 else 22 for c in node['title'])
        label_left = dx - (label_width/2 if anchor == 'middle' else label_width if anchor == 'end' else 0)
        label_hit = f'<rect class="echo-label-hit" x="{label_left-12:g}" y="{dy-26}" width="{label_width+24:g}" height="36" rx="5"/>'
        parts.append(f'<g class="echo-node bloom-{family} {"is-found is-current" if start else ""} {"is-bonus is-hidden" if bonus else ""} {role_class}" data-node="{node["id"]}" transform="translate({x} {y})"><circle class="echo-hit" r="34"/>{label_hit}<circle class="echo-halo" r="35"/><circle class="echo-spark" r="36"/><circle class="echo-spark echo-spark-2" r="36"/><circle class="echo-bud-ring" r="13"/><circle class="echo-bud" r="4.5"/>{flower_svg(family,start or ending)}<text {label_position}>{esc(node["title"]) if start else '' if bonus else str(i).zfill(2)}</text>{role_text}</g>')
    parts.append('</svg>')
    return ''.join(parts)


def render_music_riddle(config):
    data = load_music_riddle()
    song_count = len(data['nodes']) - bool(data.get('bonus'))
    start = next(n for n in data['nodes'] if n['id'] == data['start'])
    start_flower = presentation(start)['flower']
    b = bi
    # Both blocks start hidden; script fills their text and shows them (a walked path of two songs or more; a complete collection).
    path_html = '<div class="echo-path echo-js" data-path hidden><button type="button" class="echo-path-play" data-path-play aria-describedby="echo-path-caption"><span class="echo-path-icon" data-path-icon aria-hidden="true">▶</span><span data-path-label></span></button><p class="echo-path-caption" id="echo-path-caption" data-path-caption></p><ol class="echo-path-beads" data-path-beads aria-hidden="true"></ol></div>'
    finale_html = f'<div class="echo-finale-bar echo-js" data-finale-bar hidden role="group" {i18n_attrs(**{"aria-label": ("Finale", "终章")})}><span class="echo-finale-mark" aria-hidden="true">♫</span><span class="echo-finale-caption" data-finale-caption></span><button type="button" class="echo-finale-play" data-finale-play><span data-finale-icon aria-hidden="true">▶</span><span data-finale-label></span></button><span class="echo-sr" data-finale-status role="status" aria-live="polite"></span><i class="echo-finale-run" aria-hidden="true"></i></div>'
    main = f'''<main id="main" class="echo-main" tabindex="-1">
    <div class="echo-top"><a href="../../gallery.html#games">← {b('Work · Games','作品 · 游戏')}</a><span>2017 / 2026</span></div>
    <header class="echo-intro">
      <div class="echo-intro-copy"><p class="echo-kicker">{b('A MUSIC RIDDLE · EXPANDED EDITION','音乐谜题 · 扩展版')}</p>
      <h1>{b('Endless','漫无止尽')}<br>{b('Echoes','的回响')}</h1>
      <div class="echo-intro-note"><span class="echo-count">{song_count}</span><p>{b('songs. More than one way through.','首歌，不止一条路。')}</p><p>{b('Read a clue, name the next song.','读一段线索，猜下一首歌。')}<br> {b('Follow what you remember.','沿着你记得的声音走。')}</p></div>
      </div>
      <figure class="echo-hero-art"><img src="assets/endless-echoes-garden-v5.webp" width="1200" height="800" alt="" fetchpriority="high" decoding="async"></figure>
    </header>
    <div id="echo-game" class="echo-game" data-echo-game role="region" {i18n_attrs(**{'aria-label':('Endless Echoes','漫无止尽的回响')})}>
      <section class="echo-clue-panel" aria-labelledby="echo-song">
        <div class="echo-panel-top"><span data-now-label>{b('NOW ECHOING','正在回响')}</span><div class="echo-clue-actions"><button type="button" class="echo-js echo-text-button" data-back disabled>{b('← Back','← 退一步')}</button><button type="button" class="echo-js echo-text-button echo-open-map" data-open-map aria-haspopup="dialog" aria-controls="echo-map-dialog">{b('Full map ↗','完整地图 ↗')}</button><button type="button" class="echo-sound echo-js" data-sound aria-pressed="true"><span aria-hidden="true">♫</span><span class="echo-sound-label" data-sound-label>{b('Sound on','音效：开')}</span></button></div></div>
        <div class="echo-flower-stage">
          <svg class="echo-neighborhood echo-js" data-neighborhood viewBox="0 0 360 244" role="group" {i18n_attrs(**{'aria-label':('Paths around the current song','当前歌曲附近的路径')})}></svg>
          <button type="button" disabled class="echo-clue-flower bloom-{FLOWERS.index(start_flower)}" data-clue-flower data-replay {i18n_attrs(**{'aria-label':('Replay the current piano chord','回放当前钢琴和弦')})}><img data-clue-art src="assets/echo-flower-{start_flower}.webp" width="84" height="84" alt=""><span class="echo-replay-cue" aria-hidden="true">♪ {b('Replay','再听一次')}</span></button>
          <p class="echo-focus-count echo-js" data-focus-count></p>
        </div>
        <h2 id="echo-song" lang="zh-Hans">{esc(start['title'])}</h2>
        <blockquote class="echo-quote" id="echo-quote" lang="zh-Hans" hidden></blockquote>
        <p class="echo-clue" id="echo-clue">{b(start['clue']['en'],start['clue']['zh'])}</p>
        <div class="echo-branch echo-js"><span class="echo-pips" id="echo-pips" aria-hidden="true"></span><p id="echo-branch"></p></div>
        <form class="echo-answer echo-js" id="echo-form">
          <label for="echo-answer">{b('Which song comes next?','下一首是什么？')}</label>
          <div class="echo-input-row"><input id="echo-answer" name="song" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" maxlength="80" required {i18n_attrs(placeholder=('Enter a Chinese song title','输入歌名，简繁体均可'))}><button type="submit">{b('Check answer','确认答案')} <span aria-hidden="true">↗</span></button></div>
        </form>
        <p class="echo-feedback" id="echo-feedback" role="status" aria-live="polite"></p>
        <p class="echo-sr" id="echo-announce" role="status" aria-live="polite"></p>
        <p class="echo-sr" id="echo-score-status" role="status" aria-live="polite"></p>
        <div class="echo-ending" id="echo-ending" hidden><p>{b('You have found the ending. Other paths are still waiting.','你找到了终点。还有一些路，等你回去走。')}</p><button class="echo-button" data-go-start type="button">{b('Explore another branch','回到起点，走另一条路')}</button></div>
        <div class="echo-ending" id="echo-dead-end" hidden><button class="echo-button" data-return-branch type="button">{b("Return to the previous song","退回上一首")}</button></div>
        <div class="echo-help echo-js"><details id="echo-hint"><summary><span class="echo-help-icon" aria-hidden="true">✧</span>{b('Get a hint','给我一点提示')}</summary><p id="echo-hint-text"></p></details><details id="echo-reveal"><summary><span class="echo-help-icon" aria-hidden="true">↗</span>{b('Show answers','揭晓答案')}</summary><p>{b('Choose a song below to follow that path.','选择下方的歌，沿这条路继续。')}</p><div id="echo-reveal-choices"></div></details></div>
        {keyboard_html()}
        {path_html}
        <noscript><p class="echo-noscript">{b('The interactive trail needs JavaScript. You can follow the original clues in the Douban list below; start with 不来也不去.','开启 JavaScript 可在这里猜歌和保存进度。也可以在下方豆列阅读原始线索，从《不来也不去》开始。')}</p></noscript>
      </section>
      <section class="echo-map-panel" aria-labelledby="echo-map-heading">
        <div class="echo-panel-top"><h2 id="echo-map-heading">{b('YOUR TRAIL','回响地图')}</h2><button class="echo-text-button echo-js" type="button" data-map-zoom aria-pressed="false">{b('Enlarge map','放大地图')}</button><button class="echo-text-button echo-js" type="button" data-map-locate>{b("Find current","定位当前")}</button><span class="echo-progress"><span id="echo-found-count">1</span><span> / {song_count}</span></span></div>
        <progress class="echo-progress-line" id="echo-progress-bar" max="{song_count}" value="1" {i18n_attrs(**{'aria-label':('Songs found','已找到的歌曲')})}></progress>
        {finale_html}
        <div class="echo-map-stage" tabindex="-1">{map_svg(data)}</div>
        <div class="echo-bonus echo-js" id="echo-bonus" hidden role="status"><p>{b("Every song is lit. A hidden echo awaits beside the ending.","所有歌曲都已点亮。终点旁，还有一段隐藏的回响。")}</p><button class="echo-button" type="button" data-open-bonus>{b("Listen to the hidden echo","听听隐藏的回响")}</button></div>
        <div class="echo-map-key"><span><i class="echo-key-found"></i>{b('Found','已点亮')}</span><span><i class="echo-key-unknown"></i>{b('Undiscovered','未发现')}</span><span><i class="echo-key-walked"></i>{b('Your trail','走过的路')}</span><span><i class="echo-key-outgoing"></i>{b('Paths onward','当前出路')}</span><span><i class="echo-key-incoming"></i>{b('Paths here','来路')}</span><span>→ {b('Arrows lead to the next song','箭头指向下一首')}</span><span class="echo-map-instruction">{b('Select a discovered song to revisit','点击已点亮的节点，回到那首歌')}</span></div>
      </section>
      <dialog id="echo-map-dialog" class="echo-map-dialog" aria-labelledby="echo-overview-heading">
        <div class="echo-overview-top"><h2 id="echo-overview-heading">{b('FULL NETWORK','完整回响地图')}</h2><button type="button" class="echo-text-button" data-close-map autofocus>{b('Back to clue ↓','回到线索 ↓')}</button></div>
      </dialog>
    </div>
    <section class="echo-collection echo-js" aria-labelledby="echo-collection-heading"><div class="echo-panel-top"><h2 id="echo-collection-heading">{b('THE SONGS YOU FOUND','已经找到的歌')}</h2><span id="echo-save-status"></span></div><div class="echo-song-list" id="echo-song-list"></div><details class="echo-reset"><summary>{b('Start a fresh trail','重新开始')}</summary><p>{b('This clears the saved trail in this browser.','这会清除这个浏览器里保存的进度。')}</p><button type="button" data-reset>{b('Clear my trail and restart','清除进度，从头开始')}</button></details></section>
    <section class="echo-about"><h2>{b('The echoes continue.','旧日的谜，新的回响。')}</h2><div><p>{b('This is the expanded edition of a music riddle first made in 2017. The original 26 clues have grown into 36 songs, with new branches, dead ends and a hidden echo waiting beyond the complete collection.','这是 2017 年音乐谜题的扩展版。原来的 26 个谜面，如今延展为 36 首歌：新增的分支、死胡同，以及集齐之后才会出现的隐藏回响，让旧日的线索有了新的去处。')}</p><p>{b('Read the clue and guess which song it leads to. Some paths meet again; one brings you back to the beginning. You can reach the ending before finding every song, then return to explore the paths you missed.','读一段谜面，猜它指向的下一首歌。有些路会重逢，有一条会带你回到最初。不必集齐所有歌，也能到达终点；抵达之后，仍可以回头寻找未曾走过的分支。')}</p><p>{b('The original trail lived in the recommendation notes of Xiami playlists. After the platform closed, its surviving archive and Douban list helped bring it back. If you get stuck, ask for a hint or reveal the answers. Your progress is saved in this browser.','最初的谜面藏在虾米歌单的推荐语里。平台关闭后，留下的存档和豆列让这条路得以重建。卡住时，可以先看提示，也可以主动揭晓答案。进度会保存在这个浏览器里。')}</p><div class="echo-source-links"><a href="https://www.douban.com/doulist/45894638/">{b('Original clues on Douban (in Chinese)','豆列中的原始谜面')} ↗</a><a href="https://www.jianshu.com/p/bacb95af08b1">{b('The 2017 introduction (in Chinese)','2017 年的原始介绍')} ↗</a><a href="assets/piano/ATTRIBUTION.txt">{b('Piano sample credits','钢琴采样与署名')} ↗</a></div></div></section>
    </main>'''
    head = render_meta(config, title=('Endless Echoes · simoncos','漫无止尽的回响 · simoncos'), description=(f'A branching music riddle through {song_count} songs, first made in 2017.',f'一场穿过{song_count} 首歌的音乐谜题，沿线索点亮歌曲之间的回响。'), canonical=PAGE)
    head += '\n<link rel="stylesheet" href="assets/endless-echoes.css?v=20261003p">'
    # Runtime only needs clues and the graph, not historical source annotations.
    payload = {key:data[key] for key in ('id','start','ending','bonus','finale') if key in data}
    payload['nodes'] = [{k:v for k,v in n.items() if k in ('id','title','aliases','clue','hint','next','dead_ends','position','terminal','quote','clue_format')} for n in data['nodes']]
    for source, node in zip(data['nodes'], payload['nodes']):
        art = presentation(source)
        node['presentation'] = {'flower': art['flower'], 'chord': {'midi': art['chord']['midi']}}
        if source.get('open_answers'):
            node['open_answers'] = [{k:a[k] for k in ('title','aliases')} for a in source['open_answers']]
    serialized = json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    return render_document(config,page_config(config,PAGE),head=head,main=main,html_attrs=' data-page-theme="dark" data-theme="dark"',body_attrs=' class="music-riddle"',tail=f'<script type="application/json" id="echo-data">{serialized}</script>')


def render_music_cover(portrait=False):
    """Use the same artwork as the page; keep crisp, editable text in SVG."""
    data = load_music_riddle()
    count = len(data['nodes']) - bool(data.get('bonus'))
    artwork = base64.b64encode((ROOT / 'gallery/music/assets/endless-echoes-garden-v5.webp').read_bytes()).decode('ascii')
    width, height = (600, 800) if portrait else (960, 600)
    if portrait:
        art = f'<image href="data:image/webp;base64,{artwork}" x="0" y="230" width="600" height="400"/>'
        text = f'''<text x="46" y="58" font-size="13" letter-spacing="3">EXPANDED EDITION · 2026</text>
<text x="42" y="139" font-size="64" font-weight="500">漫无止尽</text><text x="42" y="214" font-size="64" font-weight="500">的回响</text>
<path d="M46 668H554" stroke="#627080"/><text x="46" y="718" font-size="18" letter-spacing="3">ENDLESS ECHOES</text><text x="46" y="757" font-size="13" letter-spacing="2">{count} SONGS · MANY PATHS</text>'''
    else:
        art = f'<image href="data:image/webp;base64,{artwork}" x="370" y="93" width="576" height="384"/>'
        text = f'''<text x="65" y="78" font-size="13" letter-spacing="3">EXPANDED EDITION · 2026</text>
<text x="60" y="214" font-size="62" font-weight="500">漫无止尽</text><text x="60" y="290" font-size="62" font-weight="500">的回响</text>
<path d="M65 473H895" stroke="#627080"/><text x="65" y="523" font-size="16" letter-spacing="3">ENDLESS ECHOES</text><text x="895" y="523" font-size="13" text-anchor="end" letter-spacing="2">{count} SONGS · MANY PATHS</text>'''
    x, y, w, h = (0, 230, 600, 400) if portrait else (370, 93, 576, 384)
    mask = f'<defs><filter id="soft-edge"><feGaussianBlur stdDeviation="12"/></filter><mask id="art-edge" maskUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}"><rect x="{x+20}" y="{y+20}" width="{w-40}" height="{h-40}" fill="white" filter="url(#soft-edge)"/></mask></defs>'
    art = f'<g mask="url(#art-edge)">{art}</g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title"><title id="title">漫无止尽的回响 · Endless Echoes · {count} songs</title><rect width="{width}" height="{height}" fill="#141d27"/>{mask}{art}<g fill="#f4eee8" font-family="sans-serif">{text}</g></svg>\n'''
