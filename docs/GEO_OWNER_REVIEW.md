# GEO 候选与作者决策

2026-10-05 完成候选；2026-10-08 基于 master `87216024` 提交，排在工程拆分与《回响》那一个提交之后，GEO 单独成一个提交。

2026-11-13 重放说明：独有源文件已接到 origin/master `5e80c84f`。现网 About 文案和后来已发布的 HN 研究简介保持不变；睡眠描述改用“记录”口径供审阅；Sleep Toolkit 不可用说明已按当天复查更新。中文栏目页、两篇伴读，以及 D1 里那两段可选 About 新导语，仍待作者决定。D2–D5 其余项仍开放。

## 先审候选

已确认署名方案继续有效：普通文章 Che Zhao，两篇 RedPiggy AI 自述，以及 PKM 的 AI 协作署名。无需重复确认。

新伴读可直接打开：

- [个人 AI 信息系统](../topics/personal-ai-system.html) / [English](../topics/personal-ai-system.en.html)：四份公开材料的版本关系、分工表、`/j` 捕捉实例，以及文件记忆与自述的证据边界。原文的命令是 `/j`，提案中的 `!j` 没有作为事实采用。
- [长期睡眠数据](../topics/long-term-sleep-data.html) / [English](../topics/long-term-sleep-data.en.html)：读者问题、关键结果、指标变化、工具输入输出与解释限制。
- [中文睡眠证据](../gallery/research/sleep-2016-2026.html#evidence-details) / [English](../gallery/research/sleep-2016-2026.en.html#evidence-details)：标签 n 与首末记录日期、BD 各年 n、指标字典、记录/日期区别、公开数据指纹。
- 四个重点栏目已采用独立语言文档，中文为 `.zh.html`，原英文地址与文章地址保留。Work 已链接伴读；两篇伴读共四个语言版本进入 sitemap 和机器导览。

上述新文字是有公开来源的编辑候选，仍由作者审阅措辞。原 138 篇文章正文及写作日期没有改写。

## D1 — 发布范围与介绍文字

建议本批范围为核心修复、署名、独立语言页、两个伴读和证据补充。若做 D4 的三轮对照，先完成当前线上版本的 baseline，再发布；如果作者选择立即发布并放弃发布前基线，后续只能记录新版本表现，不能补造旧版本对照。发布前按文件及内容拆出准确候选，保留其他会话改动；完成远端快进和部署门禁后再报告线上结果。发布批准依据 [site-surface-editing](../.agents/skills/site-surface-editing/SKILL.md)：**“Push only with the owner's approval for that change.”** 目前没有发布批准。

About 保持原文。可以选择保留短简介，或采用下面的新增段落（链接到两篇伴读）：

> 我在香港做 AI 与数据方向的全栈开发，关注工具如何进入真实的个人工作流。这里记录我的个人信息系统、长期数据研究与互动作品，也保留旅行、音乐和阅读。

> I’m a full-stack developer in AI and data, based in Hong Kong. I’m interested in how tools become part of real personal workflows. This site brings together my personal information system, long-term data studies and interactive work, alongside travel, music and reading.

建议保留现有 `connecting the dots.` 与兴趣内容。姓名主档继续 Che Zhao / 趙澈 / simoncos；演讲使用过 Simon Zhao，但是否把 Simon Zhao、Zhao Che、简体赵澈加入跨页面别名，需作者确认。演讲当时的单位/职务不自动改成现职。

## D2 — 睡眠记录口径与服务恢复

公开散点有 3,656 条记录、2,963 个不同日期值。当前源码以记录开始日期归属；同日记录和跨午夜归属的含义不能仅从公开聚合文件判定。现候选保留按记录加权的统计，把重点摘要中的“独立夜晚”式表述改为“记录”。这不是重新清洗的研究结果。

建议本批接受透明记录口径；若要改成每夜一个观察，需作者选择夜晚归属与多记录取舍，例如“中午到次日中午为一夜，保留主要长睡眠”，然后在拥有仓库重跑私人原始数据、更新全部相关图表与模型。不能直接按日期去重，否则可能误删跨午夜记录。原 CSV、健康记录与私人配置未复制到站点。

现有数据不能补出月度 BD n、某些运动/气象分组的 BD n、原始报告处理提交，故候选明确列出缺口。若要补齐，属于追加原始分析，而非把质量分 n 代填为 BD n。

Sleep Toolkit 服务在两次普通 GET 中返回 Railway 404 `Application not found`（第二次带新查询参数）。本地说明页标出核查日期并移除上传入口按钮，仍保留项目、报告和本地流程。作者可决定恢复/重新部署服务，或维持文档与本地工具；需要服务目标、可用部署项目及发布选择。本轮没有上传任何数据，也没有测试远端删除承诺。

## D3 — 平台与抓取选择

只读 Pages API 显示 `https_enforced=false`；HTTP/HTTPS 首页均返回 200，正文一致，HTTPS canonical 正确。建议开启强制 HTTPS。候选未改变账号设置，也不将这一项描述为全站安全故障。依据 [GitHub HTTPS 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)，确认后在该仓库 Pages 设置启用。

搜索与用户读取继续允许；训练抓取需选：维持现状，或单独拒绝 GPTBot / ClaudeBot。Google-Extended 同时涉及 Gemini 训练与部分 grounding，不能把它描述为纯训练开关。针对已核对官方规则的具体候选在 [GEO_PLATFORM_OPTIONS.md](GEO_PLATFORM_OPTIONS.md)，不会在选择前改 robots。

需要作者确认可用的 Search Console、Bing Webmaster、Cloudflare 后台/导出，才能取得真实收录、引用与访问证据。Search Console 应使用本站 URL-prefix 属性；无须拥有 github.io 父域 DNS。若已验证，复用现有属性，不因未见 meta 就重新创建。

## D4 — 三产品与观测投入

建议选 ChatGPT 搜索、Perplexity 搜索、Gemini 联网回答；以作者实际能稳定访问的模式为准。确认后冻结现有 24 题和产品条件，再收集发布前基线，以及上线后约 14/28 天两轮。总计 216 份完整答案。

[协议](geo_measurement/PROTOCOL.md)、[记录模板](geo_measurement/record-template.json)与统计工具已准备。没有测过消费端答案，不报告当前引用率或提升。未创建定时任务。

## D5 — 可选扩展

建议首批保持两簇，HN 方法页作为追加选择。HN Field Notes 的当前源码说明公共只读版，但线上初始 HTML 仍有 Saved/个人笔记控件，不能把本地 README 当成该远端版本的发布证明；普通 GET 200 不证明数据加载完整。HN × LLM 公开别名为审阅用途，HTTP 保持 no-store/noindex，当前拥有仓库明确区分 fixture-only 默认构建与受限 minimized audit，语义关联仍为候选。选择新增方法页后，仅概述方法/覆盖与边界，不公开未获许可的数据或把候选当结论。

可审方法页文案：

> HN Field Notes 从每月 “What are you working on?” 讨论中筛选项目候选，支持原帖证据和讨论构成的比较。留存样本的占比不能代表 HN 整体、真实市场需求或项目成功。
>
> HN × LLM 围绕模型发布事件收集候选讨论，并区分发现窗口、首发分析窗口和人工语义审核。当前公开界面用于审阅，不能据候选矩阵推出模型排名、采用率或投资结论。

知乎现有英文方法说明、四位作者职责、2015 采样 / 2016 原文 / 2026 再呈现以及引用来源已存在，本批复核并保留，没有重复创建第三主题。

IndexNow 可在作者选择后上线根目录验证 key 文件，并提交本批实际规范 URL；200/202 只表示接收/待验证，不等于已收录或已被 AI 引用。RSS 已有，不需要为形式完整新增订阅系统。外部分发只在作者选择平台与具体稿件后执行；本批没有发帖、联系他人或账号写入。

## 提案逐项收口

| 提案要求 | 本地交付 / 下一步依赖 |
| --- | --- |
| 四条旧睡眠路径 | 生成、验证完成；上线须 D1 |
| 扩大历史路径审查 | Git 删除历史已核对，另补旧演讲、早期睡眠目录和 HN Field Notes 的外域迁移；更早的空白 Hello World、归档导航等没有确定一对一内容，保留为历史退役，不猜测文章对应 |
| 重点睡眠数值与因果/临床边界 | 双语修订、静态结果、指标字典、样本/版本指纹完成；重定义夜晚与补缺数据须 D2 |
| 作者、贡献者和日期 | 已确认方案已实施；可见署名、结构数据、sitemap/发现文件一致；额外历史别名须 D1 |
| 作品状态与适当实体 | 20 项 Work 索引区分 public_entry/public_review/in_progress；集合只列九个有入口的作品，不把 11 个在建项目声明为已可用软件；睡眠使用 CreativeWork，不虚填评分/临床类型 |
| 四个独立语言栏目 | 四对文档、正确初始语言/head、互返 alternate、旧参数兼容已实施；Favorites 与中文演讲未虚构全文译本 |
| 个人系统分工、版本和最小实例 | 两语伴读已写完；历史原文不改写；新措辞须 D1 审阅 |
| 1–2 个实质主题入口 | 两个主题、四个文档、Work 链入、发现文件完成；须 D1 发布 |
| 首页到睡眠正文路径 | 精选 Open 直接同语言规范报告；About/首页身份新导语须 D1 内容选择 |
| 知乎出处与职责 | 既有来源、英文说明、历史时间和四作者职责已复核保留 |
| HN 两应用/第三主题 | 拥有源码及初始远端状态核对完成；方法稿和追加范围须 D5 |
| HTTPS / 外域应用 | HTTP 与 Pages 配置证据保存；HTTPS 设置须 D3，Sleep Toolkit 服务须 D2 |
| robots 搜索/训练分离 | 官方规则与准确候选已备；偏好须 D3，不默认代表许可 |
| 后台、收录与富结果验收 | 发布前候选可本地验证；后台条件 D3 + 发布 D1 后才能验收线上 |
| 24 题 / 三轮 / 分母 | 候选题库、协议、完整记录格式与分层统计工具完成；产品与实际运行须 D4 |
| IndexNow / 分发 / 订阅 | 可执行方案与边界已备；是否追加须 D5，现有 RSS 保留 |

本地生成、检查、浏览器证据另见 [GEO_IMPLEMENTATION.md](GEO_IMPLEMENTATION.md) 与私有笔记仓库的最新 QA `qa/2026-10-05-geo-completion.md`：128 项 Python 测试、6 项 JavaScript 测试和本批 94 个浏览器场景通过。以上“完成”指交付本身，不代表已被索引或引用增长。
