"""Static, bilingual research reader; all published evidence lives in the HTML."""
from __future__ import annotations
import json
from pathlib import Path
from site_shell import ROOT, bi, esc, i18n_attrs, page_config, render_document, render_meta

PAGE = 'gallery/research/zhihu-2015.html'
ARTICLE1 = '../../blogs/zhihu-social-network-analysis-1-basic-statistics'
ARTICLE2 = '../../blogs/zhihu-social-network-analysis-2-follow-network'


def link(base, en, zh):
    return f'<a {i18n_attrs(href=(base+".en.html", base+".html"))}>{bi(en,zh)} <span aria-hidden="true">↗</span></a>'


def note(en, zh):
    return f'<p class="zr-note">{bi(en,zh)}</p>'


def distribution(data, metric):
    recovered = data['recovered_distribution']
    bins = recovered['bins'][metric['id']]
    maximum = max(row['count'] for row in bins)
    rows = []
    for row in bins:
        lo, hi, count = row['min'], row['max_exclusive'], row['count']
        label = '0' if hi == 1 else f'≥{lo:,}' if hi is None else f'{lo:,}–{hi-1:,}'
        rows.append(f'<div class="zr-bin"><dt>{label}</dt><dd><span class="zr-bin-track" aria-hidden="true"><span style="width:{count/maximum*100:.4f}%"></span></span><span class="zr-bin-value">{count:,}<small>{count/recovered["sample_size"]*100:.1f}%</small></span></dd></div>')
    return f'''<div class="zr-distribution"><div class="zr-figure-head"><h4>{bi('Where are the users?','这些用户分布在哪里？')}</h4><span class="zr-unit">{bi('26,161 records · grouped by magnitude','26,161 条记录 · 按数量区间分组')}</span></div>
    <div class="zr-bin-key"><span>{bi(metric['label']['en']+' per user','每人的'+metric['label']['zh']+'数')}</span><span>{bi('Users · share of sample','用户数 · 样本占比')}</span></div><dl>{''.join(rows)}</dl>
    {note('Recounted from the recovered 2015 archive on 1 Oct 2026. Bar length shows users per interval, on a linear scale. Intervals have different widths; this is not a probability-density plot.', '2026-10-01 从恢复的 2015 年归档重新计数。柱长线性表示各区间的用户数；区间宽度不同，这不是概率密度图。')}</div>'''


def section(id, n, en, zh, intro_en, intro_zh, body):
    return f'''<section class="zr-section" id="{id}" aria-labelledby="{id}-title">
    <header class="zr-question"><span class="zr-index">{n} / 04</span><h2 id="{id}-title">{bi(en,zh)}</h2><p>{bi(intro_en,intro_zh)}</p></header>
    <div class="zr-evidence">{body}</div></section>'''


