# 文章「个人网站，Remake」发布记录（2026-10-03）

- 文章：`blogs/personal-site-remake.md`（澈本人改定的中文稿）、`blogs/personal-site-remake.en.md`（Claude Opus 5.5 翻译）。tags: design；date 2026-10-03。
- 视频：`blogs/assets/images/personal-site-remake/intro.{zh,en}.mp4`，取自 simoncos-site-intro v6.3 的 720p 版本（4.5 / 4.6 MB），海报是 35.6 s 的座右铭帧。嵌入为 `<video class="post-film" preload="none">`，带声音、不循环、不自动播放。视频下方注明钢琴采样（YDP Grand Piano，FreePats，CC BY 3.0）。
- 新规则：`scripts/check_site.py` 中，`post-film` 视频上限 5 MB，必须 `preload="none"`；循环小动图仍为 1 MB。CSS 中 `video.post-film` 最大高度 78vh。

## 对澈的稿子做的改动

- 加了作品链接：作品轮盘、十年睡眠档案、知乎社交网络研究、HN × LLM、收藏、漫无止尽的回响、2017 年的简书介绍、演讲幻灯片、哈巴雪山、《晴天》及其乐谱一栏。
- 「Fears & Dream演唱会」改为「Fear and Dreams 演唱会」，以维基百科和百度百科的官方名称为准。
- 其余文字未改动。

## 翻译要点

- 标题：Personal Site, Remake。
- 《晴天》译为 Sunny Day (晴天)，与作品页一致。
- 南航 D.C. 译为 NUAA D.C.。
- 「Claude 5.5」照原文保留。
- 演讲幻灯片、简书文章加 (in Chinese)。

## 检查

- `make generate`、`make check-all`（79 OK）、`git diff --check` 均通过。
- `check_pages.cjs`：390 和 1280 两种宽度，中英文共 8 次加载，全部 ok。
- `check_links.py`：4 个外链均为 200。
- 截图：视频在 390 宽时显示为 350×622，在 1280 宽时为 395×702。

## 同批改动

- 座右铭改为全小写「connecting the dots.」，涉及 About、llms.txt、agent-index.json、site-copy-and-ia skill，以及视频 v6.3。
- 文章里嵌入的页面后面，如果紧跟一段只含指向同一页面的链接，就标记为 `embed-fallback`，在显示封面按钮的情况下隐藏，避免手机上出现两个重复入口。这次影响的是哈巴文章。
- css_version 改为 20261003r。

## 用户决定

- 澈：稿子已人工改定，只加作品链接、翻译；座右铭全小写（2026-10-03）。
- 澈：哈巴文章大屏下方的重复文字链接在手机上隐藏（ok）。
