#!/usr/bin/env python3
"""Two substantive reading companions from versioned public material."""
import argparse
import json
from pathlib import Path
from site_shell import ROOT,esc,load_config,render_document,render_meta,page_config
from site_entities import render_json_ld


def build():
    config=load_config();source=json.loads((ROOT/'data/topic_readers.json').read_text());outputs={}
    for item in source['readers']:
        for lang in ('en','zh'):
            path=f'topics/{item["id"]}{".en" if lang=="en" else ""}.html';peer=f'{item["id"]}{"" if lang=="en" else ".en"}.html'
            page=page_config(config,path)
            body=[]
            for part in item['sections']:
                body.append(f'<section id="{part["id"]}"><h2>{esc(part["title"][lang])}</h2>')
                body.extend(f'<p>{esc(p[lang])}</p>' for p in part['paragraphs'])
                if part.get('table'):
                    table=part['table'];body.append('<div style="overflow-x:auto"><table><thead><tr>'+''.join(f'<th>{esc(c[lang])}</th>'for c in table['columns'])+'</tr></thead><tbody>')
                    body.extend('<tr>'+''.join(f'<{ "th scope=\"row\"" if i==0 else "td" }>{esc(c[lang])}</{ "th" if i==0 else "td" }>' for i,c in enumerate(row))+'</tr>'for row in table['rows']);body.append('</tbody></table></div>')
                if part.get('links'):body.append('<ul>'+''.join(f'<li><a href="{esc(link["href"][lang])}">{esc(link["label"][lang])}</a></li>'for link in part['links'])+'</ul>')
                body.append('</section>')
            toc='<nav aria-label="'+('Contents'if lang=='en'else'目录')+'"><ul>'+''.join(f'<li><a href="#{p["id"]}">{esc(p["title"][lang])}</a></li>'for p in item['sections'])+'</ul></nav>'
            main=f'<main id="main" class="article" tabindex="-1"><div class="article-grid"><span class="article-spacer" aria-hidden="true"></span><div class="article-head"><a class="pill" href="../gallery.html">← {"Work"if lang=="en"else"作品"}</a><h1 class="article-title">{esc(item["title"][lang])}</h1></div><div class="article-main"><p class="article-meta">{"Reading companion · Updated"if lang=="en"else"伴读 · 更新"} <time datetime="{source["revision"]}">{source["revision"]}</time></p><div class="post-content"><p>{esc(item["intro"][lang])}</p>{toc}{"".join(body)}</div></div></div></main>'
            head=render_meta(config,title=(item['title']['en']+' · simoncos',item['title']['zh']+' · simoncos'),description=(item['description']['en'],item['description']['zh']),canonical=path)
            url=config['site_url'].rstrip('/')+'/'+path
            head+='\n'+render_json_ld({'@context':'https://schema.org','@type':'WebPage','url':url,'name':item['title'][lang],'inLanguage':'en'if lang=='en'else'zh-Hans','dateModified':source['revision']})
            outputs[path]=render_document(config,page,head=head,main=main)
    return outputs


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();stale=[]
    for rel,html in build().items():
        path=ROOT/rel
        if not path.exists() or path.read_text()!=html:
            stale.append(rel)
            if not args.check:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(html)
    if args.check and stale:raise SystemExit('Topic reader drift: '+', '.join(stale))
    print('Topic readers are current.'if not stale else 'Updated topic readers.')

if __name__=='__main__':main()
