"""Restore the music riddle as a generated, bilingual Work page."""
import base64
import json
import math
from music_riddle_data import load as load_music_riddle
from site_shell import ROOT, bi, esc, i18n_attrs, page_config, render_document, render_meta

PAGE = 'gallery/music/endless-echoes.html'


def edge_path(start, end, *, inset=False):
    """A shallow arc with explicit clearance, without short-edge hairpin turns."""
    x, y = start
    xx, yy = end
    dx, dy = xx - x, yy - y
    distance = math.hypot(dx, dy)
    bend = min(distance * .10, 24)
    cx, cy = (x + xx) / 2 - dy / distance * bend, (y + yy) / 2 + dx / distance * bend
    if inset:
        # End the actual path before the node; the marker tip sits at this endpoint.
        source_length = math.hypot(cx - x, cy - y)
        target_length = math.hypot(cx - xx, cy - yy)
        x, y = x + (cx - x) * 10 / source_length, y + (cy - y) * 10 / source_length
        xx, yy = xx + (cx - xx) * 23 / target_length, yy + (cy - yy) * 23 / target_length
    return f'M{x:.2f},{y:.2f} Q{cx:.2f},{cy:.2f} {xx:.2f},{yy:.2f}'


def map_svg(data):
    nodes = {n['id']: n for n in data['nodes']}
    song_count = len(nodes) - bool(data.get('bonus'))
    parts = [f'<svg class="echo-map" viewBox="0 0 {data["map"]["width"]} {data["map"]["height"]}" role="group" aria-labelledby="echo-map-title">',
             f'<title id="echo-map-title">{song_count} songs connected by {sum(len(n["next"]) for n in nodes.values())} paths · {song_count} 首歌，{sum(len(n["next"]) for n in nodes.values())} 条路径</title>']
    parts.append('<defs><marker id="echo-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 L2 5 Z" fill="#97a392"/></marker><marker id="echo-arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 L2 5 Z" fill="#eec298"/></marker></defs>')
    for node in nodes.values():
        x, y = node['position']
        for target in node['next']:
            xx, yy = nodes[target]['position']
            parts.append(f'<path class="echo-edge" data-from="{node["id"]}" data-to="{target}" marker-end="url(#echo-arrow)" d="{edge_path((x,y),(xx,yy),inset=True)}"/>')
    if data.get('bonus'):
        ending, bonus = nodes[data['ending']], nodes[data['bonus']]
        parts.append(f'<path class="echo-bonus-link is-hidden" data-bonus-link d="{edge_path(ending["position"],bonus["position"],inset=True)}"/>')
    for i, node in enumerate(data['nodes'], 1):
        x, y = node['position']
        start = node['id'] == data['start']
        bonus = node['id'] == data.get('bonus')
        ending = node['id'] == data['ending']
        role_class = 'is-start' if start else 'is-ending' if ending else ''
        role_label = '起点' if start else '终点' if ending else ''
        role_text = f'<text class="echo-node-kind" y="36" text-anchor="middle">{role_label}</text>' if role_label else ''
        parts.append(f'<g class="echo-node {"is-found is-current" if start else ""} {"is-bonus is-hidden" if bonus else ""} {role_class}" data-node="{node["id"]}" transform="translate({x} {y})"><circle class="echo-halo" r="22"/><circle r="{12 if start or ending else 7}"/><text y="{-24 if start or ending else -17}" text-anchor="middle">{esc(node["title"]) if start else '' if bonus else str(i).zfill(2)}</text>{role_text}</g>')
    parts.append('</svg>')
    return ''.join(parts)


