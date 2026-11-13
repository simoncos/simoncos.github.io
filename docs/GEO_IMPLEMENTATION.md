# GEO 实施记录与后续顺序

2026-10-04—2026-10-05 · Asia/Hong_Kong

可独立执行的工作已完成并于 2026-10-08 提交。当前交付与剩余作者决定见 [GEO_OWNER_REVIEW.md](GEO_OWNER_REVIEW.md)；最新完整检查见私有笔记仓库 `qa/2026-10-05-geo-completion.md`。下文 P0/P1 保留各批次的历史证据。

2026-11-13 把该候选的独有源文件重放到当时的 origin/master（`5e80c84f`），供作者审排版和文案。历史入口已并入后来的 [data/redirects.json](../data/redirects.json) 与 [scripts/page_redirects.py](../scripts/page_redirects.py)；旧的 PKM 演讲地址改指向当前的 `gallery/sharing/pkm-2026-06-07/`。Sleep Toolkit 公开入口在 2026-11-13 仍返回 404，说明日期已更新。About 现网文案保留；睡眠“记录 / 夜晚”口径和中文栏目页、伴读仍待作者审。

原始提案在 Obsidian 的 `RedPiggy/Research/simoncos-geo-proposal-2026-10-04.html`；同名 Markdown 是归档入口。2026-10-04 已将 Obsidian 从 `14d882bc` 快进同步到 `8fa8f719`，取得两份文件。

提案审计的公开源码基线是 `0308b20d`；本轮开始时网站为 `codex/reading-and-music-riddle` / `dbd17c0b`。提案中的 157 页、69 组文章和检索结果是当时快照，不能当成长期不变的指标。工作区原有语言切换修改及 Echoes QA 记录另属现有工作。

## 本轮：P0 的可确认修复

### 历史入口

四条 `projects/` 旧入口、旧 PKM 演讲地址，以及 HN Field Notes 的外域迁移，已写入 [data/redirects.json](../data/redirects.json)，由 [scripts/page_redirects.py](../scripts/page_redirects.py) 生成兼容页。PKM `gallery/talks/pkm-2026-05-22/` 现在指向当前规范地址 `gallery/sharing/pkm-2026-06-07/`。

| 旧入口 | 同语言目标 |
| --- | --- |
| `projects/sleep-2016-2026.en.html` | `gallery/research/sleep-2016-2026.en.html` |
| `projects/sleep-2016-2026.html` | `gallery/research/sleep-2016-2026.html` |
| `projects/sleep-toolkit.en.html` | `apps/sleep-toolkit.en.html` |
| `projects/sleep-toolkit.html` | `apps/sleep-toolkit.html` |

每页包含立即 meta refresh、自指新文档的 canonical 和可见直达链接；脚本增强保留查询参数和阅读锚点。静态托管返回兼容 HTML，不能把它报告为 HTTP 301/308。sitemap 继续只收录目标规范地址。

`make generate` 生成迁移页，`make check-all` 检查它们。校验拒绝跨语言映射、缺失目标、跳转链、循环、非自指 canonical 及目标 HTML 语言不符。以后移动公开页面，先补映射，再发布；不要只依赖通用 404。

