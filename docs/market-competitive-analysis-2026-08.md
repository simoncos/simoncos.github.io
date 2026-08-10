# simoncos.github.io 市场与竞争分析

> 研究日期：2026-08-10
>
> 仓库基线：master / origin/master / HEAD = ce5bb14d5dc2544b193f9e1d9eaaa98717c35cdd
>
> 范围：公开定位、功能、信息架构、内容、公开站点状态与外部市场；不使用未公开草稿、私人联系方式、原始访问日志或敏感路径
>
> 阶段：第一阶段，只做研究与裁决，不实施后续改站、迁移、商业化或“不利因素应对提案”

## 执行摘要

核心裁决：simoncos.github.io 目前应被定义为“个人公开基础设施”——一个双语、可引用、可长期保存的作品与思考索引；它不是已经验证的对外产品，更不是 SaaS。最合适的策略不是迁移到另一个建站器，也不是同时经营更多平台，而是保留静态站作为 canonical hub，把外部平台限定为可停止的分发实验。

这个裁决基于五项事实：

1. 当前公开面很小但结构明确：1 个标为持续维护的项目、4 组中英双语文章、5 个 Gallery 条目，一级导航是 Essays、Gallery、Projects、About。它更像精选索引，而不是需要 CMS 扩容的内容媒体。
2. 发布基础已经足够：本轮对 Home、Gallery、Projects、Essays、About、llms.txt、agent-index.json 共 7 个核心文件做了线上与本地 SHA-256 对比，7/7 完全一致；站点也有 sitemap、双语 RSS、canonical、hreflang、静态 fallback 与聚合分析脚本。这证明“能发布、当前可访问”，不证明“有人阅读、产生机会或愿意付费”。
3. 当前最强反证不是技术能力，而是可信度：Projects 将 Sleep Toolkit 标为“持续维护、对外可用”，但 2026-08-10 本轮独立复核其公开入口 GET 与 HEAD 均返回 404。Gallery 的 Hermes 分析卡片也指向演讲页，而机器可读索引指向独立研究页；llms.txt 与 agent-index.json 仍指向当前 Gallery 中不存在的 Personal Data Lab 锚点。
4. 大中华区与欧美的分发环境不同，但都不支持“迁站即增长”。大中华区的平台内发现、内容格式与账号生态更强，且中国大陆跨境网络存在不确定性；欧美的开放 Web、Google、LinkedIn、Newsletter 与静态托管更成熟。两边都需要内容与分发证据，建站器本身不能制造需求。
5. 商业化证据目前为零：本轮没有取得 Search Console、聚合访问、回访、联系归因、用户访谈、订阅或付款数据。因此不能估算 TAM/SAM/SOM，也不能把 GitHub Pages 通过、HTTP 200、CI 或平台用户规模解释为需求。

建议把未来 90 天当作“是否值得继续投入增长功能”的最小证据期，而不是一次重设计：先确保所有一级 CTA 可用，建立隐私克制的聚合基线；围绕两个清楚的受众任务发布 3 件高信号内容；最多顺序测试一个大中华区渠道和一个欧美渠道；以可归因访问、有效回应、合格机会、回访与维护工时做决策。达不到预先写明的停止条件时，站点应回到低维护的个人档案，而不是继续加功能。

## 1. 研究方法、基线与证据等级

### 1.1 Git 与仓库基线

- 仓库根：当前隔离 worktree 的项目根。
- 当前状态：detached HEAD；原因是 master 正在另一个 worktree 中被检出。
- 只读 fetch：已执行 origin master 的只读更新，不合并、不 rebase、不切换到 main。
- fetch 后：HEAD、master、origin/master、FETCH_HEAD 均为 ce5bb14d5dc2544b193f9e1d9eaaa98717c35cdd；HEAD...origin/master 为 0/0。
- 工作树：研究开始时干净。
- 远端：origin 指向公开 GitHub 仓库，origin/HEAD 指向 master。
- 最近三次提交：ce5bb14（2026-08-09）、e5b02dd（2026-07-28）、e61282c（2026-07-27）。
- 默认分支：master，不是 main。
- 仓库没有 README.md；因此本轮完整阅读了现有架构、现代化计划、产品设计审查、设计 QA、构建/部署配置、内容数据与关键页面。
- 当前 GitHub Actions 配置会在 push/pull_request 上安装 Python/Node 依赖并运行 make check；本轮没有取得一个远端 Actions run 的当前结果，因此不作“远端 CI 已绿”主张。
- 网络研究在 44 个实际使用的外部独立 URL、两地区配额和主要替代类别均覆盖后停止同类重复搜索；易变价格、规则与可用性以 2026-08-10 为事实截点。

### 1.2 MoA 三路独立视角

本轮按预先限定的三个视角独立研究，并在 3/3 返回后由主任务裁决：

| 视角 | 独立问题 | 主要结论 |
|---|---|---|
| A. 大中华区 | 个人站、数字花园、作品集、公众号/知乎/小红书/即刻替代，跨境访问与备案 | 独立站保留为权威档案；平台用于原生分发；大陆可达性只能说“有一次性混合结果”，不能宣称稳定 |
| B. 欧美 | personal site、portfolio、blog/newsletter、digital garden、creator platform、static hosting、SEO | 现有托管与基础 SEO 足够；缺口是内容密度、持续分发与顶层双语 URL，而不是 CMS |
| C. 怀疑性审计 | 真实受众、维护负担、流量/机会/付费证据、无障碍、隐私、安全与商业化 | 只能证明发布能力，不能证明增长或收入；先按低成本可信档案管理，商业化必须重新取证 |

主任务对分歧的裁决：

- A 倾向最多两个平台，B 倾向只试一个，C 倾向先不扩张。最终采用“两个渠道是上限、必须顺序测试、每次只增加一个变量”。
- A 与 B 都把未导航文档视作非产品面；主任务进一步在线抽查，发现 4/4 现有 Markdown 文档可被公开 URL 直接访问。因此它们应分类为“公开可寻址但非导航、非产品能力”，不能分类为“仅仓库存在”。
- A 首先发现 Sleep Toolkit 404；主任务随后在独立网络请求中复核 GET/HEAD 都是 404，因此写入当前事实，而不是代理意见。
- C 提供的绝对增长阈值缺少历史基线。报告保留这些数字作为“预注册决策阈值”，明确不是行业 benchmark，也不是市场规模推断。

### 1.3 证据等级

| 等级 | 定义 | 本报告中的用法 |
|---|---|---|
| E1 当前一手事实 | 2026-08-10 直接读取当前仓库、公开页面、公开端点或测量结果 | 基线 SHA、页面哈希、内容数量、HTTP 状态、公开链接与节点探测 |
| E2 当前官方资料 | 平台、监管、搜索、托管、无障碍与隐私官方文档 | 当前功能、价格、政策边界与最佳实践 |
| E3 可信研究 | 方法透明的独立研究或行业研究 | 平台化、创作者分发、无障碍整体风险，只作环境信号 |
| E4 历史仓库材料 | 历史审查、设计 QA、计划与旧原型记录 | 解释演进和维护面，不作为当前发布能力 |
| E5 推断/假设 | 从 E1—E4 推出的待验证判断 | JTBD、差异化、渠道选择和 90 天阈值，均标为需验证 |

## 2. 站点真实边界

### 2.1 当前公开与非当前内容

| 状态 | 可核验证据 | 能说明什么 | 不能说明什么 |
|---|---|---|---|
| 已发布、主导航可见 | 7 个核心文件线上与本地 SHA-256 7/7 一致；Home、Gallery、Projects、Essays、About 均可访问 | 当前公开 IA 与仓库基线一致 | 不证明被搜索收录、有人阅读或产生机会 |
| 已发布、可订阅 | 中文/英文 RSS 各 4 个 item；sitemap 有 18 个 URL | 存在开放订阅与搜索发现的技术入口 | 不证明有 RSS 订阅者或索引量 |
| 已发布、机器可读 | llms.txt 与 agent-index.json 均可访问 | 机器可获得站点导览 | 不证明 AI 引用、抓取或转介 |
| 已发布但未导航 | 抽查 docs/ARCHITECTURE.md、SITE_MODERNIZATION_PLAN.md、design-qa.md、历史 audit.md，4/4 返回 200 text/markdown | GitHub Pages 从仓库根直接发布；robots.txt 只是禁止抓取提示 | 不能把计划或历史审查算作当前产品功能；Disallow 不是访问控制 |
| 仓库当前存在的实现材料 | 生成脚本、JSON 数据、TS/JS、静态 fallback、测试、部署配置 | 说明维护链与可复现性 | 不等于公开受众价值 |
| 历史材料 | 设计审查、设计 QA、现代化计划 | 可说明过去发现与修正 | 不证明当前页面仍有相同问题或已达到完整无障碍 |
| 历史隔离原型 | 旧记录中的 Gallery Lab 不在本基线公开 IA 中 | 原型曾被研究 | 不得计入当前页面、市场能力或竞争优势 |
| 本报告 | 只新增于当前未提交 worktree | 第一阶段研究成果 | 尚未提交、推送或部署 |

robots.txt 已明确写明仓库分支会原样服务，因此 docs、tests、scripts、FutureBacklog 等路径虽被 Disallow，仍可能被直接访问。这个设计对公开开源仓库未必是安全事件，但必须承认：crawl control 不是 confidentiality control；以后任何不宜公开的材料都不能只靠 robots.txt。

### 2.2 当前内容库存与站点承诺

- Projects：1 个条目，Sleep Toolkit，标记为 Maintained。
- Essays：4 组中英双语文章，共 4 个中文 URL 与 4 个英文 URL；中文/英文 Feed 各 4 项。
- Gallery：5 个条目，覆盖演讲、视觉随笔、研究物、现场笔记与工具。
- Home：从内容清单选择 3 个当前条目。
- Series 与 Tags：当前是 noindex，并 canonical 到 Essays 的历史兼容页，不应另算两个内容产品。
- 顶层定位：双语个人工作索引，混合工具、研究、文章与现场记录；不是单一职业作品集，也不是单一主题媒体。

“Current index / 当前索引”是编辑承诺，不是增长证据。清单最后更新时间分散在 2026-03 至 2026-07，且不同 surface 复用同一批内容；当前更准确的市场描述是“精选快照”。

### 2.3 当前可信度缺口

1. Sleep Toolkit 的公开运行入口在 2026-08-10 本轮 GET 与 HEAD 都返回 404；在恢复前，“持续维护、对外可用”只能代表仓库标签，不能代表当前服务可用。
2. Gallery 的 Hermes 分析卡片指向演讲页；agent-index.json 与 llms.txt 则指向一个可访问的独立研究页。对人和机器的 canonical 路径不一致。
3. llms.txt 与 agent-index.json 仍指向 gallery.html#personal-data-lab，但当前 Gallery 不存在该锚点。片段 URL 的页面返回 200 不代表锚点存在。
4. 公开可寻址的规划与 QA 文档没有导航入口，也被 robots.txt 禁止抓取；它们是公开材料，不是站点产品面。将来提交新的研究文档也会继承这个发布模型，除非发布流程另作隔离。

这些问题比换模板更优先，因为它们直接影响“这个人是否会维护其公开承诺”的判断。

## 3. 目标受众、JTBD 与非目标

### 3.1 最可能的目标受众

| 受众 | 进入场景 | 核心 JTBD | 成功信号 |
|---|---|---|---|
| 同行与潜在协作者 | 从搜索、社交帖子、演讲或直接分享进入 | 在几分钟内理解作者关注什么，并找到一件可深入查看的作品 | 打开第二个内容页、引用作品、发出有上下文的联系 |
| 潜在合作/工作机会方 | 已知作者或由他人转介 | 快速验证能力、方法、持续性与公开证据 | 明确提及某件作品或方法的合格机会 |
| 对某个主题有深度兴趣的读者 | 从长尾查询或平台内容进入 | 阅读完整论证、工具或数据故事，并能回访 | 非品牌搜索点击、回访、RSS 订阅或主动分享 |
| 未来的自己与长期合作者 | 需要稳定引用旧作品 | 找到可长期访问的 canonical 版本与上下文 | 稳定 URL、低维护、内容可导出与可追溯 |

### 3.2 非目标

- 不以“所有中文互联网用户”或“所有欧美创作者”为市场。
- 不以大众短内容消费或高频新闻更新为主任务。
- 不把个人首页变成 Sleep Toolkit 的 SaaS 官网。
- 不以广告库存、会员规模或电商成交为当前商业模型。
- 不为了展示前端技术而持续增加实验性 surface。
- 不因平台拥有大量用户就推断本站存在 TAM。