def render_music_riddle(config):
    data = load_music_riddle()
    song_count = len(data['nodes']) - bool(data.get('bonus'))
    start = next(n for n in data['nodes'] if n['id'] == data['start'])
    b = bi
    main = f'''<main id="main" class="echo-main" tabindex="-1">
    <div class="echo-top"><a href="../../gallery.html#games">← {b('Work · Games','作品 · 游戏')}</a><span>2017 / 2026</span></div>
    <header class="echo-intro">
      <div class="echo-intro-copy"><p class="echo-kicker">{b('A MUSIC RIDDLE · EXPANDED EDITION','音乐谜题 · 扩展版')}</p>
      <h1>{b('Endless','漫无止尽')}<br>{b('Echoes','的回响')}</h1>
      <div class="echo-intro-note"><span class="echo-count">{song_count}</span><p>{b('songs. More than one way through.','首歌，不止一条路。')}</p><p>{b('Read a clue, name the next song.','读一段线索，猜下一首歌。')}<br> {b('Follow what you remember.','沿着你记得的声音走。')}</p></div>
      <a class="echo-begin" href="#echo-game">{b('Begin the trail','开始探索')} <span aria-hidden="true">↘</span></a></div>
      <figure class="echo-hero-art"><img src="assets/endless-echoes-ribbon-v1.webp" width="1200" height="800" alt="" fetchpriority="high" decoding="async"></figure>
    </header>
    <div id="echo-game" class="echo-game" data-echo-game>
      <section class="echo-clue-panel" aria-labelledby="echo-song">
        <div class="echo-panel-top"><span>{b('NOW AT','此刻停在')}</span><button type="button" class="echo-js echo-text-button" data-back disabled>{b('← Back','← 退一步')}</button></div>
        <h2 id="echo-song" lang="zh-Hans">{esc(start['title'])}</h2>
        <blockquote class="echo-quote" id="echo-quote" lang="zh-Hans" hidden></blockquote>
        <p class="echo-clue" id="echo-clue">{b(start['clue']['en'],start['clue']['zh'])}</p>
        <p class="echo-branch echo-js" id="echo-branch"></p>
        <form class="echo-answer echo-js" id="echo-form">
          <label for="echo-answer">{b('Which song comes next?','下一首是什么？')}</label>
          <div class="echo-input-row"><input id="echo-answer" name="song" autocomplete="off" maxlength="80" required {i18n_attrs(placeholder=('Enter a Chinese song title','输入歌名，简繁体均可'))}><button type="submit">{b('Follow →','沿着它走 →')}</button></div>
        </form>
        <p class="echo-feedback" id="echo-feedback" role="status" aria-live="polite"></p>
        <div class="echo-ending" id="echo-ending" hidden><p>{b('You have found the ending. Other paths are still waiting.','你找到了终点。还有一些路，等你回去走。')}</p><button class="echo-button" data-go-start type="button">{b('Explore another branch','回到起点，走另一条路')}</button></div>
        <div class="echo-ending" id="echo-dead-end" hidden><button class="echo-button" data-return-branch type="button">{b("Return to the previous song","退回上一首")}</button></div>
        <div class="echo-help echo-js"><details id="echo-hint"><summary>{b('Get a hint','给我一点提示')}</summary><p id="echo-hint-text"></p></details><details id="echo-reveal"><summary>{b('Show answers','揭晓答案')}</summary><p>{b('Choose a song below to follow that path.','选择下方的歌，沿这条路继续。')}</p><div id="echo-reveal-choices"></div></details></div>
        <noscript><p class="echo-noscript">{b('The interactive trail needs JavaScript. You can follow the original clues in the Douban list below; start with 不来也不去.','开启 JavaScript 可在这里猜歌和保存进度。也可以在下方豆列阅读原始线索，从《不来也不去》开始。')}</p></noscript>
      </section>
      <section class="echo-map-panel" aria-labelledby="echo-map-heading">
        <div class="echo-panel-top"><h2 id="echo-map-heading">{b('YOUR ECHOES','你的回响')}</h2><button class="echo-text-button echo-js" type="button" data-map-zoom aria-pressed="false">{b('Enlarge map','放大地图')}</button><span class="echo-progress"><span id="echo-found-count">1</span> / {song_count}</span></div>
        <div class="echo-map-stage">{map_svg(data)}</div>
        <div class="echo-bonus echo-js" id="echo-bonus" hidden role="status"><p>{b("Every song is lit. A hidden echo awaits beside the ending.","所有歌曲都已点亮。终点旁，还有一段隐藏的回响。")}</p><button class="echo-button" type="button" data-open-bonus>{b("Listen to the hidden echo","听听隐藏的回响")}</button></div>
        <div class="echo-map-key"><span><i class="echo-key-found"></i>{b('Found','已找到')}</span><span><i class="echo-key-unknown"></i>{b('Still unheard','尚未抵达')}</span><span>→ {b('Arrows lead to the next song','箭头指向下一首')}</span><span class="echo-map-instruction">{b('Revisit a lit song','点亮的歌可以再次打开')}</span></div>
      </section>
    </div>
    <section class="echo-collection echo-js" aria-labelledby="echo-collection-heading"><div class="echo-panel-top"><h2 id="echo-collection-heading">{b('THE SONGS YOU FOUND','已经找到的歌')}</h2><span id="echo-save-status"></span></div><div class="echo-song-list" id="echo-song-list"></div><details class="echo-reset"><summary>{b('Start a fresh trail','重新开始')}</summary><p>{b('This clears the saved trail in this browser.','这会清除这个浏览器里保存的进度。')}</p><button type="button" data-reset>{b('Clear my trail and restart','清除进度，从头开始')}</button></details></section>
    <section class="echo-about"><h2>{b('The echoes continue.','旧日的谜，新的回响。')}</h2><div><p>{b('This is the expanded edition of a music riddle first made in 2017. The original 26 songs have grown into 36, with new branches, dead ends and a hidden echo waiting beyond the complete collection.','这是 2017 年音乐谜题的扩展版。原来的 26 首歌，如今延展为 36 首：新增的分支、死胡同，以及集齐之后才会出现的隐藏回响，让旧日的线索有了新的去处。')}</p><p>{b('Read the clue and guess which song it leads to. Some paths meet again; others bring you back to the beginning. You can reach the ending before finding every song, then return to explore the paths you missed.','读一段谜面，猜它指向的下一首歌。有些路会重逢，有些会带你回到最初。不必集齐所有歌，也能到达终点；抵达之后，仍可以回头寻找未曾走过的分支。')}</p><p>{b('The original trail lived in Xiami playlist comments. After the platform closed, its surviving archive and Douban list helped bring it back. If you get stuck, ask for a hint or reveal the answers. Your progress is saved in this browser.','最初的谜面藏在虾米歌单的推荐语里。平台关闭后，留下的存档和豆列让这条路得以重建。卡住时，可以先看提示，也可以主动揭晓答案。进度会保存在这个浏览器里。')}</p><div class="echo-source-links"><a href="https://www.douban.com/doulist/45894638/">{b('Original clues on Douban (in Chinese)','豆列中的原始谜面')} ↗</a><a href="https://www.jianshu.com/p/bacb95af08b1">{b('The 2017 introduction (in Chinese)','2017 年的原始介绍')} ↗</a></div></div></section>
    </main>'''
    head = render_meta(config, title=('Endless Echoes · simoncos','漫无止尽的回响 · simoncos'), description=(f'A branching music riddle through {song_count} songs, first made in 2017.',f'一场穿过{song_count} 首歌的音乐谜题，沿线索点亮歌曲之间的回响。'), canonical=PAGE)
    head += '\n<link rel="stylesheet" href="assets/endless-echoes.css?v=20261002h">'
    # Runtime only needs clues and the graph, not historical source annotations.
    payload = {key:data[key] for key in ('id','start','ending','bonus') if key in data}
    payload['nodes'] = [{k:v for k,v in n.items() if k in ('id','title','aliases','clue','hint','next','dead_ends','position','terminal','quote')} for n in data['nodes']]
    for source, node in zip(data['nodes'], payload['nodes']):
        if source.get('open_answers'):
            node['open_answers'] = [{k:a[k] for k in ('title','aliases')} for a in source['open_answers']]
    serialized = json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    return render_document(config,page_config(config,PAGE),head=head,main=main,body_attrs=' class="music-riddle"',tail=f'<script type="application/json" id="echo-data">{serialized}</script>')


