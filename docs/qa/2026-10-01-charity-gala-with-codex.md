# 慈善晚会与 Codex 文章发布 · 2026-10-01

用户在本次写作会话确认全文，并明确要求发布到 Site、根据活动页修改配图，以及在 Obsidian 备份。按 [文章发布规则](../ARTICLE_PUBLICATION.md) 准备中英文。译者为 Codex（GPT-6），没有沿用模板中的其他模型署名。本记录随发布提交保存，远端部署结果以该提交对应的 Site checks / deploy 运行为准。

## 文章与日期

| 版本 | 标题 | 路径 | date 依据 |
| --- | --- | --- | --- |
| 中文 | 和 Codex 一起，给慈善晚会搭把手 | `blogs/charity-gala-with-codex.md` | 2026-10-01，本次完成并确认的新稿 |
| English | Lending a Hand at a Charity Gala, with Codex | `blogs/charity-gala-with-codex.en.md` | 与中文相同 |

两版标签均为既有的 `ai, hack, life`，由发布者按内容归类；未新增标签。没有 series。

## 用户决定与正文

1. 用户批准本会话上一版完整中文稿，并直接授权发布，无待定的内容决定。
2. 保留轻松、克制的个人叙述；关于未来协作的部分保留“假如”“或许”等探索口吻。
3. 中文正文不改字句。只将已确认标题转为 H1，添加封面及 alt 文本、发布 metadata。
4. 按 Site 的双语要求新增忠实英文翻译，不增加募款金额、业务结果或系统根因推断。
5. 活动页面与拍卖平台职责维持区分；在线表格为认捐，不表述为收款。

## 配图

- 来源：活动团队提供的活动页主视觉，最终活动页源码中的 `assets/hero.png`。原活动页未修改、未重新部署。
- 根据用户要求，用 ImageGen 改制博客封面，保留蓝色背景、双手托举孩子与明亮门的构图，替换为本文中文标题。它是原视觉的改编插画，不是页面实况截图。
- 两种语言共享 `blogs/assets/images/charity-gala-with-codex/cover.jpg`；英文 alt 提供中文封面标题的含义。
- 1 张图，1600 × 853，203092 bytes；JPEG，EXIF 已去除，未包含真实人物面孔、私人联络方式或拍卖后台数据。
- SHA-256：`bf50e322da0a5aaefb419415ac363172f85f329ac15f8a151200d9d58d974e22`。
- 原始生成图与本地审核截图保存在活动交接工作区的 `outputs/blog-20261001/`；Obsidian 备份包含同一张压缩封面。

## 翻译

采用自然的第一人称经验叙述，保留不确定性与对团队的感谢。没有引用、歌词或诗歌翻译。

| 中文 | 英文 |
| --- | --- |
| 晓日春晖 | Spring Blooms |
| 拍品 | auction item |
| 最低加价 | minimum bid increment |
| 补拍 | follow-up auction |
| 认捐表 | donation pledge form |
| 打八折 | reducing prices by 20% |
| context 没有打通 | the context wasn't connected |

组织名称核对：[晓日春晖官网](https://www.springblooms.org/4)及活动参与机构使用的 [Spring Blooms 英文名称](https://ebmedical.com/en/about/newscenter/news/2026-07-14/105.html)。没有把这些参考链接或额外背景添加到作者正文。

## 链接与生成范围

正文没有外链。封面为本地资源。新增两个 sitemap URL，合计 133 个；站点更新日已为 2026-10-01。生成器更新首页、文章列表、中英文 RSS、文章索引与 backlinks 数据，以及此前最新文章的“更新的一篇”导航。没有修改模板、脚本、样式或业务应用。

## 验证

- `make generate` 完成。
- `make check-all` 通过，52 个测试通过；生成输出、TypeScript、站点结构和技能镜像检查通过。
- `git diff --check` 通过。
- 本地中英文页面：390、1280 宽度各 2 次，以及 390 深色各 1 次，共 6 次加载通过；封面可见、alt 完整、没有横向溢出或页面脚本错误。
- 实际核对两版截图；截图等待字体、图片和页面过渡动画完成。
- 两版语言切换链接与 hreflang、封面 Open Graph 元数据均检查。
- 首页、文章列表、中英文 RSS 均包含新文章。
- Obsidian 中文正文与 Site 正文逐字一致；写入限定为新文章和配图，未操作 vault 的 Git 同步。
- 发布从独立副本基于 `126cfe2ab8f1b34d61d9da71d07a663335d3cc88` 准备，发布前已重新读取远端 master。
