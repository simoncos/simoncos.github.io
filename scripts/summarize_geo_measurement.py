#!/usr/bin/env python3
"""Validate complete consumer answers and separate discovery from navigation."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ROUNDS = ('baseline','day14','day28')
WORK_HOSTS = {'sleep-toolkit-production.up.railway.app','hn-waywo-dashboard.vercel.app','simoncos-hn-llm-research.vercel.app'}


def summarize(records, questions):
    source={row['id']:row for row in questions}
    seen=set();products=set();groups=defaultdict(lambda:{'ok':0,'error':0,'not_run':0,'site_substantive':0,'site_navigation':0,'work_substantive':0,'incorrect_citations':0})
    for row in records:
        q=source.get(row.get('question_id'))
        if not q or row.get('question')!=q['question']:raise ValueError('Question must match the frozen source verbatim')
        product=row.get('product_id');round=row.get('round')
        if not product or round not in ROUNDS:raise ValueError('Missing product or invalid round')
        key=(round,product,q['id'])
        if key in seen:raise ValueError('Duplicate round/product/question')
        seen.add(key);products.add(product)
        group=groups[(round,product,q['category'],q['language'])];status=row.get('status')
        if status not in ('ok','error','not_run'):raise ValueError('Invalid status')
        group[status]+=1
        if status!='not_run':
            context=row.get('context')or{}
            for field in ('product','displayed_model','search_mode','region','login_personalization'):
                if not context.get(field):raise ValueError('Missing run context: '+field)
            if context.get('new_conversation')is not True or not row.get('run_at'):raise ValueError('Missing timestamp or fresh conversation')
        if status=='error':
            if not row.get('errors'):raise ValueError('Service errors require a recorded reason')
            continue
        if status!='ok':continue
        if not isinstance(row.get('answer'),str) or not row['answer'].strip():raise ValueError('Normal answers require full answer text')
        if q['category'] in ('brand','project') and not isinstance(row.get('identity_correct'),bool):raise ValueError('Brand/project answers require identity review')
        site_sub=site_nav=work_sub=False
        for cite in row.get('citations',[]):
            url=urlsplit(cite.get('url',''));kind=cite.get('kind')
            if url.scheme not in ('http','https')or not url.hostname or kind not in ('substantive','navigation') or not isinstance(cite.get('correct'),bool)or not cite.get('claim'):raise ValueError('Citation requires URL, claim, kind and human correctness judgment')
            if not cite['correct']:group['incorrect_citations']+=1;continue
            if url.hostname=='simoncos.github.io':
                site_sub|=kind=='substantive';site_nav|=kind=='navigation'
            elif url.hostname in WORK_HOSTS:work_sub|=kind=='substantive'
        group['site_substantive']+=int(site_sub);group['site_navigation']+=int(site_nav);group['work_substantive']+=int(work_sub)
    expected=len(questions)*len(products)*len(ROUNDS)
    rows=[]
    for key,value in sorted(groups.items()):
        rows.append(dict(zip(('round','product','category','language'),key),**value,
                         site_substantive_rate=value['site_substantive']/value['ok'] if value['ok']else None))
    executed=sum(row.get('status')!='not_run'for row in records)
    return {'status':'complete'if len(products)==3 and len(records)==expected and executed==expected else'incomplete',
            'expected_for_selected_products':expected,'recorded':len(records),'executed':executed,
            'not_executed_or_missing':expected-executed,'products':sorted(products),'groups':rows,
            'interpretation':'Descriptive observation; rates are null without normal answers.'}


def main():
    p=argparse.ArgumentParser();p.add_argument('input',type=Path);args=p.parse_args()
    questions=json.loads((ROOT/'docs/geo-questions-2026-10-04.json').read_text())['questions']
    rows=[json.loads(line)for line in args.input.read_text().splitlines()if line.strip()]
    print(json.dumps(summarize(rows,questions),ensure_ascii=False,indent=2))

if __name__=='__main__':main()