def render_music_cover(portrait=False):
    """Use the same artwork as the page; keep crisp, editable text in SVG."""
    data = load_music_riddle()
    count = len(data['nodes']) - bool(data.get('bonus'))
    artwork = base64.b64encode((ROOT / 'gallery/music/assets/endless-echoes-ribbon-v1.webp').read_bytes()).decode('ascii')
    width, height = (600, 800) if portrait else (960, 600)
    if portrait:
        art = f'<image href="data:image/webp;base64,{artwork}" x="0" y="230" width="600" height="400"/>'
        text = f'''<text x="46" y="58" font-size="13" letter-spacing="3">EXPANDED EDITION · 2026</text>
<text x="42" y="139" font-size="64" font-weight="500">漫无止尽</text><text x="42" y="214" font-size="64" font-weight="500">的回响</text>
<path d="M46 668H554" stroke="#c7beb0"/><text x="46" y="718" font-size="18" letter-spacing="3">ENDLESS ECHOES</text><text x="46" y="757" font-size="13" letter-spacing="2">{count} SONGS · MANY PATHS</text>'''
    else:
        art = f'<image href="data:image/webp;base64,{artwork}" x="370" y="93" width="576" height="384"/>'
        text = f'''<text x="65" y="78" font-size="13" letter-spacing="3">EXPANDED EDITION · 2026</text>
<text x="60" y="214" font-size="62" font-weight="500">漫无止尽</text><text x="60" y="290" font-size="62" font-weight="500">的回响</text>
<path d="M65 473H895" stroke="#c7beb0"/><text x="65" y="523" font-size="16" letter-spacing="3">ENDLESS ECHOES</text><text x="895" y="523" font-size="13" text-anchor="end" letter-spacing="2">{count} SONGS · MANY PATHS</text>'''
    x, y, w, h = (0, 230, 600, 400) if portrait else (370, 93, 576, 384)
    mask = f'<defs><filter id="soft-edge"><feGaussianBlur stdDeviation="12"/></filter><mask id="art-edge" maskUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}"><rect x="{x+20}" y="{y+20}" width="{w-40}" height="{h-40}" fill="white" filter="url(#soft-edge)"/></mask></defs>'
    art = f'<g mask="url(#art-edge)">{art}</g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title"><title id="title">漫无止尽的回响 · Endless Echoes · {count} songs</title><rect width="{width}" height="{height}" fill="#f0eade"/>{mask}{art}<g fill="#2b2824" font-family="sans-serif">{text}</g></svg>\n'''
