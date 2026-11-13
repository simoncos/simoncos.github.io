#!/usr/bin/env python3
"""Static evidence from already public chart payloads; never reads raw CSV."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import statistics
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'gallery/research'
START = '<!-- sleep-evidence:start -->'
END = '<!-- sleep-evidence:end -->'
TAGS = [('massage','按摩','Massage'),('tea/coffee','茶 / 咖啡','Tea / coffee'),('travel','旅行','Travel'),
        ('break','显式中断标签','Explicit break tag'),('Worked out','运动标签','Exercise tag'),('wine','饮酒','Alcohol')]


def payload():
    path = DIR / 'assets/sleep/data.json'
    if path.exists():
        data = json.loads(path.read_text())
    else:
        text = (DIR / 'assets/sleep-2016-2026.ts').read_text()
        data = {name: json.loads(value) for name,value in re.findall(r'^const (DATA\d*) = (\{.*\});$',text,re.M)}
    return data


def summary(data):
    rows = data['DATA']['scatter']
    baseline = statistics.mean(r['quality'] for r in rows)
    tags = []
    for key,zh,en in TAGS:
        selected = [r for r in rows if key in r['tags']]
        reference = data['DATA']['curated_tag_impact'][key]
        if len(selected) != reference['n_with']:
            raise ValueError(f'{key}: public summary count disagrees with public records')
        tags.append({'tag':key,'label':{'zh':zh,'en':en},'records':len(selected),
                     'from':min(r['date'] for r in selected),'through':max(r['date'] for r in selected),
                     'quality_mean':reference['with_mean'],'delta_pp':reference['diff_vs_baseline'],
                     'comparison':'all included records; overlapping tags; no additional exclusions'})
    fingerprint = hashlib.sha256(json.dumps(data,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    return {'version':'public-summary-v1','reviewed':'2026-10-05','data_as_of':max(r['date'] for r in rows),
            'source':'Existing public chart DATA payloads','payload_sha256':fingerprint,
            'unit':'included SleepCycle record, not deduplicated calendar date or independent participant',
            'records':len(rows),'distinct_record_dates':len({r['date'] for r in rows}),
            'quality_mean':baseline,'tags':tags,
            'bd_years':[{ 'year':year,'bd_mean':r['bd_mean'],'bd_n':r['bd_n'] }
                        for year,r in data['DATA2']['yearly_full'].items() if r['bd_n']],
            'limitations':['Original raw CSV not rerun or republished.',
                           'The original deployed processing commit is not established by this fingerprint.',
                           'Tag date ranges are first/last matching records, not continuous tag coverage.',
                           'BD n is not supplied for several exercise/environment groups.',
                           'Public date field contains multiple records on some dates; no night reassignment applied.']}


def render(s,lang):
    en = lang=='en'
    def choose(a,b): return a if en else b
    tagrows=''.join(f'<tr id="tag-{escape(r["tag"].replace("/","-").replace(" ","-").lower())}"><th scope="row">{escape(r["label"][lang])}</th><td>{r["records"]}</td><td>{r["from"]}—{r["through"]}</td><td>{r["quality_mean"]:.1f}%</td><td>{r["delta_pp"]:+.1f}</td></tr>' for r in s['tags'])
    records = payload()['DATA']['scatter']
    groups = [
        ('all', records, 'All included records', '全部有效记录'),
        ('2019', [r for r in records if r['year'] == 2019], '2019', '2019 年'),
        ('2020', [r for r in records if r['year'] == 2020], '2020 · highest annual mean', '2020 年 · 最高年均值'),
        ('2021', [r for r in records if r['year'] == 2021], '2021', '2021 年'),
        ('nontravel', [r for r in records if 'travel' not in r['tags']], 'Records without a travel tag', '没有旅行标签的记录'),
    ]
    scorerows=''.join(
        f'<tr id="score-{key}"><th scope="row">{escape(en_label if en else zh_label)}</th><td>{len(rows):,}</td><td>{statistics.mean(r["quality"] for r in rows):.1f}%</td></tr>'
        for key, rows, en_label, zh_label in groups
    )
    scoretable = (
        f'<div class="evidence-table-scroll" tabindex="0" role="region" aria-label="{choose("Quality means and their denominators", "质量分均值与分母")}"><table class="evidence-table"><caption>{choose("Which records does each average describe?", "均值与样本范围")}</caption><thead><tr><th>{choose("Group", "分组")}</th><th>n</th><th>{choose("Mean", "均值")}</th></tr></thead><tbody>{scorerows}</tbody></table></div>'
    )
    bdrows=''.join(f'<li>{r["year"]}{choose(" (Jan–Mar)","（1–3 月）") if r["year"]=="2026" else ""}: n={r["bd_n"]}, {r["bd_mean"]:.2f} {choose("interruptions/h","次/小时")}</li>' for r in s['bd_years'])
    metrics=[
      ('SleepCycle quality (%)','SleepCycle 质量分（%）','App score; opaque algorithm, not a clinical measure.','App 分数；算法不透明，不能作为临床指标。'),
      ('Time in bed / estimated asleep (h)','卧床 / 估计睡眠时长（小时）','Different fields. The public scatter duration is estimated asleep, rounded to 0.01 h.','不同字段。公开散点的 duration 是估计睡眠时长，已舍入到 0.01 小时。'),
      ('BD (interruptions/h)','BD（次/小时）','Consumer breathing-interruption estimate. Missing values are not zero; not clinical AHI.','消费级呼吸中断估算。缺失不等于零；不等同于临床 AHI。'),
      ('Snoring (min)','打呼噜（分钟）','Current processing code fills missing snore time with zero. Its n counts records, not verified detector coverage.','当前处理代码把缺失打呼噜时长补零；其 n 是记录数，不能当成检测功能有效覆盖数。'),
      ('Morning mood','醒来情绪','Self-reported Good / OK / Bad / Not set; not a diagnosis.','自报 Good / OK / Bad / Not set；不是诊断。'),
      ('Adjusted scores','修正分','Author-defined mood and respiratory weighting, not validated health scales.','作者自定义的情绪与呼吸加权，不是经过验证的健康量表。'),
    ]
    dictionary=''.join(f'<dt>{choose(a,b)}</dt><dd>{choose(c,d)}</dd>' for a,b,c,d in metrics)
    author='../../about.html' if en else '../../about.zh.html'
    return f'''{START}
<section id="evidence-details" class="editorial-method" aria-labelledby="evidence-details-title"><div class="container"><div class="method-card">
<p class="section-label">{choose('Evidence & definitions','证据与定义')}</p><h2 id="evidence-details-title">{choose('Read the numbers with their denominators','把数值与分母一起读')}</h2>
<p class="prose">{choose('Author','作者')} <a href="{author}">Che Zhao (simoncos)</a> · {choose('Data through','数据截至')} <time datetime="{s['data_as_of']}">{s['data_as_of']}</time> · {choose('Evidence reviewed','证据复核')} <time datetime="{s['reviewed']}">{s['reviewed']}</time></p>
<p class="prose">{choose(f'The published scatter contains {s["records"]:,} records on {s["distinct_record_dates"]:,} distinct date values. The original processing uses the recording start date; a date can contain several recordings, including sessions across midnight. These tables retain record-weighted means. They do not assert independent nights or deduplicate dates; a new night-assignment rule would require a separate reanalysis.', f'公开散点包含 {s["records"]:,} 条记录、{s["distinct_record_dates"]:,} 个不同日期值。原处理代码以开始记录的日期归属，一天可能出现多条记录，也可能涉及跨午夜记录。本表保留按记录加权的均值；不把记录条数当成独立夜数，不按日期去重。若重新定义“一个夜晚”，需要单独重算。')}</p>
{scoretable}
<div class="evidence-table-scroll" tabindex="0" role="region" aria-label="{choose('Tag comparison table; scroll horizontally on small screens','标签比较表；窄屏可横向滚动')}"><table class="evidence-table"><caption>{choose('Tags: quality compared with the overall 83.3% baseline','标签：质量分与整体 83.3% 基线比较')}</caption><thead><tr><th>{choose('Tag','标签')}</th><th>n</th><th>{choose('First–last tagged record','首末标签记录')}</th><th>{choose('Mean','均值')}</th><th>{choose('Difference (pp)','差值（百分点）')}</th></tr></thead><tbody>{tagrows}</tbody></table></div>
<p class="prose">{choose('Dates show the first and last matching record, not uninterrupted coverage. Tags overlap; each row adds no exclusions and compares with all included records, not its untagged complement. Rounded published tag summaries are retained. Differences between these groups are observational associations, not treatment effects.','日期是标签首次与最后出现的记录，不能表示连续覆盖。标签相互重叠；每行不额外排除记录，比较组是全体记录，而非无该标签的补集。沿用已公开、已舍入的标签汇总。分组差异是观察性关联，不能当成干预效果。')}</p>
<h3>{choose('BD annual means: each metric has its own n','BD 年均值：每个指标有自己的 n')}</h3><ul class="evidence-list">{bdrows}</ul>
<p class="prose">{choose('March 2026 alone is 8.18 interruptions/h; its n is absent from the published monthly summary. The low-step exercise proxy has 130 quality records and BD 4.0, but no separate BD n. Environmental groups also lack per-metric n. Do not substitute group totals or compare them as equally covered cohorts.','单独看 2026 年 3 月为 8.18 次/小时，公开月度汇总未列其 n。低步数运动代理组有 130 条质量分记录、BD 为 4.0，但未单列 BD 有效 n；环境组也缺指标各自的 n。不能以组总数代填，也不能当成覆盖相同的队列。')}</p>
<h3>{choose('Metric dictionary','指标字典')}</h3><dl class="evidence-dictionary">{dictionary}</dl>
<p class="prose">{choose('Current source code accepts time in bed ≥3 h, estimated asleep >0 and a present quality score. This round checked code and public aggregates only; it did not rerun the original CSV or establish the processing commit used for the historical report. Sleep-stage discontinuities around 2025 cannot by themselves establish an algorithm release or a physiological change.','当前源码保留卧床 ≥3 小时、估计睡眠 >0 且有质量分的记录。本轮只核对源码与公开汇总，没有重跑原始 CSV，也没有确立历史报告所用的处理提交。2025 年前后的睡眠阶段断裂，本身不能证明具体算法发布或生理变化。')}</p>
<p class="prose">{choose('Reproduction','复核版本')} <code>{s['version']}</code> · <a href="assets/sleep-evidence.json">{choose('Download aggregate evidence & payload fingerprint','下载汇总证据与数据指纹')}</a> · <a href="../../apps/sleep-toolkit{'.en' if en else ''}.html">Sleep Toolkit</a>. {choose('The fingerprint identifies the existing public chart payload, not the private export or an original pipeline version. Model outputs (quality model n=1,156, MAE=6.35, R²=0.50) are retained predictions; no retraining, interval estimate or causal validation was performed.','指纹识别已有公开图表数据，不代表私人导出文件或原流水线版本。模型结果（质量模型 n=1,156、MAE=6.35、R²=0.50）保留为预测结果；本轮未重新训练、估计区间或做因果验证。')}</p>
</div></div></section>
{END}'''


def outputs():
    s=summary(payload())
    out={'gallery/research/assets/sleep-evidence.json':json.dumps(s,ensure_ascii=False,indent=2)+'\n'}
    for lang,suffix in (('zh',''),('en','.en')):
        path=DIR/f'sleep-2016-2026{suffix}.html';text=path.read_text();block=render(s,lang)
        # Later work-page JSON-LD already describes these essays; do not add a second block.
        if '<!-- sleep-entity:start -->' in text:
            text=re.sub(r'<!-- sleep-entity:start -->.*?<!-- sleep-entity:end -->\s*', '', text, flags=re.S)
        if START in text:
            text=re.sub(re.escape(START)+r'.*?'+re.escape(END),lambda _:block,text,flags=re.S)
        else:
            anchor='<div class="section" id="overview"'
            offset=text.index(anchor);text=text[:offset]+block+'\n\n'+text[offset:]
        out[str(path.relative_to(ROOT))]=text
    return out


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();stale=[]
    for rel,value in outputs().items():
        path=ROOT/rel
        if not path.exists() or path.read_text()!=value:
            stale.append(rel)
            if not args.check:path.write_text(value)
    if args.check and stale:raise SystemExit('Sleep evidence drift: '+', '.join(stale))
    print('Sleep evidence is current.' if not stale else 'Updated public sleep evidence.')

if __name__=='__main__':main()