### 3.3 JTBD 的证据状态

上述 JTBD 是从当前 IA、内容类型与公开动作推断的 E5 假设。本轮没有用户访谈、联系归因或行为漏斗来验证。90 天实验的首要目的不是放大流量，而是确认究竟哪一类人、因哪一件作品、在什么渠道下愿意采取下一步行动。

## 4. 大中华区与欧美市场/分发差异

### 4.1 大中华区

大中华区不是单一网络环境。香港、台湾、海外华语受众与中国大陆在托管、搜索、平台账号、内容格式和监管条件上不同。本报告只对当前可证实的边界下结论。

1. 中国大陆有强平台生态。微信把公众号、搜一搜、视频号等放在同一生态中；知乎支持问答、文章、想法与视频；小红书提供创作、数据与商业化工具；即刻仍以兴趣社区和短记录为主。它们的优势是平台内发现与互动，不是 URL 所有权。[腾讯微信产品](https://www.tencent.com/zh-cn/products/weixin-wechat/)、[公众号服务指南](https://developers.weixin.qq.com/doc/service/guide/)、[知乎创作者手册](https://www.zhihu.com/knowledge-plan/manual)、[小红书创作服务平台](https://creator.xiaohongshu.com/)、[即刻 App](https://apps.apple.com/cn/app/%E5%8D%B3%E5%88%BBapp/id966129812)
2. 平台规则与格式是分发成本。知乎条款约束账号、内容与自动化使用；平台内分发不能被当成永久可控的档案。[知乎协议](https://www.zhihu.com/term/zhihu-terms)
3. 百度仍应被视为独立的搜索入口；有 sitemap 或 Google SEO 并不自动等于百度收录。当前没有百度资源平台数据，因此只能列为测量缺口。[百度搜索资源平台](https://ziyuan.baidu.com/)
4. 中国大陆跨境网络存在可用性不确定性。Cloudflare 的 China Network 文档明确把跨境延迟/可靠性和境内网络作为单独产品问题；这不能直接证明 GitHub Pages 在大陆不可用。[Cloudflare China Network](https://developers.cloudflare.com/china-network/)
5. 本轮一次性 Globalping 数据中心探针：北京 200 / 755ms、广州 200 / 686ms、上海 ECONNRESET。它只说明当时 2/3 探针成功，不能代表全国、居民宽带、移动网络或长期 SLA。[公开测量结果](https://api.globalping.io/v1/measurements/2BtePOnmQOaaYZwLy00020v2w)
6. 若未来使用中国内地接入/主机提供非经营性互联网信息服务，备案要求会进入决策；本轮没有裁定当前境外 GitHub Pages 站点需要备案，也不提供法律意见。[工信部规则](https://www.miit.gov.cn/gyhxxhb/jgsj/cyzcyfgs/bmgz/xxtxl/art/2024/art_84a0cfa0ebd049bbbe751dca9a008e56.html)、[腾讯云 ICP 说明](https://cloud.tencent.com/document/product/1154/50706)
7. CNNIC 报告的互联网用户规模、腾讯披露的生态规模与 DataReportal 的社交使用数据只能说明环境很大、平台化很深，不能作为本站 TAM 或收入预测。[CNNIC 第 57 次报告](https://www.cnnic.net.cn/n4/2026/0304/c88-11549.html)、[Digital 2026: China](https://datareportal.com/reports/digital-2026-china)

对本站的现实含义：

- 长文、方法论、工具复盘更适合先测试公众号或知乎中的一个；视觉摘要/现场笔记才考虑小红书；即刻更适合同行对话。
- 独立站继续保存完整版本、稳定 URL 与跨内容路径；平台帖子承担摘要、讨论和回站。
- 不应同时维护四个平台。大中华区渠道一次只试一个；若欧美渠道也在试，整个 90 天最多两个渠道。
- 在没有 30 天多地区监测和真实用户反馈前，不宣称“中国大陆稳定可用”；也不因一次失败就宣称“被屏蔽”。

### 4.2 欧美

1. 开放 Web 的选择更多：GitHub Pages、Cloudflare Pages、Vercel 可以保持静态发布；Webflow、Squarespace、WordPress.com 用订阅费换可视化编辑与托管；Ghost、Substack 把 Newsletter 与会员放到中心。
2. Google 明确区分“技术上可抓取”与“实际被索引/展示”。Search Essentials、sitemap 和 hreflang 提供资格，不保证曝光。[Google Search Essentials](https://developers.google.com/search/docs/essentials)、[抓取与索引 FAQ](https://developers.google.com/search/help/crawling-index-faq?hl=en)
3. Google 对多语言站点建议使用不同语言 URL 并明确 hreflang。本站文章层已有独立中英 URL；顶层页面用 ?lang=zh 且 canonical 指向英文，是待测的索引风险，不是已证实故障。[管理多语言站点](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=en)
4. LinkedIn Newsletter 能通过站内、推送与邮件触达订阅者；Medium 有 Network/General/Boost 等平台分发；Behance 有视觉作品发现。这些是分发机制，不等于本站读者会在那里出现。[LinkedIn Newsletter FAQ](https://www.linkedin.com/help/linkedin/answer/a517914/newsletters-on-linkedin-faq?lang=en)、[Medium Distribution Guidelines](https://help.medium.com/hc/en-us/articles/360006362473-Medium-s-Distribution-Guidelines-How-curators-review-stories-for-Boost-General-and-Network-Distribution)、[About Behance](https://www.behance.net/about?locale=en_US)
5. Reuters Institute 的 2026 研究显示平台和创作者在新闻/信息分发中的作用继续扩大，同时搜索与平台依赖更脆弱。本站不是新闻媒体，不能直接套用比例；可借用的只是“自有站与第三方分发应互补”的方向。[Digital News Report 2026 摘要](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary)

对本站的现实含义：

- 不迁移 CMS；先测试一个与目标受众匹配的渠道。职业协作优先 LinkedIn，长文网络分发可测试 Medium，稳定发布与明确订阅需求出现后才测试 Ghost/Substack。
- 保留完整作品在自有站，平台使用 canonical/明确回链，避免把跨媒介身份切碎。
- 顶层双语 URL 的改善应作为 90 天 SEO 实验单列，不与视觉改版同时进行。

### 4.3 两个市场的共同点与不同点

| 维度 | 大中华区 | 欧美 | 共同裁决 |
|---|---|---|---|
| 发现 | 公众号/知乎/小红书/即刻等平台内发现更重要；百度需单独测量 | Google、LinkedIn、Medium、Newsletter 与开放 Web 更成熟 | 平台负责分发，独立站负责 canonical 与深度 |
| 访问 | 中国大陆跨境网络与托管位置需实测；港澳台/海外华语另论 | 全球静态托管选择多，迁移成本较低 | 不用平台宣传替代真实地区测试 |
| 合规 | 中国内地主机可能触发 ICP 等要求；平台有本地规则 | 邮件、隐私、第三方追踪与平台条款是主要边界 | 数据最小化、明确第三方依赖、保留导出 |
| 内容形态 | 原生长文、图文摘要、社区短记录各自分工 | Portfolio、Newsletter、长文平台分工明显 | 不复制同一内容到所有渠道；每个渠道只承担一个任务 |
| 商业化 | 平台流量不等于可付费关系 | Newsletter/会员工具更成熟，但仍需需求证据 | 先验证重复 JTBD，再讨论收费 |

## 5. 竞品与替代方案矩阵

以下比较的是“完成同一用户任务的替代方案”，不是把所有平台都误当成同类公司。价格与规则均按 2026-08-10 在线资料记录；月价若标年付，是按年付方案显示的月均价，未来可能变化。

| 类别 | 具名方案 | 自有 URL / 可迁移性 | 原生发现 | 维护与当前成本信号 | 对本站的适配与裁决 |
|---|---|---|---|---|---|
| 自建静态站 | [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | 高；仓库即源，可用自定义域 | 低，依赖搜索/外部分发 | 公共仓库可免费；需自行维护 | 当前基线最合适；保留。官方限制说明其不适合作 SaaS/在线交易主机 |
| 自建静态站 | [Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/) | 高 | 低 | 静态资源请求免费且不计 Functions 配额；动态功能另算 | 可作未来托管备选，不会自动解决内容与分发 |
| 自建静态站 | [Vercel](https://vercel.com/pricing) | 高 | 低 | Hobby US$0、面向个人/非商业；Pro 页面显示 US$20/月 | 没有当前迁移必要；若商业产品独立托管再评估 |
| 托管建站器 | [Webflow](https://webflow.com/pricing) | 中；导出/动态能力需看方案 | 低 | Basic 页面显示年付月均 US$15；2026-05 调整过计划 | 可降低可视化编辑门槛，但当前内容量不足以抵消迁移成本 |
| 托管建站器 | [Squarespace](https://support.squarespace.com/hc/en-us/articles/206536797-Choosing-the-right-Squarespace-plan) | 中 | 低 | 付费托管、模板、blog/portfolio；有试用 | 适合不想碰代码的 portfolio；本站已有定制 IA，迁移无增长证据 |
| 托管 CMS | [WordPress.com](https://wordpress.com/pricing/?locale=en_us) | 中高；内容生态成熟 | 低至中 | 官方页显示年付方案从约 US$4/月起 | 适合更大内容量和编辑工作流；当前 1/4/5 库存不构成迁移压力 |
| Newsletter + 站点 | [Ghost(Pro)](https://ghost.org/pricing) | 高；支持导出与自定义域 | 中，主要靠邮件关系 | Starter 年付月均 US$18；Publisher US$29，支持付费订阅 | 只有稳定发布与订阅需求出现后才值得试；当前功能过量 |
| Newsletter 平台 | [Substack](https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost) | 中；可导出订阅者，平台品牌强 | 高于自建站 | 免费发布；付费订阅抽成 10%，另有支付费 | 可快速验证 Newsletter，但不应替代 Gallery/Projects |
| 博客/内容网络 | [Medium](https://help.medium.com/hc/en-us/articles/360006362473-Medium-s-Distribution-Guidelines-How-curators-review-stories-for-Boost-General-and-Network-Distribution) | 中低 | 中高，受分发规则影响 | 免费入口与会员生态；规则可变 | 适合欧美长文分发实验；完整版本仍留自有站 |
| 数字花园 | [Obsidian Publish](https://obsidian.md/publish) | 中高；Markdown 友好 | 低 | 年付月均 US$8、月付 US$10 | 适合互链知识库；本站主要问题不是缺图谱，不迁移 |
| 知识库发布 | [Notion Sites](https://www.notion.com/en-gb/help/notion-sites-availability-and-pricing) | 中低 | 低 | 免费可发布；付费工作区的自定义域附加费年付月均 US$8/月付 US$10 | 发布快，但视觉/权限/子页公开边界需审慎；不自动改善大陆访问 |
| 视觉作品集 | [Behance](https://www.behance.net/about?locale=en_US) | 低 | 高，面向创意职业网络 | 免费基础；Pro 另收费 | 可分发视觉作品，不适合承载工具、长文与双语 canonical |
| 视觉作品集 | [Adobe Portfolio](https://portfolio.adobe.com/pricing%20) | 中 | 低至中，与 Behance/Adobe 生态联动 | 包含在相关 Adobe/Behance 方案中；可建多个站点 | 比独立开发省事，但会缩窄跨媒介叙事；不建议迁移 |
| 职业分发 | [LinkedIn Newsletter](https://www.linkedin.com/help/linkedin/answer/a517914/newsletters-on-linkedin-faq?lang=en) | 低；关系在平台内 | 高，利用职业图谱与通知 | 会员可创建；平台依赖 | 欧美合作机会的首选候选实验，不是档案替代 |
| 微信内容平台 | [微信公众号](https://developers.weixin.qq.com/doc/service/guide/) | 低 | 高，微信生态内 | 需账号、格式与持续运营 | 大中华区长文/更新候选；完整版本回链自有站 |
| 问答/长文平台 | [知乎](https://www.zhihu.com/knowledge-plan/manual) | 低 | 中高，问题与兴趣分发 | 需遵循平台规则、适配问答/文章 | 对方法论与复盘较合适；可与公众号二选一先试 |
| 视觉/生活方式平台 | [小红书](https://creator.xiaohongshu.com/) | 低 | 高，图文/视频推荐 | 素材重制成本较高 | 只适合视觉摘要、现场笔记或数据故事，不适合原样搬运长文 |
| 兴趣社区 | [即刻](https://apps.apple.com/cn/app/%E5%8D%B3%E5%88%BBapp/id966129812) | 低 | 中，社区对话型 | 短内容与互动维护 | 适合同行反馈，不适合长期 canonical |
| 开发者身份页 | [GitHub Profile](https://docs.github.com/en/account-and-profile/concepts/personal-profile) | 中低 | 中，开发者网络 | 低维护 | 可作为最小作品入口，但不能统一文章、视觉作品与非代码内容 |
| 不维护独立站 | 平台-only：LinkedIn/知乎/Behance/GitHub 等组合 | 无统一自有 URL | 取决于平台 | 主机维护最低，跨平台维护与规则风险仍在 | 只有连续 6 个月证明独立站几乎不带来有效阅读/机会且维护过重时才复评 |

具名方案数量：19；另加 1 种“完全不维护独立站”的策略替代。覆盖自建静态站、托管建站器、博客/Newsletter、数字花园/知识发布、作品集平台、社交/内容平台与无独立站。

## 6. 关键能力与风险审视

### 6.1 内容

优势：

- 工具、长文、研究物、演讲与现场笔记能够共同证明“做过什么、如何思考”。
- 双语文章不是简单机器翻译入口，而是可被独立引用的页面。
- static fallback 让核心内容在脚本失败时仍可读。

限制：

- 1/4/5 的库存不足以支撑“内容媒体”“数字花园规模”或复杂 CMS。
- 多个 surface 重复 Sleep Toolkit 和睡眠数据故事，主题密度高但横向广度有限。
- “Current index”与实际发布节奏尚未形成可验证的持续性。

裁决：未来 90 天应围绕两个读者任务形成 3 件高信号作品，而不是增加新一级栏目。新栏目至少要有 3 个已公开、可独立导航并回答同一任务的内容才成立。

### 6.2 发现与 SEO

已具备：

- canonical、Open Graph/Twitter 元数据、hreflang、sitemap、robots.txt、双语 RSS。
- 静态链接与可读 fallback。
- llms.txt 与 agent-index.json。

未证明：

- Google/Baidu 实际索引量、非品牌查询、点击、外链、AI 引用或平台回站。
- 顶层 ?lang=zh 是否被正确作为独立语言版本处理。
- sitemap 与机器入口是否带来任何真实发现。

[Google Search Essentials](https://developers.google.com/search/docs/essentials)明确说明技术资格不保证抓取、索引或展示；[Search Console 指标文档](https://support.google.com/webmasters/answer/7042828?hl=en)把 clicks、impressions、queries 等定义为可观察结果。因此，“有 SEO 文件”只能记为准备度，不能记为市场表现。

优先测量：

- 语言别的有效 canonical/索引页数。
- 非品牌 impressions、clicks、CTR 与落地页。
- 平台分发的可归因回站。
- llms.txt/agent-index 的引用或抓取线索；若不可测，不宣称“AI 分发优势”。

### 6.3 订阅与关系

当前有中英文 RSS，但未发现 Newsletter 表单、订阅漏斗或已验证的订阅需求。RSS 的优势是开放、低锁定；缺点是平台内发现弱且无法推断订阅规模。

裁决：

- 先保留 RSS。
- 连续完成 3 次实质发布，并出现明确“希望收到更新”的反馈后，才测试 Newsletter。
- 若测试，Ghost/Substack/LinkedIn Newsletter 是不同任务：Ghost 偏自有关系，Substack 偏网络分发，LinkedIn 偏职业图谱；不可同时开三套。

### 6.4 作品证明

作品证明不是卡片数量，而是“主张—证据—可运行结果—上下文”的闭环。当前 Sleep Toolkit 有项目说明、隐私事实、数据随笔和外部运行入口，本来是最完整的证据链；但运行入口 404 使最关键一环失效。

最低可信标准：

- 所有一级 CTA 2xx。
- Maintained 标签与实际可用状态一致。
- 人类卡片、机器索引与 canonical 目标一致。
- 外部运行服务失败时有清楚的降级状态，而不是继续宣称可用。

### 6.5 可访问性

本轮代码抽查可见 skip link、主区域、标题结构、图片替代文本、键盘焦点与 reduced-motion 处理；历史设计 QA 也记录了多轮响应式修正。这些是正向信号，不是 WCAG 2.2 合规证明。

[WCAG 2.2](https://www.w3.org/TR/WCAG22/)要求按成功准则验证；[WebAIM Million 2026](https://webaim.org/projects/million/?locale=en_GB)也明确自动工具只能发现一部分问题，未检出错误不等于可访问。本轮没有完成：

- 屏幕阅读器路径；
- 全站完整键盘任务；
- 200%/400% 缩放；
- 真实设备与辅助技术组合；
- 当前全站 WCAG A/AA 审计。

因此报告只给出“基础实现较好、完整状态未知”。

### 6.6 隐私与安全

- 27 个 HTML 中，21 个嵌入 Cloudflare Web Analytics；3 个页面引用 Google Fonts，2 个睡眠长文页引用 Plotly CDN。
- Cloudflare 将其 Web Analytics 描述为 privacy-first，并说明不使用 cookies、localStorage 或 fingerprinting；这降低追踪风险，不等于没有第三方请求或不需要透明说明。[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/)、[产品隐私说明](https://www.cloudflare.com/web-analytics/)
- 本轮未发现站点级隐私说明；Sleep Toolkit 自身有项目层隐私事实，但它不能替代主站对第三方请求和联系处理的说明。
- 香港 PCPD 的公开指引把隐私政策、收集声明和互联网数据收集列为实践议题；本报告不作法律结论，只把透明度列为产品信任边界。[PCPD 指引](https://www.pcpd.org.hk/english/resources_centre/publications/guidance/guidance.html)
- robots.txt 的 Disallow 不能保护敏感文件；所有提交到公开发布根的材料都应按公开信息处理。

### 6.7 性能

静态站、无大型 SPA 框架是有利架构，但“静态”不等于“实测快速”：

- 共享 CSS 文件约 178KB。
- 文章分组 JSON 约 439KB，并由 Home/Essays 的脚本请求。
- 睡眠长文依赖 Google Fonts 与 Plotly CDN。
- 本轮没有真实用户 Core Web Vitals、不同地区瀑布图或移动网络数据。

[web.dev 的 Web Vitals 文档](https://web.dev/articles/vitals)给出 LCP、INP、CLS 的体验边界。没有现场数据前，只能说“架构具备轻量潜力，但仍有负载和第三方依赖风险”，不能宣称快或慢。

### 6.8 维护成本

当前维护链包括：

- 中英源内容与生成 HTML；
- JSON 内容清单、首页/Gallery/Projects 数据；
- 静态 fallback；
- TS 与编译后 JS；
- RSS、sitemap、llms.txt、agent-index.json；
- 外部运行服务与第三方 CDN；
- GitHub Pages 与可选 Vercel 配置；
- 历史文档、QA 资产与公开发布根。

这种冗余提高可恢复性，也扩大漂移面。当前已经出现人类索引、机器索引、锚点和外部运行服务不一致。维护成本必须用真实工时衡量，而不是凭文件数量推断；未来 90 天应记录“写作/制作时间”和“非创作发布维护时间”。

### 6.9 平台风险

- GitHub Pages：平台限制明确指出 Pages 不是在线业务、电子商务或 SaaS 的免费主机；如果某个产品开始收费或需要后端，应独立托管，不把个人站改造成交易主机。[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- Newsletter/社交平台：提供发现与通知，但账号、算法、格式、分发规则和付费抽成都可变化。
- 托管建站器：减少技术维护，但增加订阅成本、迁移工作和模板边界。
- 平台-only：省去主机维护，却把身份、SEO 和跨媒介路径拆散；平台组合本身也有重复维护。

## 7. 差异化与反护城河

### 7.1 可成立的差异化

1. 双语：不是只切换界面，而是让部分长文有独立中英可引用版本。
2. 跨媒介证据：工具、数据故事、研究图、演讲和现场笔记能串成一条“从问题到作品”的路径。
3. 可检查性：静态 HTML、公开 RSS、机器索引和可复现仓库降低黑箱感。
4. 个人长期性：不像单一平台帖子，站点可保留长期 URL 与跨年份上下文。

### 7.2 反护城河

1. 主题过宽：工具、睡眠、AI、知识管理、现场记录并列，读者可能无法快速理解“为什么要回来”。
2. 内容稀疏：1/4/5 的库存不足以靠规模形成发现。
3. 双语成本：若没有语言别访问、回访与机会数据，双语首先是维护负担。
4. 机器可读不是护城河：llms.txt/agent-index 的存在很容易复制，而且当前还发生漂移。
5. 静态架构不是独占优势：Cloudflare Pages、Vercel、Webflow、Ghost 等都能提供足够好的发布。
6. 个人品牌依赖本人持续投入，无法通过功能自然复利。

真正可能积累的不是技术壁垒，而是“连续、可验证、可引用的作品历史”和由此形成的关系。它需要时间与分发，不靠改版。

## 8. 商业化与非商业化选项

### 8.1 非商业化主路径

把站点作为：

- 公开作品档案；
- 思考与方法的 canonical 版本；
- 合作/工作机会的可信度入口；
- RSS 与跨平台分发的落点；
- 长期个人知识基础设施。

回报用“高质量关系与机会”而不是收入衡量。对当前证据最匹配。

### 8.2 间接商业价值

可能的回报：

- 合作、咨询、演讲、写作或工作机会；
- 工具项目的测试用户；
- 公开方法带来的可信度。

但本轮没有任何归因数据。未来联系入口应允许对方自愿说明“从哪件作品来”，避免采集不必要的个人级行为数据。

### 8.3 产品级商业化

如果 Sleep Toolkit 或未来某个工具出现重复用户任务和付款承诺，应把产品定位、运行、隐私、支持、定价和托管独立评估。GitHub Pages 官方限制本身也不支持把个人 Pages 当作 SaaS/交易主机。

最低商业化证据门：

- 至少 8 次目标用户访谈出现同一重复 JTBD；
- 至少 3 个书面试用或付款承诺；
- 运行入口稳定、隐私/支持边界清楚；
- 单独的产品指标，不用个人站总流量替代。

### 8.4 Newsletter/会员

只有连续发布能力和明确订阅需求出现后才测试；付费会员更晚。Ghost/Substack 的功能和市场存在，不证明本站读者愿意订阅或付费。

### 8.5 广告与泛流量变现

不建议。当前内容量、定位与证据都不支持广告模型，而且会损害轻量、可信和个人性。

## 9. “个人基础设施 vs 对外产品”最终裁决

| 判定维度 | 个人基础设施 | 对外产品 | 当前证据 |
|---|---|---|---|
| 主要价值 | 组织、保存、证明与连接 | 解决重复用户问题并持续交付 | 前者成立 |
| 用户与需求 | 可由多类读者偶发使用 | 有清楚目标用户与重复 JTBD | 后者未验证 |
| 运营 | 低频更新也可有价值 | 需要可用性、支持、反馈与路线图 | 核心外链 404，后者不成立 |
| 增长 | 可依靠长期积累 | 需要可归因获客与留存 | 无当前数据 |
| 商业 | 间接声誉/机会 | 价格、付款意愿与单位经济 | 无付款证据 |

最终裁决：当前是个人基础设施，兼具对外公开界面；不是对外产品。网站可以承载产品证据，但产品应独立验证与运营。未来只有当某一内容/工具形成清楚受众、稳定使用、重复反馈和付款承诺时，才把该单独 surface 升格为产品；不把整个个人站强行产品化。

## 10. 90 天最小验证

所有阈值都是本项目的预注册决策阈值，不是行业 benchmark，也不是 TAM/SAM/SOM。

### 10.1 假设

- H1：至少两类目标受众能在进入后找到相关作品并采取下一步行动。
- H2：自有站作为 canonical hub，与一个原生平台分发结合，比单独发布在站内更能产生可归因的有效阅读和回应。
- H3：双语至少在一个语言市场带来可观察的非品牌发现或合格机会，足以抵消维护成本。
- H4：站点可在每周中位数不超过 2 小时的非创作维护下保持所有一级路径可用。

### 10.2 时间表

| 时间 | 最小动作 | 只测什么 | 不同时做什么 |
|---|---|---|---|
| Day 0—14 | 建立公开完整性与聚合基线；所有一级 CTA、Feed、核心页面每日检查；记录发布工时 | 可用性、来源、落地页、语言、回访、联系归因 | 不改视觉系统、不迁 CMS、不加付费 |
| Day 15—45 | 围绕受众 JTBD 1 发布 1 件高信号作品；在一个渠道做 2 次原生分发 | 内容到作品路径、有效回应、维护工时 | 不开第二个同类平台 |
| Day 46—60 | 围绕 JTBD 2 发布第 2 件作品；同一渠道再做 2 次分发 | 不同受众/主题是否重复产生信号 | 不把渠道流量当站点留存 |
| Day 61—90 | 发布第 3 件作品；若第一渠道过门槛，再顺序试另一区域的 1 个渠道、2 次分发 | 渠道增量、语言差异、合格机会 | 不同时改 URL、模板和订阅系统 |

候选渠道：

- 大中华区：公众号或知乎二选一；若作品天然视觉化，才以小红书替代。
- 欧美：LinkedIn Newsletter/帖子或 Medium 二选一；没有稳定发布前不启动 Ghost/Substack。

### 10.3 指标定义

| 层级 | 指标 | 定义 |
|---|---|---|
| 运行 | 一级 CTA 可用率 | Home、Projects、Gallery 主动作返回 2xx；Maintained 项目必须真实可用 |
| 发现 | 非品牌 impressions/clicks | Search Console 中排除姓名/域名后的展示与点击；分语言、落地页记录 |
| 分发 | 可归因内容访问 | 通过每次分发的独立 UTM 或等价聚合标记进入内容页 |
| 深度 | 首页/落地页到作品路径率 | 从入口继续打开一件核心作品的匿名聚合比例 |
| 关系 | 有效回应 | 提及具体作品、问题或方法的公开/私下回应；不计表情和泛赞 |
| 机会 | 合格机会 | 对方明确说明合作/工作/演讲/测试意图，并提到某件作品 |
| 回访 | 28 日匿名回访 | 采用隐私克制的聚合定义；若工具无法可靠测量则标未知 |
| 维护 | 非创作维护工时 | 不含写作/制作本身，记录生成、索引、链接、部署、渠道适配工时 |
| 大陆访问 | 30 天区域成功率与成功请求 P75 | 北京、上海、广州数据中心探针，加至少一个真实居民网络反馈 |

### 10.4 成功、继续与停止条件

Day 14 运行门：

- 一级断链为 0。
- Maintained 项目主 CTA 2xx。
- 若任何核心服务持续 4xx，不进行推广，先把状态改成真实情况或恢复服务。

Day 45 渠道门：

- 已完成 1 件作品与至少 2 次可归因分发。
- 若累计少于 50 个可归因内容访问且少于 2 个有效回应，停止增加视觉/功能，先调整受众、选题和分发。

Day 60 内容门：

- 已完成 2 件作品与 4 次分发。
- 若累计少于 100 个可归因内容访问或少于 4 个有效回应，不开第二渠道、不上 Newsletter。
- 若非创作维护连续 4 周超过 2 小时/周，删减维护面，而不是新增 surface。

Day 90 价值门：

- 参考成功信号：累计至少 300 个可归因内容访问、每件新作品至少 2 个有效回应、至少 2 个明确因作品而来的合格机会。
- 若合格机会少于 2 个，或没有任何可重复的受众 JTBD，把站点维持为低成本档案，不继续投入增长功能。
- 若两次外部依赖故障造成核心路径失效，优先减少依赖或撤下 Maintained 承诺。
- Newsletter 只有在完成 3 次实质发布并出现主动订阅需求后才可试。
- 商业化只有达到“8 次访谈同一 JTBD + 3 个书面试用/付款承诺”才进入下一阶段。
- 大陆数据若未达到 30 天成功率 95%、成功请求 P75 小于 2 秒且有真实居民网络确认，继续使用“可达性未知/混合”，不宣称稳定。

### 10.5 数据纪律

- 只保留聚合指标，不在本报告或仓库中存原始个人级访问数据。
- 联系归因由对方自愿填写，不进行跨站画像。
- 每次只改变一个主要变量；否则不能解释结果来自内容、渠道、URL 还是视觉。
- 缺失数据写“未知”，不以平台总体用户规模填补。

## 11. 证据缺口

### 高优先级

1. Cloudflare Web Analytics 的当前聚合访问、来源、落地页、语言与回访数据。
2. Google Search Console 的索引、非品牌查询、点击、展示与语言 URL 状态。
3. 百度搜索资源平台的收录和查询数据。
4. 过去联系、合作、工作、演讲或工具测试机会的自愿归因。
5. Sleep Toolkit 当前 404 的原因、持续时间和用户影响。
6. 中国大陆 30 天多节点与真实居民网络可达性。
7. 人类 Gallery、机器索引和不存在锚点的真实抓取/误导影响。

### 中优先级

8. 真实设备上的屏幕阅读器、键盘、缩放与移动可用性。
9. 现场 LCP、INP、CLS 与不同地区/网络瀑布。
10. 每次发布的非创作维护工时。
11. RSS 的真实订阅或回访证据。
12. llms.txt/agent-index 的抓取、引用或转介证据。
13. 中英双语分别带来的访问、回应与机会。
14. 未导航但公开可寻址文档的实际访问与隐私风险。

### 明确不做的推断

- 不从 CNNIC、腾讯、DataReportal 或任何平台用户数推算 TAM/SAM/SOM。
- 不从 GitHub Pages/CI 通过推断市场需求。
- 不从 HTTP 200 推断阅读完成或信任。
- 不从静态架构推断性能合格。
- 不从 SEO 元数据推断已收录。
- 不从 RSS 存在推断订阅者。
- 不从双语存在推断国际市场。
- 不从产品页面写“持续维护”推断服务当前可用。

## 12. 来源附录

统计口径：以下只统计外部独立 URL；站点自身、仓库文件与本轮本地命令不计入“外部来源配额”。同一机构的不同页面只在支持不同事实时保留。访问日均为 2026-08-10，页面另有明确更新时间时在备注中说明。

### 12.1 大中华区与跨境/地区来源

| ID | 类型 | 来源 | 本文用途 |
|---|---|---|---|
| GC-01 | 官方/监管 | [非经营性互联网信息服务备案管理办法（2024 修订）](https://www.miit.gov.cn/gyhxxhb/jgsj/cyzcyfgs/bmgz/xxtxl/art/2024/art_84a0cfa0ebd049bbbe751dca9a008e56.html) | 中国内地主机/接入的备案边界 |
| GC-02 | 官方/平台 | [腾讯云 ICP 备案说明](https://cloud.tencent.com/document/product/1154/50706) | 境内与境外节点的备案操作边界 |
| GC-03 | 官方/平台 | [Cloudflare China Network](https://developers.cloudflare.com/china-network/) | 跨境延迟/可靠性与境内网络是独立问题 |
| GC-04 | 官方/平台 | [Cloudflare China Network FAQ](https://developers.cloudflare.com/china-network/faq/) | 中国网络产品与 pages.dev 等限制边界；不外推到 GitHub Pages |
| GC-05 | 官方/研究 | [CNNIC 第 57 次中国互联网络发展状况统计报告](https://www.cnnic.net.cn/n4/2026/0304/c88-11549.html) | 中国互联网环境规模；明确不用于本站 TAM |
| GC-06 | 官方/平台 | [腾讯微信产品](https://www.tencent.com/zh-cn/products/weixin-wechat/) | 微信生态与公众号/搜一搜/视频号等组合 |
| GC-07 | 官方/平台 | [微信公众号服务指南](https://developers.weixin.qq.com/doc/service/guide/) | 公众号的资讯与服务渠道定位 |
| GC-08 | 官方/平台 | [知乎创作者手册](https://www.zhihu.com/knowledge-plan/manual) | 问答、文章、想法、视频等内容形态 |
| GC-09 | 官方/平台规则 | [知乎协议](https://www.zhihu.com/term/zhihu-terms) | 平台账号、内容与自动化依赖 |
| GC-10 | 官方/平台 | [小红书创作服务平台](https://creator.xiaohongshu.com/) | 发布、数据分析与商业化工具 |
| GC-11 | 一手应用商店 | [即刻 App 中国区页面](https://apps.apple.com/cn/app/%E5%8D%B3%E5%88%BBapp/id966129812) | 当前可获得性、兴趣社区与产品形态 |
| GC-12 | 官方/搜索 | [百度搜索资源平台](https://ziyuan.baidu.com/) | 百度发现与站点提交需单独测量 |
| GC-13 | 独立研究 | [Digital 2026: China](https://datareportal.com/reports/digital-2026-china) | 社交平台化环境；不用于 TAM |
| GC-14 | 一手测量 | [Globalping 大陆三节点测量](https://api.globalping.io/v1/measurements/2BtePOnmQOaaYZwLy00020v2w) | 北京/广州 200、上海重置的一次性快照 |
| GC-15 | 官方/监管指引 | [香港 PCPD 指引目录](https://www.pcpd.org.hk/english/resources_centre/publications/guidance/guidance.html) | 隐私政策、收集声明与互联网数据收集实践 |

### 12.2 欧美与全球来源

| ID | 类型 | 来源 | 本文用途 |
|---|---|---|---|
| W-01 | 官方/托管 | [What is GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) | 静态仓库发布与自定义域能力 |
| W-02 | 官方/托管政策 | [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) | 容量/带宽建议及非 SaaS/交易主机边界 |
| W-03 | 官方/托管定价 | [Cloudflare Pages pricing](https://developers.cloudflare.com/pages/functions/pricing/) | 静态请求与 Functions 计费边界 |
| W-04 | 官方/托管定价 | [Vercel Pricing](https://vercel.com/pricing) | Hobby 与 Pro 当前计划 |
| W-05 | 官方/建站器定价 | [Webflow Pricing](https://webflow.com/pricing) | 当前站点方案与价格 |
| W-06 | 官方/建站器政策 | [Webflow 2026-05 价格更新](https://help.webflow.com/hc/en-us/articles/51059955082387-Updated-pricing-and-simplified-plans-for-May-2026) | 价格为易变事实，说明本轮核验日期 |
| W-07 | 官方/建站器 | [Choosing the right Squarespace plan](https://support.squarespace.com/hc/en-us/articles/206536797-Choosing-the-right-Squarespace-plan) | 托管、portfolio/blog 与订阅方案 |
| W-08 | 官方/CMS 定价 | [WordPress.com Pricing](https://wordpress.com/pricing/?locale=en_us) | 托管 CMS 当前入门计划 |
| W-09 | 官方/Newsletter 定价 | [Ghost(Pro) Pricing](https://ghost.org/pricing) | 网站、邮件、会员、导出与当前价格 |
| W-10 | 官方/Newsletter | [Substack Features](https://substack.com/features) | 平台分发与导出能力 |
| W-11 | 官方/Newsletter 定价 | [Substack Costs](https://support.substack.com/hc/en-us/articles/360037607131-How-much-does-Substack-cost) | 免费发布、10% 付费收入抽成与支付费边界 |
| W-12 | 官方/数字花园定价 | [Obsidian Publish](https://obsidian.md/publish) | Markdown、反向链接、自定义域与当前价格 |
| W-13 | 官方/知识发布定价 | [Notion Sites availability & pricing](https://www.notion.com/en-gb/help/notion-sites-availability-and-pricing) | 免费发布与自定义域附加费 |
| W-14 | 官方/作品集 | [About Behance](https://www.behance.net/about?locale=en_US) | 视觉作品集与平台发现 |
| W-15 | 官方/作品集定价 | [Behance Pro Overview](https://help.behance.net/hc/en-us/articles/23707029830043-Behance-Pro-Overview) | Pro 能力与当前价格信号 |
| W-16 | 官方/作品集定价 | [Adobe Portfolio Pricing](https://portfolio.adobe.com/pricing%20) | Adobe/Behance 方案与多站点能力 |
| W-17 | 官方/内容平台规则 | [Medium Distribution Guidelines](https://help.medium.com/hc/en-us/articles/360006362473-Medium-s-Distribution-Guidelines-How-curators-review-stories-for-Boost-General-and-Network-Distribution) | Network/General/Boost 分发机制与平台依赖 |
| W-18 | 官方/职业平台 | [LinkedIn Newsletter FAQ](https://www.linkedin.com/help/linkedin/answer/a517914/newsletters-on-linkedin-faq?lang=en) | 创建资格与站内/推送/邮件通知 |
| W-19 | 官方/开发者平台 | [About your GitHub profile](https://docs.github.com/en/account-and-profile/concepts/personal-profile) | 不维护独立站时的最小开发者身份替代 |
| W-20 | 官方/搜索 | [Google Search Essentials](https://developers.google.com/search/docs/essentials) | 可抓取与内容质量是资格，不保证表现 |
| W-21 | 官方/搜索 | [Managing multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites?hl=en) | 独立语言 URL 与 hreflang |
| W-22 | 官方/搜索 | [Crawling and indexing FAQ](https://developers.google.com/search/help/crawling-index-faq?hl=en) | sitemap/技术状态不保证索引 |
| W-23 | 官方/搜索测量 | [Search Console Performance metrics](https://support.google.com/webmasters/answer/7042828?hl=en) | clicks、impressions、queries 的证据定义 |
| W-24 | 标准/一手 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 无障碍成功准则 |
| W-25 | 独立研究 | [WebAIM Million 2026](https://webaim.org/projects/million/?locale=en_GB) | 自动检查边界与 Web 无障碍环境风险 |
| W-26 | 官方/分析产品 | [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) | 聚合测量能力与 privacy-first 定位 |
| W-27 | 官方/分析隐私 | [Cloudflare Web Analytics 产品页](https://www.cloudflare.com/web-analytics/) | 无 cookie/localStorage/fingerprinting 的厂商说明 |
| W-28 | 官方/性能 | [Web Vitals](https://web.dev/articles/vitals) | LCP、INP、CLS 的现场体验边界 |
| W-29 | 可信研究 | [Reuters Institute Digital News Report 2026](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary) | 平台化、创作者分发与自有流量脆弱性；只作邻近环境证据 |

### 12.3 配额核对

| 配额 | 要求 | 本报告 |
|---|---:|---:|
| 外部独立来源 URL | ≥24 | 44 |
| 大中华区/地区来源 | ≥8 | 15 |
| 欧美/全球来源 | ≥8 | 29 |
| 官方/一手来源 | ≥10 | 41（按附录类型标签：平台官方、监管/标准、一手页面与测量） |
| 具名竞品/替代方案 | ≥10 | 19 具名 + 1 种 platform-only 策略 |

来源在正文的地区分析、竞品矩阵和能力审视中实际使用；附录不是未引用的链接堆积。价格、功能、规则与可用性均以 2026-08-10 为核验日。后续引用本报告时，应重新核验这些易变事实。

## 13. 第一阶段结论

第一阶段到此结束。

- 保留 simoncos.github.io 作为个人公开基础设施与 canonical hub。
- 不迁移 CMS，不把个人站产品化，不开始付费/会员实现。
- 不把 GitHub Pages、HTTP 200、CI、SEO 文件或平台用户数当作市场证据。
- 将外部平台限定为未来 90 天可停止、顺序进行的分发实验。
- 在任何推广前，先恢复或诚实降级当前 404 的 Maintained 项目承诺。
- 下一阶段若启动，应基于本报告另行批准；本报告不自行展开“不利因素应对提案”。

## 不利因素应对提案

> 第二阶段追加，研究日期仍为 2026-08-10。
>
> 本章是待批准的应对方案，不是实施记录。没有修复链接、移动内容、改变发布配置、接入分析、开设渠道、迁移 CMS 或启动商业化。
>
> 本章所有 30/60/90 天动作、百分比和数量都是预设管理阈值，用来决定继续、停止或转向；除明确引用的首轮观测外，均不是市场事实、历史基线或已实现结果。

### 1. 应对原则与处置顺序

1. 先修复公共可信档案，再讨论增长。核心作品入口、公开承诺、人与机器索引、公开边界只要仍有 P0/P1 问题，增长实验就不应启动。
2. “未导航”不等于“未公开”。只要资源可由公开 URL 访问、存在于公开 Git 历史或已被第三方取得，就按已公开处理；robots.txt 只表达抓取偏好，不是访问控制。
3. 先从源头治理，再处理搜索结果。移除源内容、访问控制、搜索结果临时隐藏、缓存/镜像协调是不同层次；任何单一步骤都不能宣称“从互联网彻底删除”。
4. 可用性、搜索、读者价值和商业价值分层验收。HTTP 2xx、静态构建、CI、canonical、RSS、sitemap、分析脚本或平台用户量都不能替代阅读、回访、机会或付款证据。
5. 一次只改变一个主要变量。内容、渠道、语言 URL、分析、托管和视觉系统不得在同一实验中同时变化。
6. 地区结论按地区取证。中国大陆数据中心探针、真实居民网络、香港/海外华语和欧美访问分别记录，不能互相外推。
7. 默认最小化。保持静态 canonical hub；CMS 迁移、Newsletter、会员、付款与 SaaS 化默认 no-go，只有新证据跨过门禁才重新评估。

### 2. 全量不利因素台账

优先级定义：

- P0：当前阻断公共可信度、隐私/权利边界或任何推广。
- P1：不立即造成事故，但会使测量、发现、机会或维护判断失真。
- P2：中期效率、体验或平台风险；在 P0/P1 收敛后处理。
- P3：仅在规模或新证据出现后再评估。

处置策略定义：

- 阻断：未解决前禁止进入后续阶段。
- 缓解：降低概率或影响，并保留监测。
- 接受：成本高于当前风险，记录边界后暂不投入。
- no-go：当前不实施，只有跨过明确证据门才可重开。

| ID | 不利因素与首轮证据 | 影响 | 概率/当前性 | 可控性 | 影响地区/用户 | 优先级 | 处理策略 |
|---|---|---|---|---|---|---|---|
| A-01 | 核心 Sleep Toolkit 入口本轮 GET/HEAD 均为 404；根因、开始时间与影响未知 | 直接破坏 Maintained/对外可用承诺，流失高意图访问 | 已发生/当前 | 中；依赖外部运行服务 | 全部地区；项目访客、合作方 | P0 | 阻断 |
| A-02 | Gallery、人类链接、llms.txt、agent-index.json 与实际锚点存在目标漂移 | 用户和机器获得不同 canonical，削弱信任与可发现性 | 已发生/当前 | 高 | 全部地区；人类与机器访问者 | P0 | 阻断 |
| A-03 | 部分未导航规划/审查 Markdown 仍可由公开 URL 访问 | 误把“未导航”当“未公开”，扩大信息暴露面 | 已证实/当前 | 高；未来内容可控 | 全部地区；搜索、爬虫、直接访问者 | P0 | 阻断 |
| A-04 | 已公开内容可能进入搜索索引、Git 历史、缓存、克隆、镜像或引用 | 即使删除当前页面，旧副本和摘要仍可能存在 | 高/一旦公开即持续 | 低至中；无法控制所有第三方副本 | 全部地区；内容权利人与被提及者 | P0 | 缓解并接受残余风险 |
| A-05 | 未见覆盖发布根的内容分级、个人数据、版权/许可和公开授权台账 | 可能发布不适合长期公开的材料或第三方资产 | 未知/缺审计 | 高；发布前可控 | 全部地区；站点所有者、权利人 | P0 | 阻断 |
| A-06 | 公开库存仅 1 个持续维护项目、4 组双语文章、5 个 Gallery 条目，且主题集中 | 难以形成稳定回访、搜索覆盖或清楚的受众认知 | 已证实/当前 | 中；受创作能力约束 | 全部地区；新访客 | P1 | 缓解 |
| A-07 | “Current index”与分散在数月内的更新时间之间存在陈旧风险 | 读者可能把精选档案误解为持续更新栏目 | 高/随时间增加 | 高 | 全部地区；回访者 | P1 | 缓解 |
| A-08 | 双语、RSS、canonical、hreflang、sitemap 和聚合分析脚本容易被误当成增长 | 技术准备度被误写为读者价值或机会转化 | 已出现认知风险 | 高 | 决策者、维护者 | P1 | 阻断错误推断 |
| A-09 | 没有可核验访问、来源、路径、回访或留存基线 | 无法判断内容、语言、渠道或改动是否有效 | 已证实/当前缺口 | 中；需隐私边界与工具 | 全部地区；决策者 | P1 | 缓解 |
| A-10 | 没有 Search Console、百度收录、查询、点击或语言 URL 证据 | 无法区分“未被发现”“被发现但不点击”“内容不匹配” | 已证实/当前缺口 | 中；依赖平台验证 | Google/Baidu 用户 | P1 | 缓解 |
| A-11 | 没有订阅漏斗、有效回应或机会归因 | 无法证明站点建立了持续关系或带来合作 | 已证实/当前缺口 | 中 | 全部地区；读者与合作方 | P1 | 缓解 |
| A-12 | 没有付款、付费意愿、重复 JTBD 或支持成本证据 | 商业化可能解决不存在的问题 | 已证实/当前缺口 | 中；需研究而非代码 | 潜在用户、站点所有者 | P3 | no-go |
| A-13 | 中国大陆访问只有一轮三个数据中心探针，结果混合 | 不能外推全国、长期、移动网或居民宽带体验 | 已证实/样本极小 | 低至中；可扩展测量 | 中国大陆访问者 | P1 | 缓解 |
| A-14 | ICP、境内/境外托管、跨境访问、平台规则与地区合规边界不同 | 可能把性能问题误当备案问题，或在未评估义务时迁移托管 | 高/决策时触发 | 中；需专业判断 | 中国大陆、港澳台、海外华语 | P1 | 阻断未经评估的地区主张/迁移 |
| A-15 | 公众号、知乎、即刻、小红书、LinkedIn、Medium/Newsletter 等均有算法、账号和格式依赖 | 分发可能增加触达，也可能增加重复维护与平台锁定 | 高/采用即发生 | 中 | 大中华区与欧美渠道受众 | P2 | 缓解 |
| A-16 | 跨平台转载若没有 canonical/回链/版本规则，会产生重复、版本分叉和权属含混 | 搜索与读者不知道哪个版本权威，修订难同步 | 高/分发时触发 | 高 | 全部地区；搜索与平台读者 | P1 | 阻断无规则分发 |
| A-17 | llms.txt、agent-index 和 SEO 元数据存在，但抓取、索引、引用或 AI 转介未知 | 机器可读准备度可能成为虚假的差异化 | 已证实/结果未知 | 中 | 搜索、AI 工具及其用户 | P2 | 接受未知并测量 |
| A-18 | 本地静态检查、构建、HTTP 2xx 或远端 CI 即使通过，也只证明有限技术条件 | 验收过度，掩盖断链、内容陈旧、无读者或无机会 | 高/持续认知风险 | 高 | 维护者、决策者 | P1 | 阻断错误验收 |
| A-19 | 21/27 HTML 嵌入第三方聚合分析，另有字体/CDN；未见站点级透明说明 | 第三方请求、地区传输、隐私预期和供应链边界不清 | 已证实/当前 | 高至中 | 全部访客；隐私敏感用户 | P1 | 缓解 |
| A-20 | 外部服务、链接、字体、图表 CDN 与平台规则会衰退或变化 | 链接腐烂、功能降级、供应链故障和内容失真 | 已发生一个核心案例；持续 | 中 | 全部地区；高意图访客 | P1 | 缓解 |
| A-21 | 没有完整屏幕阅读器、键盘任务、缩放或真实设备无障碍验收 | 一部分用户可能无法完成核心任务，现有代码抽查无法排除 | 未知/未验证 | 高至中 | 残障用户、移动用户 | P1 | 阻断严重问题；其余缓解 |
| A-22 | 没有真实用户 Core Web Vitals、区域瀑布或移动网络数据 | 无法判断静态架构、较大资源和第三方依赖的实际体验 | 未知/未验证 | 中 | 中国大陆、移动和弱网用户 | P2 | 缓解 |
| A-23 | 单人维护双语源、生成 HTML、多个 JSON、fallback、RSS、sitemap 与机器索引 | 漂移、陈旧、认知负荷和维护挤占创作时间 | 高/结构性 | 中；可删减与自动化 | 维护者、全部访客 | P1 | 缓解 |
| A-24 | 个人公开基础设施被误当 SaaS、增长产品或需要迁移 CMS | 范围膨胀、成本上升、URL/双语/档案价值受损 | 高/方案讨论时触发 | 高 | 站点所有者、全部用户 | P3 | no-go |

### 3. 资源级别、Owner 与能力定义

以下是规划估算，不是已经投入的工时：

| 资源级别 | 规划含义 | 典型范围 |
|---|---|---|
| S | 一个明确 owner 可在不引入新系统的情况下完成 | 不超过 1 人日 |
| M | 需要跨内容/工程/测量的一次协作与验证 | 2—5 人日 |
| L | 需要新运行能力、地区测试或迁移 spike | 1—2 人周；必须单独批准 |

Owner 使用角色而不是个人姓名：

- 站点 Owner：决定公开边界、受众、承诺和 go/no-go。
- 站点维护者：静态页面、生成链、索引、测试与发布。
- 工具 Owner：外部运行服务、可用性、支持与状态。
- 内容 Owner：选题、双语版本、权利/许可与平台适配。
- 数据/隐私 Owner：指标字典、数据最小化、保留期与透明说明。
- 地区/合规顾问：只在中国内地主机、备案、跨境数据或商业化真正进入决策时参与。

### 4. 可执行提案

#### P-01 核心公开服务事件处置与诚实状态

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-01、A-20 |
| 根因 | 当前只观察到 404，尚未取得部署日志、域名/路由配置、平台事件、服务健康或最近成功时间；不能把“路由原因”直接写成故障根因 |
| 首选方案 | 将核心 CTA 视为 P0 公开事件：先判定服务应恢复还是项目应降级为档案；恢复前停止推广，并让公开状态与真实可用性一致 |
| 备选及取舍 | 备选 A：临时撤下外部 CTA，可信但减少试用；备选 B：提供静态演示/仓库说明，保留证据但不等价于运行服务；备选 C：迁移运行服务，成本最高且不能在根因未知时先做 |
| 30 天动作 | 由工具 Owner 建立事件时间线、最近已知成功、部署/路由/域名/配额证据；选择“恢复、降级或撤下”之一；站点维护者准备一致的公开状态方案 |
| 60 天动作 | 若恢复，完成 30 天独立健康记录；若降级，验证所有入口都不再暗示当前可用；记录一次故障复盘 |
| 90 天动作 | 评估外部服务是否仍值得 Maintained 承诺；若保留，明确 owner、支持边界和退化模式 |
| Owner/能力/依赖 | 工具 Owner 主责，站点维护者配合；依赖运行平台日志、部署权限、域名/路由配置和状态页能力 |
| 资源级别 | M；若迁移服务则 L 且需新批准 |
| 地区差异 | 大中华区与欧美都先要求语义真实；恢复后再分地区测量，不用香港或欧美可用替代大陆可用 |
| 副作用 | 暂停推广会减少短期访问；降级标签可能显得保守，但比错误 Maintained 承诺更可信 |
| 最低成本验证 | 从两个独立网络做 GET/HEAD，并人工完成一次核心任务；不需要先建新监控系统 |
| 量化阈值 | 进入任何推广前，所有一级 CTA 100% 返回预期状态；若宣称可用，连续 14 天核心任务成功率达到内部 SLO，且没有未解释的 4xx/5xx |
| 停止/转向 | 7 天内无法取得根因证据，停止“恢复即推广”路线，转为公开降级；连续两次外部依赖造成 P0，转向静态证据或更少依赖的运行方案 |

#### P-02 人类/机器索引单一事实源与一致性门

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-02、A-16、A-17、A-18、A-23 |
| 根因 | 同一作品的路径、锚点和状态分布在页面、内容清单、机器索引、RSS/sitemap 与静态 fallback；当前检查没有把语义目标一致性作为硬失败 |
| 首选方案 | 指定一个内容 manifest 为唯一事实源，派生人类卡片、机器索引、RSS/sitemap 和 fallback；把不存在锚点、目标分叉、状态冲突和非预期 4xx 变成发布阻断 |
| 备选及取舍 | 备选 A：保留多源但加对账测试，改动小、长期维护仍高；备选 B：只人工清理当前漂移，最快但复发概率高 |
| 30 天动作 | 画出字段/消费者映射；为每个公开作品确认唯一 canonical、语言版本、状态和退化目标；定义一致性检查契约 |
| 60 天动作 | 在隔离实现中让检查覆盖人类/机器目标、锚点、语言和状态；不改变现有 IA 前先验证生成结果字节差异 |
| 90 天动作 | 连续两个发布周期验证没有手工旁路；删除一个已证明冗余的维护点，或记录保留理由 |
| Owner/能力/依赖 | 站点维护者主责，内容 Owner 审核语义；依赖当前生成脚本、manifest 和发布检查 |
| 资源级别 | M |
| 地区差异 | 大中华区平台转载仍指回同一 canonical；欧美搜索/Newsletter 也使用同一权威 URL。地区差异只在摘要和语言，不改变事实源 |
| 副作用 | 更严格检查会阻断发布；集中 manifest 的错误也会放大，因此必须保留静态回退和审阅 |
| 最低成本验证 | 先写只读对账报告，不改生成器：列出每个作品在人类、机器、RSS/sitemap 的目标并比较 |
| 量化阈值 | 已知目标漂移为 0；公开内容 100% 有唯一 canonical 与状态；任何不存在锚点或非预期 4xx 必须令检查失败 |
| 停止/转向 | 若集中生成会大幅重写稳定页面，先停在“对账测试 + 人工批准”；若两次发布仍需旁路，转为减少 surface 而不是继续加同步逻辑 |

#### P-03 公开内容分级与发布根治理

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-03、A-05、A-19 |
| 根因 | 当前发布模型从仓库根服务文件；未导航、robots Disallow 和“内部用途”没有形成真正的访问边界 |
| 首选方案 | 建立发布前内容台账，最少分为“导航公开、公开但不导航、历史公开、不得发布”四类；为每项记录 owner、个人数据、第三方版权/许可、保留期与是否进入搜索 |
| 备选及取舍 | 备选 A：改为显式发布 allowlist，边界最强但工程改动较大；备选 B：继续全根发布，仅加审查清单，成本低但人为遗漏风险高；noindex/robots 只能作为搜索策略，不能替代保密 |
| 30 天动作 | 只做清单与分类，不移动文件；对当前发布根做 100% 类型盘点，任何无法判断的项目先标“待审/不得新增曝光” |
| 60 天动作 | 选一个非敏感样本验证 allowlist 或独立发布目录的可行性、URL 影响和回滚；形成提交前检查规则 |
| 90 天动作 | 若方案获批，再逐批迁移发布边界；保留公开历史材料的明确说明，不把历史计划写成当前能力 |
| Owner/能力/依赖 | 站点 Owner 决策，内容 Owner 做权利/隐私分类，站点维护者评估发布管线；必要时咨询法律/版权专业意见 |
| 资源级别 | M；显式发布目录迁移可能为 L |
| 地区差异 | 隐私/版权基线全球一致；大中华区需额外审查平台转载授权与本地个人信息规则，欧美需关注邮件/分析和第三方资产条款 |
| 副作用 | allowlist 可能漏发必要资源；分类增加发布摩擦；历史公开材料改位置会造成链接腐烂 |
| 最低成本验证 | 不改网站，仅导出当前发布文件清单并逐项打四类标签；随机抽查公开 URL 是否与分类一致 |
| 量化阈值 | 发布根资产 100% 有分类与 owner；“不得发布”资产在发布输出中为 0；个人数据/版权状态未知的 P0 项为 0 |
| 停止/转向 | 若无法证明某项适合公开，停止其后续发布，不以 robots.txt 缓解；若迁移会破坏稳定 URL，先保留公开历史并增加语义标签，另建干净发布根 |

#### P-04 搜索缓存、Git 历史与镜像移除预案

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-04、A-05 |
| 根因 | 已公开材料可能存在当前站点、Git 历史、搜索结果、缓存、克隆、fork、镜像和引用等多个副本；没有按敏感等级区分响应 |
| 首选方案 | 建立三级事件预案：普通陈旧内容走更新/404/410 与再抓取；不宜公开内容先从源头移除或加访问控制，再申请搜索临时隐藏；秘密/高敏感内容先撤销凭据并单独批准历史清理和外部协调 |
| 备选及取舍 | 备选 A：只 noindex/robots，成本低但不安全；备选 B：重写 Git 历史，可能必要但破坏提交签名、分支、fork/clone 协作，且不能删除他人副本；备选 C：保留内容并加上下文，适合非敏感历史材料 |
| 30 天动作 | 写出事件分级、决策人、证据保存和联系清单；不执行历史重写；用一个无敏感内容的演练案例走完判断流程 |
| 60 天动作 | 对 Search Console 所有权、临时移除权限和源站状态码策略做桌面演练；确认 GitHub Support 介入条件 |
| 90 天动作 | 完成一次恢复/移除演练复盘；检查是否还有未知公开副本，但不承诺“互联网清零” |
| Owner/能力/依赖 | 站点 Owner 决策，站点维护者处理源站/Git，数据/隐私 Owner 判断敏感性；依赖 Search Console、GitHub 权限和必要时的专业意见 |
| 资源级别 | S 建预案；真实敏感事件可能 L 且需紧急批准 |
| 地区差异 | Google 临时移除只影响 Google；百度及各平台需各自流程。中国大陆、欧美和其他搜索/镜像不可互相替代 |
| 副作用 | 过度移除会破坏引用和历史；历史重写可能让旧克隆重新污染仓库；搜索临时隐藏可能误伤整个前缀 |
| 最低成本验证 | 对一个无敏感样本验证“当前源—搜索结果—Git 历史”三层状态，不提交任何删除 |
| 量化阈值 | P0 暴露在确认后 1 小时内完成分级和凭据撤销决定，4 小时内决定源站处置；搜索移除请求同日提交；所有步骤保留审计记录 |
| 停止/转向 | 若内容仍在源站或访问控制未生效，不宣称已移除；若风险仅是过时而非敏感，不重写历史，改用更新、重定向或明确历史标签 |

新增证据边界：

- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html)明确 robots.txt 不是内容安全措施，列出的路径本身还可能被发现。
- [GitHub：Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)说明历史重写需要协调，旧数据仍可能存在于克隆、fork、缓存视图和引用中。
- [Google Search Console Removals](https://support.google.com/webmasters/answer/9689846?hl=en)说明临时移除只影响 Google 搜索结果、持续时间有限，也不会从互联网或源站删除内容。

#### P-05 公共完整性与链接腐烂监测

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-01、A-02、A-07、A-20、A-23 |
| 根因 | 当前检查偏向构建与本地引用，缺少公开端点、外部 CTA、语义状态、更新时间和机器索引的持续观测 |
| 首选方案 | 建立小型公开完整性清单：核心页面、一级 CTA、RSS/sitemap、机器索引、主要外部服务和 Current/Maintained 状态；按风险分频监测并保留最近成功证据 |
| 备选及取舍 | 备选 A：每次发布人工巡检，成本低但无法发现发布间腐烂；备选 B：全站高频爬取，覆盖高但对个人站过重且会产生噪音 |
| 30 天动作 | 定义不超过 20 个 P0/P1 检查目标、预期状态和 owner；每日一次即可，不先建设复杂 dashboard |
| 60 天动作 | 增加语义检查：Maintained 对应可用、机器/人类目标一致、Current 内容有更新时间；记录告警到处置时间 |
| 90 天动作 | 根据三个月故障频率删减无价值检查；只保留能改变决策的监测 |
| Owner/能力/依赖 | 站点维护者主责，工具/内容 Owner 接收相应告警；依赖稳定的轻量运行环境和不含敏感数据的日志 |
| 资源级别 | M |
| 地区差异 | 全球检查保证源站基本状态；大陆可达性另由 P-09 处理，不能用单一境外节点替代 |
| 副作用 | 外部站点的 403/反机器人可能产生假阳性；监控自身也有维护成本 |
| 最低成本验证 | 每日从一个独立网络跑一次核心清单，人工核对一周；先不保存个人访问数据 |
| 量化阈值 | P0/P1 目标清单覆盖率 100%；非预期 4xx/5xx 在 24 小时内被确认并恢复或诚实降级；已知索引漂移为 0 |
| 停止/转向 | 若连续 30 天告警中超过 20% 为假阳性，降低频率或改为人工抽查；若监测维护超过每周 30 分钟，削减目标而不是扩建系统 |

#### P-06 隐私克制的测量与机会归因

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-08、A-09、A-11、A-19 |
| 根因 | 分析脚本存在，但没有可核验指标字典、基线、来源/语言拆分、机会归因或站点级透明边界 |
| 首选方案 | 先定义最少聚合指标：来源、落地页、语言、作品路径、回访代理、可归因有效回应与合格机会；只用聚合数据，不将个人级原始访问数据写入仓库 |
| 备选及取舍 | 备选 A：完全不做访问分析，隐私最好但无法评估分发；备选 B：引入更强分析平台，功能多但增加 consent、第三方传输和维护成本 |
| 30 天动作 | 数据/隐私 Owner 写指标字典、目的、保留期和禁采字段；验证现有工具实际能提供什么，不能提供的标未知 |
| 60 天动作 | 为每次获批分发使用独立归因标记；联系入口只让对方自愿说明来源/作品；形成 28 天只读基线 |
| 90 天动作 | 只保留改变决策的指标；核对平台报表与站点聚合的口径差异，不把两者相加成“总用户” |
| Owner/能力/依赖 | 数据/隐私 Owner 主责，站点维护者实现，内容 Owner 使用；依赖分析平台文档、地区隐私判断和 Search Console |
| 资源级别 | M |
| 地区差异 | 大中华区平台常提供平台内指标，欧美渠道可能提供邮件/职业图谱指标；两者只比较同口径动作，不比较不可比的曝光 |
| 副作用 | 归因参数可能被分享或丢失；回访代理不等于同一真实用户；透明说明会增加页面/文案维护 |
| 最低成本验证 | 不新增供应商，先从现有聚合工具导出 28 天可用字段并做数据字典；抽查 5 个测试链接的来源识别 |
| 量化阈值 | 获批实验的归因标记覆盖率 100%；连续 28 天数据可用日达到 95%；禁采字段和仓库中的个人级原始日志为 0 |
| 停止/转向 | 若现有工具不能回答任何 go/no-go 问题，停止堆指标，改用小规模访谈/自愿归因；若需要个人级追踪才可回答，默认不采集并重新设计问题 |

#### P-07 搜索与机器发现的可证伪测量

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-10、A-17、A-18 |
| 根因 | 当前有 sitemap、hreflang、canonical、RSS、llms.txt 和 agent-index，但没有 Google/Baidu 索引、查询、点击、AI 引用或语言 URL 结果 |
| 首选方案 | 把搜索与机器发现拆成四张表：可抓取、已索引、获得展示/点击、产生有效后续动作；Google 与百度分别测量，AI 转介仅在有可核验来源时记录 |
| 备选及取舍 | 备选 A：只做搜索人工抽查，便宜但样本偏差大；备选 B：采购 SEO 工具，可能增加代理数据且对小站过重 |
| 30 天动作 | 验证 Google Search Console 与百度资源平台所有权/可用性；对核心 URL 记录语言 canonical、索引状态和已知机器漂移 |
| 60 天动作 | 形成两个连续 28 日窗口的 impressions、clicks、queries 与 landing pages；不设排名保证 |
| 90 天动作 | 只对有展示但低点击、或被抓取但未索引的页面提出单变量实验；AI 引用仍未知时接受未知 |
| Owner/能力/依赖 | 站点维护者与内容 Owner；依赖平台所有权、数据延迟、语言 URL 和统一 canonical |
| 资源级别 | M |
| 地区差异 | 百度与中国平台内搜索单独看；Google/LinkedIn/Medium 面向欧美及全球。不得用 Google 数据代表大陆，也不得用平台曝光代表开放 Web |
| 副作用 | Search Console 数据有延迟和隐私阈值；人工搜索受位置/个性化影响；优化可能诱发为搜索而写 |
| 最低成本验证 | 核心页面逐个做 URL Inspection/平台等价检查，并记录 28 天零基线；不改内容 |
| 量化阈值 | 核心公开 URL 100% 有明确“可抓取/索引未知/已索引”状态；任何 SEO 实验至少观察两个 28 日窗口；没有数据时不得给出增长百分比 |
| 停止/转向 | 若 90 天非品牌搜索仍无足够展示样本，停止技术 SEO 扩张，转向内容主题和可归因分发；若机器入口无可验证转介，保留低成本文件但不宣传为优势 |

#### P-08 内容组合、陈旧治理与可持续节奏

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-06、A-07、A-08、A-23 |
| 根因 | 当前内容数量小、主题集中、多个 surface 复用同一项目；“Current”需要持续编辑，但双语与多索引增加每次发布成本 |
| 首选方案 | 以两个受众 JTBD 建立 90 天内容组合：每个 JTBD 至少一件完整证据作品，第三件用于验证可重复性；为 Current/Maintained/Archive 定义清楚的更新时间与降级规则 |
| 备选及取舍 | 备选 A：维持精选档案、降低更新承诺，维护最小；备选 B：提高发布频率，可能增加发现但牺牲深度；备选 C：只做单语先行，降低成本但削弱双语价值验证 |
| 30 天动作 | 选择两个 JTBD、3 件候选作品和每件的证据闭环；记录创作与非创作维护时间；不新增一级栏目 |
| 60 天动作 | 完成 2 件实质更新；核对语言、RSS、sitemap、机器索引和平台摘要的一致性 |
| 90 天动作 | 完成第 3 件；根据语言别访问、有效回应和维护工时决定继续双语、精选档案或缩减 surface |
| Owner/能力/依赖 | 内容 Owner 主责，站点维护者支持生成链；依赖真实创作能力、权利审查和 P-02/P-05 完整性门 |
| 资源级别 | M，不含作品本身的创作时间 |
| 地区差异 | 大中华区长文/图文表达与欧美职业/长文平台的摘要不同；canonical 作品不分叉，平台只做原生入口 |
| 副作用 | 为满足数量而发布低价值内容；双语翻译可能推迟发布；降级 Current 可能降低“活跃”印象 |
| 最低成本验证 | 先发布一件已有素材的高信号更新，测量从源内容到双语/索引/分发的完整工时 |
| 量化阈值 | 90 天最多 3 件实质作品；每件至少有主张、证据和下一步；非创作维护中位数不超过 2 小时/周；新一级栏目至少有 3 件独立内容才可建立 |
| 停止/转向 | Day 60 未完成 2 件作品，停止扩平台和新功能，转为低频精选档案；双语维护成本连续 4 周超预算且无语言别信号，转为主语言先行、按需翻译 |

#### P-09 中国大陆访问、托管与合规决策树

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-13、A-14 |
| 根因 | 当前只有一次数据中心探针；访问性能、可用性、ICP、境内托管、跨境传输和平台分发是不同问题，容易被混为一个“大陆方案” |
| 首选方案 | 先测量，再选架构：30 天多城市数据中心 + 至少一个真实居民网络；分别记录 DNS/TLS/TTFB/总时长/成功率；只有在受众价值成立后才评估境内托管与专业合规意见 |
| 备选及取舍 | 备选 A：保持境外静态站并接受不确定性，成本最低；备选 B：增加可替换的地区镜像/静态副本，维护和 canonical 风险增加；备选 C：境内托管，可能改善访问但引入备案、运营和内容义务 |
| 30 天动作 | 预注册地点、网络类型、频率和成功定义；运行 30 天但不对外宣称稳定；收集少量自愿居民反馈 |
| 60 天动作 | 若访问问题重复且有目标受众，做一个不改变 canonical 的静态交付 spike；同时取得托管/备案/数据边界的专业判断 |
| 90 天动作 | 只在访问改善、受众价值、维护能力和合规四项同时成立时提交架构决策；否则保持现状并诚实标注未知 |
| Owner/能力/依赖 | 站点 Owner 决策，站点维护者测量，地区/合规顾问按需；依赖可重复探针、真实网络反馈和托管供应商资料 |
| 资源级别 | M 测量；任何镜像/境内托管为 L 且单独批准 |
| 地区差异 | 中国大陆单列；香港、台湾、海外华语与欧美维持各自观测，不合并为“大中华区平均” |
| 副作用 | 探针不代表真实用户；镜像会造成版本、缓存、canonical 和隐私分叉；境内托管不是纯性能优化 |
| 最低成本验证 | 保持现有站不变，运行固定脚本与 1—3 名自愿居民用户的任务测试 |
| 量化阈值 | “大陆稳定可用”门：连续 30 天成功率至少 95%、成功请求 P75 小于 2 秒，并有真实居民网络确认；这是管理阈值，不是当前结果 |
| 停止/转向 | 未达到受众/机会门时，不为大陆单独迁移；探针与居民反馈相冲突时，以扩大真实用户样本为先，不用数据中心结果定案 |

#### P-10 平台分发与 canonical 互补实验

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-11、A-15、A-16 |
| 根因 | 独立站缺原生分发，平台有发现但受规则控制；多平台同步会制造版本、格式和维护分叉 |
| 首选方案 | 每个地区顺序测试一个渠道，平台发布原生摘要/节选，明确回到自有 canonical；完整修订只发生在自有站，平台保留版本/日期说明 |
| 备选及取舍 | 备选 A：全文同步，平台体验好但版本与搜索重复风险高；备选 B：只发链接，维护低但平台分发可能弱；备选 C：完全不分发，保持低维护但无法验证受众 |
| 30 天动作 | 通过公共可信度、内容边界和测量门后，选择一个渠道与一个 JTBD；写明内容格式、回链、评论处理和退出规则 |
| 60 天动作 | 完成 4 次可归因分发；比较有效回应、回站和维护小时，不比较平台不可比的总曝光 |
| 90 天动作 | 只有首渠道跨门才顺序试另一区域一个渠道；否则停在一个或零个渠道 |
| Owner/能力/依赖 | 内容 Owner 主责，数据/隐私 Owner 定义归因，站点维护者保证 canonical；依赖 P-01—P-08 门通过 |
| 资源级别 | 每个渠道 M |
| 地区差异 | 大中华区在公众号/知乎中先二选一，视觉作品才考虑小红书，即刻偏同行对话；欧美在 LinkedIn 或 Medium 中先二选一，Newsletter 另有更高门 |
| 副作用 | 平台可能压低外链、改变规则或锁定账号；原生适配增加内容制作；回站率低不一定代表平台内容无价值 |
| 最低成本验证 | 用同一件已完成作品做 2 次不同角度的原生摘要，不开新账号矩阵、不自动同步全文 |
| 量化阈值 | 每个实验 4 次分发后再判断；Day 60 累计低于 100 个可归因内容访问或少于 4 个有效回应，不开第二渠道；阈值是预设决策线，不是市场 benchmark |
| 停止/转向 | 连续两个周期的单位维护小时有效回应低于最佳渠道三分之一且无高质量机会，停更该渠道；平台要求破坏 canonical、隐私或权利边界时立即 no-go |

#### P-11 核心任务无障碍与真实设备验收

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-21 |
| 根因 | 当前只有代码抽查和历史 QA，没有本轮完整屏幕阅读器、键盘、缩放、触屏、软键盘与真实设备任务证据 |
| 首选方案 | 定义 5 个核心任务，使用桌面键盘、至少一种屏幕阅读器、200%/400% 缩放和一台真实移动设备完成；自动检查只作补充 |
| 备选及取舍 | 备选 A：只自动扫描，便宜但会漏掉任务障碍；备选 B：完整 WCAG 审计，证据强但对当前小站资源较大 |
| 30 天动作 | 建立设备/辅助技术矩阵和核心任务：导航、切换语言、打开作品、阅读长文、使用联系/RSS 路径 |
| 60 天动作 | 完成首次人工任务验证并按 P0/P1/P2 分级；严重障碍进入公共可信度阻断 |
| 90 天动作 | 复测已批准修复，并把最小任务集加入发布前检查；不宣称全站 WCAG 合规，除非完成相应审计 |
| Owner/能力/依赖 | 站点维护者主责，可访问性测试能力或外部评审支持；依赖真实设备与辅助技术 |
| 资源级别 | M；正式合规审计为 L |
| 地区差异 | 中英文都测；中文屏幕阅读、字体回退和换行需单列，欧美测试不能代替中文任务 |
| 副作用 | 辅助技术组合很多，单一矩阵无法代表所有用户；严格修复可能改变视觉或交互 |
| 最低成本验证 | 先用一台手机、桌面键盘和系统自带屏幕阅读器完成 5 个任务，记录阻断而非主观美感 |
| 量化阈值 | 5 个核心任务在约定矩阵上完成率 100%；P0/P1 无障碍阻断为 0；自动扫描为 0 错误也不能单独通过门 |
| 停止/转向 | 若测试矩阵过大，保留最高影响任务与用户组合；发现 P0 时暂停增长实验，先修复或提供等价路径 |

#### P-12 真实性能、第三方依赖与隐私预算

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-19、A-22 |
| 根因 | 静态架构被当成快速代理，但现有资源、字体、图表 CDN 和分析脚本的现场影响未知；性能与第三方隐私边界没有共同预算 |
| 首选方案 | 先测现场 LCP/INP/CLS、资源体积和第三方请求，再设页面类型预算；任何第三方必须有功能目的、失败退化、隐私说明和移除条件 |
| 备选及取舍 | 备选 A：只做实验室 Lighthouse，易重复但不代表真实用户；备选 B：全面自托管第三方资源，控制更强但更新/安全维护增加 |
| 30 天动作 | 对 Home、Essays、Gallery、项目长文在移动/桌面、至少两个地区做基线；列出所有第三方请求、目的和失败模式 |
| 60 天动作 | 只选一个最大瓶颈做单变量实验；同时评估减少第三方是否改善隐私和可靠性 |
| 90 天动作 | 形成页面类型预算与 28 天现场窗口；没有足够 RUM 时明确使用实验室代理，不给“用户提升百分比” |
| Owner/能力/依赖 | 站点维护者与数据/隐私 Owner；依赖 RUM/实验室工具、地区网络与第三方文档 |
| 资源级别 | M |
| 地区差异 | 中国大陆单列第三方域名可达与跨境时延；欧美/香港数据不能替代。中文字体体积与渲染也单列 |
| 副作用 | 加 RUM 可能引入更多脚本；自托管增加更新责任；压缩过度可能伤害可读性 |
| 最低成本验证 | 用现有页面做实验室三次重复测试并记录离散度，同时观察可用的聚合现场数据；不先优化 |
| 量化阈值 | 若有足够现场样本，以 P75 LCP ≤2.5s、INP ≤200ms、CLS ≤0.1 作为内部门；无现场样本时只报告实验室结果与次数，不宣称用户达标 |
| 停止/转向 | 单变量实验没有稳定方向或改动损害可访问性/可读性时回滚；新增第三方不能说明必要目的、退化与数据边界时 no-go |

#### P-13 单人容量、CMS 迁移与商业化证据门

| 项目 | 内容 |
|---|---|
| 覆盖因素 | A-12、A-23、A-24 |
| 根因 | 多工件维护可能挤占创作，但没有真实工时；CMS/Newsletter/付款工具容易被当成解决方案，实际受众、JTBD、付费意愿和支持成本均未验证 |
| 首选方案 | 先记录 90 天内容/维护工时和重复 JTBD；默认保持静态个人基础设施。只有维护成本或产品证据跨门，才批准可逆 CMS spike 或单独产品实验 |
| 备选及取舍 | 备选 A：减少 surface/双语频率，保留架构；备选 B：托管 CMS，降低编辑门槛但增加迁移、订阅和 URL 风险；备选 C：产品独立站/服务，边界清楚但运营成本最高 |
| 30 天动作 | 记录创作与非创作维护时间；进行目标用户访谈提纲设计，但不加定价、支付或会员 |
| 60 天动作 | 若出现重复 JTBD，完成最多 8 次访谈和承诺记录；若维护超预算，先删减一个冗余面而非迁移 |
| 90 天动作 | 只有商业证据门通过才提交独立产品实验；只有 CMS 门通过才做两篇真实双语内容的可逆迁移 spike |
| Owner/能力/依赖 | 站点 Owner 主责；内容/站点维护者提供工时，潜在产品 Owner 做访谈；依赖 P-01—P-12 的可信与测量证据 |
| 资源级别 | S 做决策台账；CMS/产品 spike 为 L 且需单独批准 |
| 地区差异 | 大中华区付费、账号与平台生态和欧美 Newsletter/支付不同，必须分别验证；个人站 canonical 与档案边界保持一致 |
| 副作用 | 访谈承诺不等于付款；CMS spike 可能产生双写；缩减双语/栏目会损失部分受众；商业化会改变隐私、支持与托管义务 |
| 最低成本验证 | 不写新系统：记录两次真实发布工时，完成 8 次访谈前不采购 CMS/Newsletter；书面承诺必须指向同一 JTBD |
| 量化阈值 | 商业化门：至少 8 次目标访谈出现同一重复 JTBD，且有至少 3 个书面试用/付款承诺；CMS 门：两篇真实双语内容端到端非创作发布时间降低至少 30%，且 URL、双语、fallback、RSS/索引无损 |
| 停止/转向 | 未跨商业门则继续非商业档案；CMS spike 未降时或造成 URL/语义损失则回滚；连续 4 周非创作维护超过 2 小时/周时先删减，不默认迁移 |

### 5. Now / Next / Later

| 阶段 | 时间 | 允许进入的提案 | 目标 | 明确不做 |
|---|---|---|---|---|
| Now | 0—30 天 | P-01、P-02、P-03、P-04、P-05 | 恢复或诚实降级核心服务；消除已知索引漂移；完成公开内容分级与移除预案；建立最小完整性检查 | 不做渠道扩张、视觉改版、CMS、Newsletter、付款或境内托管 |
| Next | 31—60 天，且公共可信门通过 | P-06、P-07、P-08、P-09、P-11、P-12 | 建立隐私克制基线；验证搜索、内容节奏、地区访问、无障碍与性能 | 不把代理指标写成增长；不同时改变内容、URL、渠道和托管 |
| Later | 61—90 天，且测量/内容门通过 | P-10；P-13 仅做证据收集 | 顺序测试最多一个地区渠道；决定保持档案、缩减维护或是否值得提交独立 spike | 商业化与 CMS 仍默认 no-go；未跨门不立项 |

关键排序：P-01—P-05 是公共可信档案工作，优先于所有增长实验；P-10 不是 Now；P-13 的 CMS/商业化部分不是默认路线。

### 6. Go / No-go 门

| Gate | 进入条件 | Go | No-go / 保持状态 |
|---|---|---|---|
| G-00 实施授权门 | 本章经 owner 选择具体提案、范围和回滚 | 只实施获批提案 | 本章本身不授权任何修复、迁移、平台开设或数据采集 |
| G-01 公共可信门 | 核心 CTA 状态真实；已知人类/机器漂移为 0；连续 14 天无未解释 P0 | 可开始基线测量 | 继续修复/降级，不推广、不分发 |
| G-02 公开边界门 | 发布资产 100% 分类并有 owner；不得发布与高风险未知项为 0 | 可继续公开内容实验 | 不增加公开材料；敏感/权利不清项保持阻断 |
| G-03 测量/隐私门 | 指标目的、字段、保留期、禁采项和透明边界获批；个人级原始日志不入仓库 | 可运行聚合基线 | 不接入新追踪，不做用户级画像 |
| G-04 搜索证据门 | Google/Baidu 分别有可解释的 28 天窗口或明确“无数据” | 可做一个单变量发现实验 | 不做排名承诺、不采购重型 SEO、不声称 AI 分发 |
| G-05 内容/容量门 | Day 60 完成 2 件实质作品；非创作维护中位数 ≤2 小时/周 | 可准备一次渠道实验 | 转为低频精选档案，停止新 surface |
| G-06 分发门 | G-01—G-05 通过；canonical/版本/退出规则明确；一次只选一个渠道 | 可做 4 次可归因分发 | 不开第二渠道，不做自动全文矩阵 |
| G-07 大陆主张/托管门 | 30 天多地区成功率、P75 和真实居民反馈达内部门；若涉及境内主机已取得专业判断 | 可提交架构选择 | 继续使用“可达性未知/混合”；不宣称稳定、不迁境内 |
| G-08 Newsletter/商业化门 | 完成 3 次实质发布并有主动订阅需求；商业化另需 8 次访谈同一 JTBD + 3 个书面承诺 | 仅可提交独立实验方案 | 不加会员、支付、价格页，不把个人站变 SaaS |
| G-09 CMS 迁移门 | 两篇真实双语内容 spike 使非创作发布时间下降 ≥30%，且 URL/双语/fallback/RSS/索引无损并可回滚 | 才可提交迁移决策 | 保持静态架构；优先删减维护面 |

门的数字是项目管理阈值，不表示当前已达到。尤其 G-07 的 95%/P75、G-08 的访谈/承诺和 G-09 的 30% 都是未来可证伪条件，不是市场 benchmark。

### 7. 硬阻断

| ID | 硬阻断 | 解除条件 |
|---|---|---|
| HB-01 | 核心 CTA 404 或 Maintained/可用承诺与事实不一致时，禁止推广和增长实验 | 恢复并通过 14 天门，或公开诚实降级/撤下 |
| HB-02 | 公开发布根存在未分类、疑似敏感、个人数据或权利/许可不清的 P0 项时，禁止新增曝光 | 完成分类、owner 决策与必要的源头处置 |
| HB-03 | 未批准指标目的、字段、保留期和透明边界时，禁止新增分析/用户级追踪 | G-03 通过 |
| HB-04 | 只有一次探针、没有居民证据或专业判断时，禁止宣称大陆稳定、禁止以备案猜测替代测量、禁止境内托管迁移 | G-07 通过 |
| HB-05 | canonical/版本/归因/退出规则未定义，或 owner 容量超预算时，禁止平台矩阵和第二渠道 | G-05、G-06 通过 |
| HB-06 | 没有重复 JTBD、访谈、书面承诺、运行稳定与支持边界时，禁止会员、支付、价格页和 SaaS 化 | G-08 商业化条件通过，并另行批准 |
| HB-07 | 没有真实内容 spike、URL 保留和回滚证据时，禁止 CMS 迁移、框架重写和批量 URL 改造 | G-09 通过，并另行批准 |

### 8. 因素 → 提案 → 门禁覆盖

| 因素 | 主要提案 | 关键 Gate / 阻断 |
|---|---|---|
| A-01 | P-01、P-05 | G-01 / HB-01 |
| A-02 | P-02、P-05 | G-01 / HB-01 |
| A-03 | P-03 | G-02 / HB-02 |
| A-04 | P-04 | G-02 / HB-02 |
| A-05 | P-03、P-04 | G-02 / HB-02 |
| A-06 | P-08 | G-05 |
| A-07 | P-05、P-08 | G-01、G-05 |
| A-08 | P-06、P-08 | G-03、G-05 |
| A-09 | P-06 | G-03 |
| A-10 | P-07 | G-04 |
| A-11 | P-06、P-10 | G-03、G-06 |
| A-12 | P-13 | G-08 / HB-06 |
| A-13 | P-09 | G-07 / HB-04 |
| A-14 | P-09 | G-07 / HB-04 |
| A-15 | P-10 | G-06 / HB-05 |
| A-16 | P-02、P-10 | G-01、G-06 / HB-05 |
| A-17 | P-02、P-07 | G-01、G-04 |
| A-18 | P-02、P-07 | G-01、G-04 |
| A-19 | P-03、P-06、P-12 | G-02、G-03 / HB-03 |
| A-20 | P-01、P-05 | G-01 / HB-01 |
| A-21 | P-11 | G-01；发现 P0 时 HB-01 等价阻断 |
| A-22 | P-12 | G-03；新增第三方受 HB-03 |
| A-23 | P-02、P-05、P-08、P-13 | G-05、G-09 / HB-05、HB-07 |
| A-24 | P-13 | G-08、G-09 / HB-06、HB-07 |

覆盖结论：24/24 个不利因素至少映射到一个可执行提案和一个门禁或明确接受策略；没有“只描述、不处置”的孤立因素。

### 9. 第二阶段新增来源

本阶段没有重复广搜。只为“robots 不是保密、Git 历史/缓存残留、搜索结果临时移除”这一首轮新证据缺口定向新增 3 个官方/标准来源：

| ID | 来源 | 支持边界 |
|---|---|---|
| N-01 | [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309.html) | robots.txt 不是访问授权或安全措施，路径可能因列出而更易发现 |
| N-02 | [GitHub Docs: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) | 历史重写的协调/副作用，以及克隆、fork、缓存和引用中的残留 |
| N-03 | [Google Search Console: Removals and SafeSearch reports tool](https://support.google.com/webmasters/answer/9689846?hl=en) | 临时隐藏只影响 Google 搜索结果，不能替代源头永久处置 |

新增来源数：3。其余平台、ICP备案、搜索、多语言、无障碍、性能、分析隐私和分发依据沿用首轮已核验来源。

### 10. 提案证据纪律与 self-check

- 404 是 2026-08-10 的一次当前观测；根因、持续时间、受影响用户数仍未知。P-01 要求先取日志和运行证据，没有把路由、部署或托管猜测写成原因。
- 大陆访问仍只有首轮三枚数据中心探针的一次快照。P-09 的 30 天、95%、P75 和居民网络是未来管理门，不是当前 SLA 或全国结论。
- 100/300 次访问、4 个有效回应、2 个机会、8 次访谈、3 个书面承诺、30% 工时下降等均是预注册停止/继续阈值，不是市场 benchmark、预测或实测。
- Search Console、百度、Cloudflare、平台曝光和 RSS 均是不同口径；不得相加为“总用户”，不得用 impressions 替代阅读、回访、机会或付款。
- HTTP 2xx、静态检查、CI、sitemap、hreflang、canonical、llms.txt 与 agent-index 只证明各自有限条件，不能形成增长验收。
- robots.txt、noindex 和 Google 临时移除都不是互联网级保密或删除；镜像/克隆残余风险必须明确接受。
- 所有提案使用将来时和条件式。本章没有执行修复、监控、分析接入、平台分发、托管迁移、CMS spike 或商业化。
- 商业化与 CMS 迁移的原裁决未改变：当前默认 no-go；只有新证据通过 G-08/G-09 且得到新的实施授权，才可重开。

> ✅ self-check passed：提案的事实、推断、代理指标、管理阈值和未实施状态已分开。