def table(headers, rows, caption):
    return '<div class="zr-table-wrap"><table><caption>'+caption+'</caption><thead><tr>'+''.join('<th scope="col">'+h+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">'+v+'</th>') if i==0 else '<td>'+v+'</td>' for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table></div>'


def render_research(config):
    data=json.loads((ROOT/'data/zhihu-2015.json').read_text())
    metric_controls='<div class="zr-controls zr-only-js" role="group" '+i18n_attrs(aria_label=('Profile metric','用户指标'))+'>'+''.join(f'<button type="button" data-metric="{m["id"]}" aria-pressed="{str(m["id"]=="agree").lower()}">{bi(**m["label"])}</button>' for m in data['metrics'])+'</div>'
    profiles=[]
    for m in data['metrics']:
        label=bi(**m['label'])
        profiles.append(f'''<div class="zr-profile" data-profile="{m['id']}">
            <div class="zr-figure-head"><h3>{label}</h3><span class="zr-unit">{bi('Per user · 2015 sample','每名用户 · 2015 年样本')}</span></div>
            <div class="zr-stat-chart" role="img" {i18n_attrs(aria_label=(f'{m["label"]["en"]}: mean {m["mean"]}, median {m["median"]}',f'{m["label"]["zh"]}：均值 {m["mean"]}，中位数 {m["median"]}'))}>
              <div class="zr-stat-line"><span>{bi('Mean','均值')}</span><div class="zr-rail"><span class="zr-bar" style="width:100%"></span></div><strong>{m['mean']:,.1f}</strong></div>
              <div class="zr-stat-line"><span>{bi('Median','中位数')}</span><div class="zr-rail"><span class="zr-bar zr-ochre" style="width:{m['median']/m['mean']*100:.4f}%"></span></div><strong>{m['median']:,}</strong></div>
            </div>
            <p class="zr-ratio"><strong>{m['mean']/m['median']:.1f}<small>×</small></strong><span>{bi('The mean is this many times the median.','均值是中位数的这么多倍。')}</span></p>
            {distribution(data,m)}
            <details class="zr-detail"><summary>{bi('See the original distribution','查看当年的分布图')}</summary><figure class="zr-original"><img src="{m['image']}" loading="lazy" {i18n_attrs(alt=(m['label']['en']+' distribution: original log–log plot from the 2016 article',m['label']['zh']+'分布：2016 年原文的双对数散点图'))}><figcaption>{bi('Original published figure. Axes use log₁₀; points show the frequency of each count.','原文图表。横纵轴取 log₁₀；散点表示每个计数值对应的用户频数。')}</figcaption></figure></details>
        </div>''')
    stats_table=table([bi('Metric','指标'),bi('Mean','均值'),bi('Median','中位数'),bi('Std. deviation','标准差')],[[bi(**m['label']),f'{m["mean"]:,.1f}',str(m['median']),f'{m["sd"]:,.1f}'] for m in data['metrics']],bi('All five profile metrics','五项用户指标'))
    profile_body=metric_controls+''.join(profiles)+note('Bars share a zero baseline within each metric. A long tail alone does not establish a power-law distribution.','同一指标的两条柱从零起算。长尾现象本身不足以证明幂律分布。')+f'<details class="zr-detail"><summary>{bi("All values & source","完整数值与来源")}</summary>{stats_table}{link(ARTICLE1,"Read part I","阅读上篇")}</details>'
    cohort_controls='<div class="zr-controls zr-only-js" role="group" '+i18n_attrs(aria_label=('Network cohort','网络群体'))+'>'+''.join(f'<button type="button" data-cohort="{c["id"]}" aria-pressed="{str(c["id"]=="Net10k").lower()}">{bi("Upvotes > "+format(c["threshold"],","),"赞同 > "+str(c["threshold"]//10000)+" 万")}</button>' for c in data['cohorts'])+'</div>'
    cohort_cards=[]
    for c in data['cohorts']:
        cohort_cards.append(f'''<article class="zr-cohort" data-network="{c['id']}"><h3>{c['id']} <span>{bi('Upvotes > '+format(c['threshold'],','),'赞同 > '+str(c['threshold']//10000)+' 万')}</span></h3>
        <div class="zr-density"><strong>{c['density']*100:.1f}<small>%</small></strong><span>{bi('of possible directed links exist','可能的有向连接中，实际存在的比例')}</span></div>
        <div class="zr-density-track" aria-hidden="true"><span style="width:{c['density']*100:.1f}%"></span></div>
        <dl><div><dt>{bi('Users','用户')}</dt><dd>{c['nodes']:,}</dd></div><div><dt>{bi('Following links','关注连接')}</dt><dd>{c['edges']:,}</dd></div><div><dt>{bi('In the largest SCC','最大强连通分量内')}</dt><dd>{c['giant']:,} / {c['nodes']:,}</dd></div><div><dt>{bi('Mean shortest path¹','平均最短路径¹')}</dt><dd>{c['distance']:.2f}</dd></div><div><dt>{bi('Longest shortest path¹','最长的最短路径¹')}</dt><dd>{c['diameter']}</dd></div></dl></article>''')
    schematic=f'''<div class="zr-path-demo"><div class="zr-figure-head"><h3>{bi('What does “three steps away” mean?','“三步之遥”是什么意思？')}</h3><span class="zr-unit">{bi('Illustration · not sampled users','示意图 · 非真实用户')}</span></div>
    <svg viewBox="0 0 360 108" class="zr-path" role="img" {i18n_attrs(aria_label=('A follows B, B follows C, C follows D. Three directed steps from A to D.','A 关注 B，B 关注 C，C 关注 D。从 A 到 D 需要沿关注方向走三步。'))}>
    <defs><marker id="zr-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="currentColor"/></marker></defs>
    {''.join(f'<path class="zr-path-edge" data-step="{i}" d="M{x+19} 46 H{x+69}" marker-end="url(#zr-arrow)"/>' for i,x in enumerate([36,132,228],1))}
    {''.join(f'<g><circle cx="{36+i*96}" cy="46" r="19"/><text x="{36+i*96}" y="51" text-anchor="middle">{n}</text></g>' for i,n in enumerate('ABCD'))}
    </svg><div class="zr-controls zr-only-js" role="group" {i18n_attrs(aria_label=('Choose a destination from A','选择从 A 出发的终点'))}>{''.join(f'<button type="button" data-path="{p}" aria-pressed="{str(p=="D").lower()}">A → {p}</button>' for p in 'BCD')}</div>
    <p class="zr-path-result" aria-live="polite">{bi('A → B → C → D: 3 following links.','A → B → C → D：经过 3 条关注连接。')}</p></div>'''
    network_body=cohort_controls+'<div class="zr-cohorts">'+''.join(cohort_cards)+'</div>'+note('¹ Path lengths are calculated only within each network’s largest strongly connected component. Density is reported at the original precision.','¹ 路径长度仅在各网络的最大强连通分量内计算。密度沿用原文精度。')+schematic+f'<details class="zr-detail"><summary>{bi("What can this comparison tell us?","这组比较能说明什么？")}</summary><p>{bi("These are overlapping groups selected by upvotes, with different sizes. Their density difference describes this sample; it does not by itself prove a preference for forming elite circles. A strongly connected component means that directed paths exist both ways between every pair of its users.","这两个群体按赞同数筛选，彼此重叠、规模也不同。密度差异描述了这个样本，不能单凭它证明大V偏好抱团。强连通分量意味着其中任意两人之间，都有沿关注方向彼此到达的路径。")}</p>{link(ARTICLE2,"Read the network analysis","阅读关注网络分析")}</details>'
    ranking_groups=[]
    metric_labels=[('pagerank','PageRank','PageRank','Attention passed through the network','沿关注网络传递的关注权重'),('authority','Authority','权威度','Followed by high-scoring hubs','受到高分枢纽关注的节点'),('hub','Hub','枢纽度','Following high-scoring authorities','关注高分权威节点的节点')]
    people=sorted({r['name'] for group in data['rankings'].values() for rank in group.values() for r in rank})
    for cohort in data['cohorts']:
        c=cohort['id']
        lists=[]
        for key,en,zh,desc_en,desc_zh in metric_labels:
            rows=''.join(f'<li data-ranking-person="{esc(r["name"])}"><span class="zr-rank">{i}</span><span lang="zh-Hans">{esc(r["name"])}</span><span class="zr-score">{r["score"]}</span></li>' for i,r in enumerate(data['rankings'][c][key],1))
            lists.append(f'<div class="zr-rank-list"><h4>{bi(en,zh)}</h4><p>{bi(desc_en,desc_zh)}</p><ol>{rows}</ol></div>')
        ranking_groups.append(f'<div data-ranking-cohort="{c}"><h3 class="zr-subtitle">{c} · {bi("Published Top 5","原文前五名")}</h3><div class="zr-rank-grid">'+''.join(lists)+'</div></div>')
    people_select=f'<label class="zr-select zr-only-js">{bi("Compare a person","对照人物")}<select id="zr-person"><option value="" {i18n_attrs(label=("All names","全部人物"))}>All names</option>'+''.join(f'<option value="{esc(p)}">{esc(p)}</option>' for p in people)+'</select></label>'
    ranking_body=cohort_controls+people_select+''.join(ranking_groups)+f'<p id="zr-person-result" class="zr-note" aria-live="polite"></p>'+note('Scores belong to different algorithms and networks: compare positions, not score magnitudes across lists. An absent name means “not in the published Top 5”, not a zero score. Names are as published in 2016.','不同算法、不同网络的分数不在同一尺度上，应对照名次。名字未出现表示“未列入原文前五”，不代表分数为零。姓名沿用 2016 年原文。')+f'<details class="zr-detail"><summary>{bi("What does influence mean here?","这里的影响力指什么？")}</summary><p>{bi("These are measures of position in a following network. They are not direct measures of expertise or answer quality. PageRank and HITS answer related but distinct questions; PageRank is not the product of the two HITS scores.","这里衡量的是用户在关注网络中的位置，并不直接衡量专业水平或回答质量。PageRank 与 HITS 回答的是相关但不同的问题；PageRank 并不是两种 HITS 分数的乘积。")}</p>{link(ARTICLE2,"Read the original rankings","阅读原文榜单")}</details>'
    lookup={c:{r['name']:r for r in rows} for c,rows in data['topics'].items()}
    names=list(lookup['Net10k'])+[n for n in lookup['Net50k'] if n not in lookup['Net10k']]
    topic_rows=[]
    for name in names:
        r=lookup['Net10k'].get(name) or lookup['Net50k'][name]
        cells=[]
        for c in ('Net10k','Net50k'):
            count=lookup[c].get(name,{}).get('count')
            cells.append(f'<td data-topic-count="{c}"><div class="zr-topic-count"><span class="zr-topic-track" aria-hidden="true"><span class="zr-topic-bar" style="width:{(count or 0)/3792*100:.4f}%"></span></span><span>{format(count,",") if count is not None else bi("Unreported","未列出")}</span></div></td>')
        topic_rows.append(f'<tr data-topic-name="{esc(name)}"><th scope="row">{bi(r["en"],name)}</th>'+''.join(cells)+'</tr>')
    topic_body=f'''<div class="zr-topic-head"><h3>{bi('Life, history, film — and different emphases','生活、历史、电影，以及不同的侧重')}</h3><label class="zr-select zr-only-js">{bi('Order by','排序依据')}<select id="zr-topic-sort"><option value="Net10k">Net10k</option><option value="Net50k">Net50k</option></select></label></div>
    {note('Counts of question tags in answers by a selected dominating set. The two samples have different sizes. Unreported is not zero.','统计各网络支配集用户所答问题的话题标签次数。两组样本规模不同。“未列出”不等于零。')}
    <div class="zr-table-wrap"><table class="zr-topics"><caption>{bi('Topic frequencies · all published entries','话题频次 · 全部已发表条目')}</caption><thead><tr><th scope="col">{bi('Topic','话题')}</th><th scope="col">Net10k <span class="zr-dot"></span></th><th scope="col">Net50k <span class="zr-dot zr-ochre"></span></th></tr></thead><tbody>{''.join(topic_rows)}</tbody></table></div>
    {note('The article labels both lists “Top 20”, but prints 30 entries for Net10k and 20 for Net50k. All are retained here. These are raw tag counts, not percentages of users or a platform-wide topic survey.','原文两组标题都写“Top 20”，但实际列出 Net10k 30 项、Net50k 20 项，这里全部保留。这些是标签次数，并非用户占比或全站话题调查。')}'''
    nav=''.join(f'<a href="#{id}"><span>0{i}</span>{bi(en,zh)}<span aria-hidden="true">↗</span></a>' for i,(id,en,zh) in enumerate([('people','People','用户差异'),('network','Connections','关注网络'),('influence','Influence','影响力'),('topics','Topics','话题')],1))
    main=f'''<main id="main" class="zr-main" tabindex="-1">
      <header class="zr-hero"><div><a class="zr-back" href="../../gallery.html#research">← {bi('Work / Research','作品 / 研究')}</a><p class="zr-eyebrow">ZHIHU · OCT 2015</p><h1>{bi('People, connections<br>and influence.','人、关注<br>与影响力。',raw=True)}</h1><p class="zr-lede">{bi('Who gets heard? How close are the people at the top? An exploration of a 2015 Zhihu sample, through four questions.','谁被看见？大V之间有多近？从四个问题，探索 2015 年知乎的一份样本。')}</p><p class="zr-edition">{bi('2015 study · 2016 essays · 2026 interactive edition','2015 年研究 · 2016 年文章 · 2026 年交互呈现')}</p></div>
      <aside class="zr-hero-stat"><span class="zr-eyebrow">{bi('A place to start','从这个差距开始')}</span><strong>40.2<small>×</small></strong><p>{bi('Mean upvotes / median upvotes','赞同数均值 / 中位数')}</p><div class="zr-hero-pair"><span>3,858.4<small>{bi('Mean','均值')}</small></span><span>96<small>{bi('Median','中位数')}</small></span></div><p class="zr-note">{bi('The “average user” looks very different from the person in the middle.','“平均用户”和排在中间的那个人，看起来很不一样。')}</p></aside></header>
      <div class="zr-context"><span><strong>≈26,000</strong> {bi('user profiles','名用户')}</span><span><strong>≈4.61M</strong> {bi('outgoing follow links','条向外关注连接')}</span><span>{bi('One seed · two following steps · a historical snapshot','单一种子 · 沿关注关系两层扩展 · 历史快照')}</span></div>
      <nav class="zr-jump" {i18n_attrs(aria_label=('Explore four questions','探索四个问题'))}>{nav}</nav>
      {section('people','01','Do we use the same Zhihu?','我们玩的是同一个知乎吗？','A few very large counts pull the mean away from the middle. Select a metric to see the gap.','少数极大的数值，把均值拉离了中间位置。选一个指标，看看这个差距。',profile_body)}
      {section('network','02','How close are the big names?','大V之间有多近？','Compare two overlapping groups selected by total upvotes. A link points from a follower to the person they follow.','对照按总赞同数筛选的两个重叠群体。每条箭头，从关注者指向被关注的人。',network_body)}
      {section('influence','03','What makes someone influential?','谁算有影响力？','The answer changes with the question. Compare the published leaders under three network measures.','衡量方式改变，答案也会改变。对照三种网络指标下，原文发表的前五名。',ranking_body)}
      {section('topics','04','What do they answer?','这些人回答什么问题？','Two lists, one shared scale. Explore the overlap and the differences in the questions these selected users answered.','两份列表，共用一个刻度。看看这些选定用户所答问题的话题，有哪些交集与不同。',topic_body)}
      <section class="zr-method" id="method"><span class="zr-index">{bi('READING THIS STUDY TODAY','今天回看这项研究')}</span><h2>{bi('A sample, with a point of view.','一份有视角的样本。')}</h2><div class="zr-method-grid"><div><h3>{bi('Where it begins','样本从哪里来')}</h3><p>{bi('The crawl began with Zhao Che’s account and followed outgoing links for two steps. The seed and both layers total three levels. This was not a random sample of Zhihu, and external follow targets are not all complete user profiles.','爬取从 Zhao Che 的账号出发，沿关注关系扩展两层，连同种子共三层。这不是知乎的随机样本；向外关注连接的终点，也并非都有完整用户资料。')}</p></div><div><h3>{bi('What is presented here','这里呈现的是什么')}</h3><p>{bi('The tables and rankings reproduce the original published results. Profile distributions were recounted from the recovered archive in 2026, and all five means and medians were checked against the original. Later exploratory experiments are not presented as confirmed findings.','统计表和榜单沿用原研究已发表的结果。用户分布于 2026 年从恢复的归档重新计数，五项均值、中位数也与原文核对一致。后来的探索性实验没有被当作已确认结论。')}</p></div><div><h3>{bi('What remains a question','哪些仍然是问题')}</h3><p>{bi('Long tails need distribution tests; denser groups need comparison baselines; low betweenness alone does not establish resilience to removing users. The sample does not describe today’s Zhihu.','长尾需要分布检验；密集群体需要比较基线；低介性本身不能证明删除用户后的网络韧性。这份样本也不能描述今天的知乎。')}</p></div></div></section>
      <section class="zr-sources" id="sources"><h2>{bi('The study behind the page','研究与原文')}</h2><p>{bi('A 2015 Social Computing course project at CUHK by Gu Zhijing, Huang Xianghai, Lyu Zishen and Zhao Che. Zhao Che worked on the database, basic statistics, network analysis, proposal, presentation and report.','2015 年香港中文大学 Social Computing 课程小组项目，由 Gu Zhijing、Huang Xianghai、Lyu Zishen 和 Zhao Che 共同完成。Zhao Che 参与数据库、基本统计、网络分析、提案、演示及报告。')}</p><div class="zr-source-links">{link(ARTICLE1,'Part I · Basic statistics','上篇 · 基本统计')}{link(ARTICLE2,'Part II · Following network','下篇 · 关注网络')}<a href="https://github.com/simoncos/zhihu-analysis-python/blob/master/analysis-report/Social%20Network%20Analysis%20of%20Zhihu.pdf">{bi('Original group report','原始小组报告')} ↗</a><a href="https://github.com/simoncos/zhihu-analysis-python">{bi('Code & research archive','代码与研究记录')} ↗</a><a href="../../data/zhihu-2015.json" download>{bi('Published chart values · JSON','图表所用已发表数值 · JSON')} ↓</a></div></section>
    </main>'''
    head=render_meta(config,title=('Zhihu 2015 · People, connections and influence · simoncos','知乎 2015 · 人、关注与影响力 · simoncos'),description=('Explore the user statistics, follow networks, influence rankings and topics of a 2015 Zhihu study.','从用户差异、关注网络、影响力和话题四个问题，探索 2015 年知乎社交网络研究。'),canonical=PAGE)
    # The shared stylesheet is emitted after head; these rules use page-specific classes.
    head+='\n<link rel="stylesheet" href="assets/zhihu-2015.css?v=20261001a">'
    payload=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    return render_document(config,page_config(config,PAGE),head=head,main=main,body_attrs=' class="zhihu-research"',tail=f'<script type="application/json" id="zr-data">{payload}</script>')
