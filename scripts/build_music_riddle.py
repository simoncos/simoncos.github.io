"""Restore the music riddle as a generated, bilingual Work page."""
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
    parts = [f'<svg class="echo-map" viewBox="0 0 {data["map"]["width"]} {data["map"]["height"]}" role="group" aria-labelledby="echo-map-title">',
             f'<title id="echo-map-title">{len(nodes)} songs connected by {sum(len(n["next"]) for n in nodes.values())} paths · {len(nodes)} 首歌，{sum(len(n["next"]) for n in nodes.values())} 条路径</title>']
    parts.append('<defs><marker id="echo-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 L2 5 Z" fill="#97a392"/></marker><marker id="echo-arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0 L10 5 L0 10 L2 5 Z" fill="#eec298"/></marker></defs>')
    for node in nodes.values():
        x, y = node['position']
        for target in node['next']:
            xx, yy = nodes[target]['position']
            parts.append(f'<path class="echo-edge" data-from="{node["id"]}" data-to="{target}" marker-end="url(#echo-arrow)" d="{edge_path((x,y),(xx,yy),inset=True)}"/>')
    for i, node in enumerate(data['nodes'], 1):
        x, y = node['position']
        start = node['id'] == data['start']
        parts.append(f'<g class="echo-node {"is-found is-current" if start else ""}" data-node="{node["id"]}" transform="translate({x} {y})"><circle class="echo-halo" r="22"/><circle r="7"/><text y="-17" text-anchor="middle">{esc(node["title"]) if start else str(i).zfill(2)}</text></g>')
    parts.append('</svg>')
    return ''.join(parts)


def render_music_riddle(config):
    data = load_music_riddle()
    start = next(n for n in data['nodes'] if n['id'] == data['start'])
    b = bi
    main = f'''<main id="main" class="echo-main" tabindex="-1">
    <div class="echo-top"><a href="../../gallery.html#games">← {b('Work · Games','作品 · 游戏')}</a><span>2017 / 2026</span></div>
    <header class="echo-intro">
      <div><p class="echo-kicker">{b('EASON CHAN · A MUSIC RIDDLE','陈奕迅 · 广域音乐谜题')}</p>
      <h1>{b('Endless','漫无止尽')}<br>{b('Echoes','的回响')}</h1></div>
      <div class="echo-intro-note"><span class="echo-count">{len(data["nodes"])}</span><p>{b('songs. More than one way through.','首歌，不止一条路。')}</p><p>{b('Read a clue, name the next song.','读一段线索，猜下一首歌。')}<br>{b('Follow what you remember.','沿着你记得的声音走。')}</p></div>
    </header>
    <div class="echo-game" data-echo-game>
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
        <div class="echo-help echo-js"><details id="echo-hint"><summary>{b('A little hint','一点提示')}</summary><p id="echo-hint-text"></p></details><details id="echo-reveal"><summary>{b('Reveal the next songs','揭晓下一首（会显示答案）')}</summary><div id="echo-reveal-choices"></div></details></div>
        <noscript><p class="echo-noscript">{b('The interactive trail needs JavaScript. You can follow the original clues in the Douban list below; start with 不来也不去.','开启 JavaScript 可在这里猜歌和保存进度。也可以在下方豆列阅读原始线索，从《不来也不去》开始。')}</p></noscript>
      </section>
      <section class="echo-map-panel" aria-labelledby="echo-map-heading">
        <div class="echo-panel-top"><h2 id="echo-map-heading">{b('YOUR ECHOES','你的回响')}</h2><button class="echo-text-button echo-js" type="button" data-map-zoom aria-pressed="false">{b('Enlarge map','放大地图')}</button><span class="echo-progress"><span id="echo-found-count">1</span> / {len(data["nodes"])}</span></div>
        <div class="echo-map-stage">{map_svg(data)}</div>
        <div class="echo-map-key"><span><i class="echo-key-found"></i>{b('Found','已找到')}</span><span><i class="echo-key-unknown"></i>{b('Still unheard','尚未抵达')}</span><span>→ {b('Arrows lead to the next song','箭头指向下一首')}</span><span class="echo-map-instruction">{b('Revisit a lit song','点亮的歌可以再次打开')}</span></div>
      </section>
    </div>
    <section class="echo-collection echo-js" aria-labelledby="echo-collection-heading"><div class="echo-panel-top"><h2 id="echo-collection-heading">{b('THE SONGS YOU FOUND','已经找到的歌')}</h2><span id="echo-save-status"></span></div><div class="echo-song-list" id="echo-song-list"></div><details class="echo-reset"><summary>{b('Start a fresh trail','重新开始')}</summary><p>{b('This clears the saved trail in this browser.','这会清除这个浏览器里保存的进度。')}</p><button type="button" data-reset>{b('Clear my trail and restart','清除进度，从头开始')}</button></details></section>
    <section class="echo-about"><h2>{b('A riddle that outlived its platform','一个比平台活得更久的谜')}</h2><div><p>{b('In March 2017, I hid clues in comments on Eason Chan’s songs on Xiami. One song led to another; some paths branched, some met again, and some led nowhere. There was one ending, and 26 songs to collect.','2017 年 3 月，我把谜面藏在虾米音乐的陈奕迅歌曲评论里。一首歌引向另一首，有的分岔，有的重逢，也有死胡同。终点只有一个，等待收集的歌有 26 首。')}</p><p>{b('Xiami has since closed. This edition rebuilds the trail from the surviving Douban list. Lyric quotations become descriptions of their imagery; song titles remain in their original Chinese or English. This edition also adds 绵绵 as a dead-end branch, with an author-selected quotation. You can reach the ending without finding every song.','虾米后来关闭了。这个版本根据保留下来的豆列重建路径，将歌词引用改为意象提示，保留原始歌名。本版另增《绵绵》作为死胡同支线，保留作者选定的引用。不必集齐所有歌，也能到达终点。')}</p><p>{b('All answers are Eason Chan songs. Knowing the songs helps; hints and optional reveals are here if you get stuck. Progress stays in this browser.','谜底都在陈奕迅的歌里。熟悉歌曲会更容易；卡住时可以看提示，或主动揭晓下一首。进度保存在这个浏览器里。')}</p><div class="echo-source-links"><a href="https://www.douban.com/doulist/45894638/">{b('Original clues on Douban (in Chinese)','豆列中的原始谜面')} ↗</a><a href="https://www.jianshu.com/p/bacb95af08b1">{b('The 2017 introduction (in Chinese)','2017 年的原始介绍')} ↗</a></div></div></section>
    </main>'''
    head = render_meta(config, title=('Endless Echoes · simoncos','漫无止尽的回响 · simoncos'), description=('A branching music riddle through 27 Eason Chan songs, first made in 2017.','一场穿过陈奕迅 27 首歌的音乐谜题，沿线索点亮歌曲之间的回响。'), canonical=PAGE)
    head += '\n<link rel="stylesheet" href="assets/endless-echoes.css?v=20261002e">'
    # Runtime only needs clues and the graph, not historical source annotations.
    payload = {key:data[key] for key in ('id','start','ending')}
    payload['nodes'] = [{k:v for k,v in n.items() if k in ('id','title','aliases','clue','hint','next','dead_ends','position','terminal','quote')} for n in data['nodes']]
    for source, node in zip(data['nodes'], payload['nodes']):
        if source.get('open_answers'):
            node['open_answers'] = [{k:a[k] for k in ('title','aliases')} for a in source['open_answers']]
    serialized = json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    return render_document(config,page_config(config,PAGE),head=head,main=main,body_attrs=' class="music-riddle"',tail=f'<script type="application/json" id="echo-data">{serialized}</script>')