实现参考：[Google 的重定向说明](https://developers.google.com/search/docs/crawling-indexing/301-redirects)。Google 将立即 meta refresh 作为迁移信号处理；这仍不改变服务器实际返回的状态码。

### 睡眠研究的双语修订

两份报告是手工维护的研究文档。修订同步应用于中文和英文，保留图表、原数据、章节锚点与研究体裁。

| 项目 | 复核依据与修订 |
| --- | --- |
| 最高年均分 | 已公开 `DATA.yearly_summary`：2020 年 94.4%，n=362；2019 年 88.3%，n=364。去掉“2019 年十年最高”。2021 年 87.9% 也不能称第二高。 |
| 全体均值 | 已公开 `DATA.scatter` 的 3,656 条有效记录：平均质量 83.296772…%，时长 7.040585… 小时。首屏按一位小数统一为 83.3% 与 7.0h。 |
| 83.7% 的分母 | 无旅行标签的 3,521 条记录均值为 83.679920…%；全体均值包含另 135 条旅行标签记录。明确区分，未把子样本数字统一改成全体基线。 |
| 咖啡因差值 | 已公开精选标签汇总为 −9.6 个百分点；原文 −9.7% 与该图表口径不一致。 |
| COVID 时间线 | “2021 年在 COVID 开始前一年”改为“在本人 2022 年 12 月首次感染前一年”。 |
| BD 的窗口与边界 | 已公开年度数据：2026 年 1–3 月 BD 6.88 次/小时，n=78；3 月为 8.18。明确窗口，并去掉将消费级 BD 套入临床 AHI 正常阈值及据此判断康复的表述。 |
| 行为与运动 | 按摩、旅行、咖啡因、运动等重点段落使用观察性关联措辞；低步数锻炼代理组不等于独立游泳分组。BD 的分组有效夜数未单列，不假定它等于代理组的 130 条质量分记录。 |

两页新增 `#score-summary` 静态表，展示全体、2019/2020/2021 年和非旅行子样本的均值与记录数。表格无需执行图表脚本即可阅读；回归检查把两种语言的数值与已有公开图表记录核对。这里只重算现有公开字段，没有读取或新增公开私人 CSV。

睡眠页的内容复核日期与两条 sitemap `lastmod` 更新为 2026-10-04。研究数据截止仍为 2026-03-18。专用样式单独更新缓存键，未改全站日期。

P0 当时没有完成全部健康、统计和机制解释审查，也没有重跑原始 CSV。10-05 第三批补充了公开分母、字典、测量变化和处理来源边界；完整私人原始分析和医疗机制审查仍属于 D2 的追加研究选择，不是本批已验收的结论。

## 第二批：作者、结构化数据与日期一致性

作者已确认以下可见署名方案：普通文章 Che Zhao；《从深渊中浮现》和《跨过三个深渊》为 RedPiggy 的 AI 自述；《我的个人知识管理系统 2026-03》为 Che Zhao，并注明与 RedPiggy 协作。没有推定两篇自述的人类编辑，也没有新增历史别名。

人类姓名、原文姓名与联系链接复用 About 的公开源。`data/site.json` 的 `about.identity` 承载 Che Zhao / simoncos；`native_name` 和现有联系链接继续属于 About。`data/article_credits.json` 保存署名例外，`scripts/site_entities.py` 同时生成可见署名与结构化数据。

- Index 新增 `WebSite`；About 新增 `ProfilePage` 与 `Person`，指向稳定的 `about.html#person`。
- 138 个文章语言版本新增 `BlogPosting`、规范 URL、标题、语言、署名和机器可读日期。普通文章的人类作者链接到同一份 About；两篇 AI 自述使用可见 AI 署名及 `creditText`，不把 RedPiggy 标成人或组织。既有翻译署名也保留在可见元信息与 `creditText` 中。
- 因这批页面实际新增署名及结构化数据，文章源 `updated` 记录本次站点修订日 2026-10-04。138 份正文及 `date` 的逐字节比较均未变，RSS GUID、`pubDate` 和历史排序保持原值。日期处理遵循 [既有文章规范](ARTICLE_PUBLICATION.md#dates)。
- 现有日期行改用 `<time datetime>`，JSON-LD 的 `dateCreated` / `dateModified` 与它们对应。尚无首发证据，因此没有从 `date` 推定 `datePublished`；没有新增时分秒或额外日期字段。
- 修订前有 19 个文章 sitemap 日期与源日期不一致，包含 8 个已重新收录但源中缺 `updated` 的版本。现在文章 `lastmod` 从源修订日经文章索引生成；`scripts/sync_discovery.py` 同步 sitemap、agent index 身份信息与 llms 署名区块，并纳入生成和漂移检查。其他研究/项目的日期不随本轮自动变动。

标记只描述现有公开页面，不添加职业资质、虚构项目能力或未核实的贡献者。About 的正文、座右铭与联系链接保持原文。

实现参照：[Google Article](https://developers.google.com/search/docs/appearance/structured-data/article)、[ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)、[可见内容要求](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)、[sitemap 修订日期](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)，以及 Schema.org 的 [dateCreated](https://schema.org/dateCreated) 与 [creditText](https://schema.org/creditText)。本地结构、语义一致性和浏览器检查不能证明 Google 富结果资格、收录或 AI 引用效果；尚未运行 Google 的 Rich Results Test / URL Inspection。

第二批验证记录在私有笔记仓库 `qa/2026-10-04-geo-entities.md`。

## 第三批：独立语言、主题伴读与证据补充

| 顺序 | 工作 | 完成条件与待确认项 |
| --- | --- | --- |
| 1 | 作者与贡献者主档 | 已完成当前公开身份与三篇署名例外，作者确认。历史别名和其他作品的协作者仍需逐项有来源，不推定未声明的职责。 |
| 2 | 可见署名与结构化数据 | 已完成 Index、About 与全部文章。其他作品实体须按实际页面分别核实，不自动为在建应用加类型、评分或产品能力。 |
| 3 | 日期与发现文件一致性 | 已完成文章日期、sitemap、可见署名、JSON-LD 与发现文件的生成一致性；其他非文章页面的修订日期仍手工维护。 |
| 4 | 重点栏目独立语言输出 | 已完成四对文档，保留英文旧地址，中文为 `.zh.html`。lang、title、description、canonical、互返 hreflang 一起生成，保留 `?lang=zh`、查询/锚点与语言偏好兼容。Favorites 和中文演讲未虚构全文译本。 |
| 5 | 睡眠证据整理 | 已完成标签表、指标字典、BD 年度 n、来源限制与公开 payload 指纹。3,656 条记录对应 2,963 个日期值，保留记录加权结果；缺失 BD n、原始处理提交和重新定义夜晚需要追加原始分析。 |
| 6 | 个人 AI 信息系统伴读入口 | 已完成个人 AI 信息系统与长期睡眠数据两语伴读，以版本、分工、原文 `/j` 实例和观察边界增加阅读价值，接入首页、Work 与发现文件。新措辞与 About 介绍候选交作者审阅。 |
| 7 | 可选 HN 扩展 | 已核对拥有仓库与线上初始 HTML，准备方法稿。HN × LLM 属公开审阅候选，保留 noindex/no-store；是否追加第三主题由作者选择。 |

新增 `scripts/site_languages.py` 在双语生成之后输出单语言文档，`scripts/build_topic_readers.py` 从 `data/topic_readers.json` 生成四个伴读文档。栏目导航、文章导航、Work 相关链接和首页精选睡眠入口均到达对应语言的真实文件。Work 的 CollectionPage 只列有公开入口的九项作品；机器索引的 20 项作品区分公开入口、公开审阅与 11 项在建状态，不虚填 SoftwareApplication 能力。

`scripts/build_sleep_evidence.py` 仅从既有公开图表数据生成静态证据和 `sleep-evidence.json`，没有读取私人 CSV。标签列明 n、首末记录日期、重叠及比较组；BD 与其他指标各自解释分母。指纹标识公开 payload，不能证明原始分析使用的提交。手机上的数字表局部滚动，其余定义正常换行；不提高既有性能预算。

删除路径历史审查另确认早期睡眠目录、旧演讲目录和 HN Field Notes 到外域应用的迁移，现在共七条兼容入口。更早的空白 Hello World、归档导航和无法确认一对一关系的内容不猜测重定向。外域映射只允许这一条经过核对的固定目标。

只读 HTTP 及 Pages API 复核显示未启用强制 HTTPS、HN Field Notes 初始文档可达、HN × LLM 保留审阅响应头、Sleep Toolkit 返回 Railway 404。工具说明已标明 2026-10-05 核查结果并移除不可用上传入口；恢复服务需要作者选择。官方抓取规则、训练偏好选项、后台/IndexNow 条件与具体候选见 [GEO_PLATFORM_OPTIONS.md](GEO_PLATFORM_OPTIONS.md)。没有操作账号设置。

既有文章规范见 [ARTICLE_PUBLICATION.md](ARTICLE_PUBLICATION.md#dates)：`date` 是写作完成日，`updated` 是站点修订日；历史文章的事实性改写仍逐项交作者审阅。GEO 提案不是对所有历史文章改写的批准。

现有 `llms.txt`、`agent-index.json`、robots 和 RSS 已存在。后续按实际内容变化同步它们，不另建难以保持一致的全量“AI 版”站点，也不批量制造薄内容标签页。

## 引用观测：目前未测

[geo-questions-2026-10-04.json](geo-questions-2026-10-04.json) 保留提案的 24 道题，状态为候选题库，尚未执行。开始测量前确认三个实际可访问的回答产品、固定搜索模式、地区、语言和个性化条件，再冻结题目。

每份答案记录完整问题、完整回答、引用 URL、被支持的断言、正确性及异常。品牌导航、主题实质引用、外域作品引用分别统计。正常但未引用的答案计入分母；超时和服务错误另列。16 道主题题是 8 个意图的双语配对，不是 16 个独立主题。

提案建议改动前、上线后约 14 天及约 28 天三轮，总计 216 份回答。P0 已有本地修订，但尚未发布；发布前仍可对当前线上版本记录基线。未完成这项测量前，不能报告引用率、增长百分比或因果收益。

测量的 [协议](geo_measurement/PROTOCOL.md)、[记录模板](geo_measurement/record-template.json)和 `scripts/summarize_geo_measurement.py` 已完成。统计工具检查完整答案、题目原文、产品上下文、重复记录与人工引用判断，按产品/轮次/语言/题型区分导航、本站实质引用和外域作品；零分母返回 null。它没有自动制造答案或判断事实。

Search Console、Bing 与 Cloudflare 的后台可用性、搜索与训练抓取偏好仍待作者提供选择或访问条件。平台规则已按官方资料复核，候选选项与限制写入平台文档；未据归档快照修改账号设置。本轮未建立定时任务，也未执行外部分发。

## 发布前与发布后

本地门禁：`make check-all`、`git diff --check`，并检查迁移的脚本/无脚本行为、正文同语言对应和数值表的手机/桌面渲染。10-05 最终完整检查通过：128 项 Python 测试、6 项 JavaScript 测试，以及两种语言各 36 组初始 / 22 组筛选图表的原结果对照。当前批次 94 个浏览器场景通过，详见最新 QA；均为本地证据。

P0 当时完整检查通过，共 100 项单元测试；最后的文案与锚点样式补改后，相关数值回归和站点检查再次通过。Chrome 验证四条入口在开启与关闭脚本时共 8 个跳转场景，目标语言、标题和 canonical 均正确；开启脚本时查询参数与锚点保留。中文 390×844、英文 1440×1000 和中文无脚本视图均有完整静态表且无横向溢出。修正了 `#score-summary` 被固定导航遮住标题的问题。

浏览器环境未提供 Browser 插件，使用现成 Playwright 与本机 Chrome。原有 `static.cloudflareinsights.com/beacon.min.js` 在此环境报域名解析失败，统计链路未验证；未发现本次页面脚本异常。线上只读复核确认四条旧地址仍为 404，尚不能报告线上恢复。其他原有未提交文件中有 170 个逐字节未变；两份睡眠 HTML 保留原有共享脚本缓存键修改，并叠加本轮研究修订。

发布需要作者批准本次候选，按 [site-surface-editing](../.agents/skills/site-surface-editing/SKILL.md) 的流程进行。未提交和推送的修改不会恢复线上旧入口。发布后验证 Pages 的检查与部署结果，再逐条记录旧 URL 的实际响应、跳转后的目标与 canonical；本地通过不能代替部署验证或搜索引用效果。
