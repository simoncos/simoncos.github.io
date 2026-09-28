# 九篇旧文的双语发布交接

当前状态：九篇中英文已于 2026-09-28 一并发布，英文译文由 Claude Opus 5.5 完成，发布复核结果见 QA 报告。用户明确要求今后所有文章双语上线，本批同样遵守。Obsidian 原稿保持不变。后续以 [文章发布流程](../ARTICLE_PUBLICATION.md) 为准。

## 译文对应文件

所有路径相对于仓库根目录。对应中文稿为去掉 `.en` 的同名 `.md`。

| 中文标题 | 对应的英文 Markdown |
|---|---|
| 十年如雨 | `blogs/ten-years-like-rain.en.md` |
| 谢谢你曾来避雨 | `blogs/thanks-for-sheltering-from-the-rain.en.md` |
| 问题解析的极限 | `blogs/the-limits-of-problem-analysis.en.md` |
| 问题解决与设计（一）：问题情境 | `blogs/problem-solving-and-design-1-situation.en.md` |
| 问题解决与设计（二）：可行解 | `blogs/problem-solving-and-design-2-feasible-solutions.en.md` |
| 问题解决与设计（三）：开放问题 | `blogs/problem-solving-and-design-3-open-problems.en.md` |
| 问题解决与设计（四）：纠结与最优解 | `blogs/problem-solving-and-design-4-choice-and-optima.en.md` |
| 小白头翁的100天 | `blogs/a-bulbuls-first-100-days.en.md` |
| 我的手 | `blogs/my-hands.en.md` |

## 日期和正文边界

- 九篇的 `date` 都是历史日期，出处见 [QA 报告](2026-09-28-redesign-and-article-publication.md#九篇旧文收录) 的表格；规则见 [发布流程 · Dates](../ARTICLE_PUBLICATION.md#dates)。
- 《十年如雨》：保留标注 `2020.05.10` 的补图。
- 《谢谢你曾来避雨》：文中对百日记录的链接已改为站内，英文版链接英文百日记录。
- 《小白头翁的100天》：文末添加对《谢谢你曾来避雨》的后记链接，英文版同样使用对应英文路径。
- 《我的手》：`written: 2012-12` 记录诗末落款的写作月份，不虚构某一天。附录保留海子《你的手》的署名和诗行结构。
- 系列统一使用 `series: 问题解决与设计`，`series_part: 1` 到 `4`，显示名由 `data/site.json` 提供。旧的“仅为草稿”、未完成第五六篇目录已移除；不把余下提纲加入发布。
- 保留作者历史口吻与观点，不顺手重写论证。经用户同意改正的笔误和事实错误见 [QA 报告](2026-09-28-redesign-and-article-publication.md)，中英两版同步。

## 译文处理

- 翻译时论证和事实照原文，不借翻译修正；发现的问题交作者决定，决定改的中英两版一起改。
- 《谢谢你曾来避雨》引用的两段歌词不翻译，英文版用一句话概括。第一首注明为张国荣《春夏秋冬》；第二首查不到出处，不写歌名。
- 《我的手》附录的海子《你的手》仍在版权期内，英文版只保留署名，并链接中文页读原诗。
- 只有中文的外链标注 “(in Chinese)”；电车难题改链英文维基；《十年如雨》所引维基段落中的悬空注释编号在中英两版都已删去。
- 人教社《影响问题解决的因素》的两个原链接已失效（只返回维护公告页），中英两版都换成互联网档案馆 2016 年的存档，已确认存档内容完整。

## 图片与验证

- 25 张静态图已按既有图片流程存放在 `blogs/assets/images/<slug>/`，每张小于 1 MB；中英文共享。
- 百日记录的 7 张 GIF 保留原 R2 动画链接，尺寸已加入缓存。没有把动画压成静止图片；仍有外部资源依赖。发布前已确认 7 张 GIF 全部加载并解码成功，均为动图；合计约 51 MB，是否转成视频待作者决定。
- 双语检查在译文补齐后全部通过。9 条英文 sitemap URL 已加入，`make check-all` 与 `git diff --check` 通过，双语跳转与手机阅读已复核。
- `data/site.json` 系列英文简介、`llms.txt` 和 `agent-index.json` 中的 “In Chinese” 已改为双语说明。
- 改版 MoA 发现的 6 项问题及其状态见 [QA 报告](2026-09-28-redesign-and-article-publication.md)。

整理中文稿的 Codex 任务已停止生成以避免与并行翻译相互覆盖；其 `127.0.0.1:5199` 临时预览已关闭并释放。未跟踪的 `个人网站视觉重设计.zip` 是原有文件，本轮未修改。