def render_music_cover(portrait=False):
    data = load_music_riddle()
    nodes = {n['id']:n for n in data['nodes']}
    paths=[]
    for node in nodes.values():
        x,y=node['position']
        for target in node['next']:
            xx,yy=nodes[target]['position']
            paths.append(f'<path d="{edge_path((x,y),(xx,yy))}"/>')
    dots=''.join(f'<circle cx="{n["position"][0]}" cy="{n["position"][1]}" r="7"/>' for n in nodes.values())
    if portrait:
        return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-labelledby="title"><title id="title">漫无止尽的回响 · Endless Echoes · {len(nodes)} Eason Chan songs</title>
<rect width="600" height="800" fill="#172420"/>
<text x="50" y="62" fill="#b2baa9" font-family="sans-serif" font-size="14" letter-spacing="2">EASON CHAN · 2017</text>
<text x="46" y="154" fill="#f0e8dc" font-family="sans-serif" font-size="68" font-weight="500">漫无止尽</text><text x="46" y="236" fill="#f0e8dc" font-family="sans-serif" font-size="68" font-weight="500">的回响</text>
<g transform="translate(12 290) scale(.62)"><g fill="none" stroke="#9aa68f" stroke-width="2" opacity=".7">{''.join(paths)}</g><g fill="#d7b388" stroke="#172420" stroke-width="3">{dots}</g><circle cx="85" cy="430" r="23" fill="#eec298" opacity=".2"/></g>
<text x="50" y="707" fill="#eec298" font-family="monospace" font-size="18" letter-spacing="2">{len(nodes)} SONGS</text><text x="50" y="747" fill="#b2baa9" font-family="monospace" font-size="14" letter-spacing="2">ENDLESS ECHOES</text></svg>\n'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" role="img" aria-labelledby="title"><title id="title">漫无止尽的回响 · Endless Echoes · {len(nodes)} Eason Chan songs</title>
<rect width="960" height="600" fill="#172420"/><g transform="translate(140 100) scale(.83)"><g fill="none" stroke="#83937b" stroke-width="1.5" opacity=".65">{''.join(paths)}</g><g fill="#d7b388" stroke="#172420" stroke-width="3">{dots}</g><circle cx="85" cy="430" r="20" fill="#eec298" opacity=".16"/></g>
<text x="120" y="75" fill="#b2baa9" font-family="sans-serif" font-size="15" letter-spacing="3">EASON CHAN · 2017</text><text x="116" y="167" fill="#f0e8dc" font-family="sans-serif" font-size="66" font-weight="500">漫无止尽</text><text x="116" y="247" fill="#f0e8dc" font-family="sans-serif" font-size="66" font-weight="500">的回响</text></svg>\n'''
