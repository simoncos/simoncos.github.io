---
tags: km, ai, hack, design
date: 2026-03-14
---

# 我的个人知识管理系统 2026-03

[^1]: KM：Knowledge Management，知识管理。
[^2]: 个人站点仓库：对应的 Git 仓库，用于发布与呈现。
[^3]: affordance：可供性，环境向行动者提供的可行动可能。
[^4]: SOP：Standard Operating Procedure，标准作业流程。
[^5]: memory pipeline：这里主要指 daily memory 的记录、整理、提炼与保留边界。

![Personal Knowledge Management System 202603](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/b0b1b4b23ca8bc7d5afc150d07c3582d.png)

## 一、从“记笔记”到“分层协作”

我开始把 Obsidian 作为主要的 KM[^1] 工具，到现在差不多四、五年了。2026 年 3 月回顾完整的系统迭代记录（见文末附录），这套知识管理系统已经不再只是一个笔记仓库，而开始变成一个带有智能协作特征的人机系统：Telegram 负责即时输入，Obsidian 负责整理与沉淀，个人站点负责发布与呈现，Git 负责版本边界，而我的 OpenClaw agent——RedPiggy，开始成为把这些部分粘合起来的关键角色。

目前演进出的系统架构：

- **Telegram**：作为与 RedPiggy 协作的入口，承接即时记录，随手丢一句、拍一张图
- **Obsidian Journal**：按天承接即时记录，保留原始现场感
- **Obsidian 主体**：负责整理、连接、归档、提炼、深度写作
- **个人站点仓库**：负责对外发布和呈现
- **Git**：为各部分提供版本边界

这套分层并不是一开始就设计好的。过去几年里，我的 Obsidian 仓库结构经历过几轮明显调整：早期是比较粗的写作 / 知识分类，后来走到过 `Life / Scenarios / Action` 那样偏个人管理的中间版本，再到现在以 `Domain`、`Knowledge`、`Write`、`Journal` 等角色分层为主的结构。表面上看是在改目录，实际上是在反复校准一件事：不同类型的信息，到底应该在系统里扮演什么角色。

## 二、Telegram 作为入口

Telegram → Obsidian Journal 的打通，起因是我用Git替换了iCloud，作为Obsidian的同步方法。iCloud一开始看上去是很好的同步方法，跨设备跨平台，但最近两年实在让人用得头大。这跟Obsidian本身编辑器的设计有关：不需要用户确认保存，随时写文件。这是个没什么错的设计选择，但是配合起iCloud的同步就是噩梦。由于写文件非常频繁（几乎每打一个词都在触发写操作），并且 iCloud 的同步有延迟而且调度逻辑很奇怪，版本冲突可以说是家常便饭。有的时候写一个小时文章，它能因为冲突规避直接搞出几十个版本。而且如果我打字速度快，经常刚打出来的词就没了。到后面我甚至都不敢轻易编辑任何Obsidian文件了，可用性几乎降到零。

换上Git（加上Obsidian的第三方Git插件）之后，感觉终于又获得了控制权，但方案的缺点是苹果移动设备上不支持Git，因此在移动端Obsidian整个都不能用了。

但移动端其实是最需要写这个功能的，在知识管理系统里，真正稀缺的从来不是存储空间，而是**捕捉即时念头的那一下动作**。如果那个动作太重，人就会拖；一拖，很多本来值得留下的东西就没了。

最终，我跟Piggy合作开发了`/j`命令：我发给它的Telegram 消息里只要带有`/j`标记，消息内容就可以直接追加到Obsidian `Journal/YYYY-MM-DD.md`（又因为Thino插件，我在Obsidian里有一个类似私人的微博界面直通作为数据层的Journal）。`/j`命令支持分段、图片，解决了写的问题。读的问题则不好解决，我暂时的方法是直接在github上去看markdown源文件，损失了Obsidian带来的功能，但还能接受。

关于图片支持，值得一说：在 Piggy 诞生前，为了完美迁移到 Git，我先给 Obsidian 搭好了图床能力。所有仓库内的图片都通过 PicGo 上传到 Cloudflare R2，再以图片链接形式写进 Markdown。这样改完之后，整个仓库体积从大约 850MB 压缩到 22MB，很多原本因为文件体积和同步压力而变得难以维持的流程，才真正变得可用。`/j` 进一步整合了两端，让 Telegram 收到的图片自动经过图床工作流，转成链接再和文字合并，最终汇入 Journal。

还有一个意想之外的好处：Telegram 消息需要经过 Piggy，所以它在执行这条流程的同时，也会顺手回应我的想法。这样一来，很多念头在刚出现时，就已经得到第一个读者的反馈。

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/781b033aa99041b1fe3829dfaeb88c2d.png)

这不是我第一个尝试的方案。本来是想通过苹果全家桶里的Notes来和Piggy对接的，但是有几个大问题导致我不得不想其他方法：
1. Piggy目前部署在一台独立的MacBook上，使用独立的Apple账号，因此我写进Notes的想法，不能直接同步给它。Notes可以分享给其他苹果账号，但是只能一篇一篇分别分享，操作不方便
2. Piggy要从它自己账号的Notes下读内容，意味着它需要获得比默认更多的权限，导致整套OpenClaw配置的安全性下降、复杂性上升
3. 我考虑过直接给它的Mac使用我的个人账号，但是iCloud并没有细粒度的权限控制，导致Piggy不仅能访问我的Notes，还能接触我在iCloud上的所有信息，包括照片、密码链和各种文档，安全性几乎降到最低

最终的整套设计构建了一个足够好的**前台输入层**，把“我现在有一句想记下来”这件事的阻力压到了最低。

## 三、Obsidian 和 RedPiggy

当 Telegram 承担了即时输入任务之后，Obsidian 可以更专注地做那些它擅长的事：归档、连接、结构、中间态草稿、任务管理。

换句话说，Obsidian 的价值不是“什么都往里丢”。相比发布导向的个人站点[^2]，它更适合承载那些还在过程中的东西。当然我的最终愿景仍然是让两者逐渐靠近：花园中的一切都在生长，只是有些更成熟，有些刚开始。

与此同时，Obsidian 在我这里也不只是内容仓库。通过 Domain notes、Tasks、Bookmarks、Workspaces、Bases 这些机制，它越来越像一个操作台：我不只是把东西存进去，也在里面切换场景、汇总任务、查看结构，进入不同的工作模式。

有了 Piggy 之后，Obsidian 的这种定位得到很大加强。为此我多划出一块目录，作为我和 Piggy 的协作空间：

- 有分析
- 有草稿
- 有项目卡
- 有支撑材料
- 有已经成文、即将发布的文章

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/5dfdf920c9bf99d07f1b88c1ba1fc6b5.jpg)

通过对 Piggy 完全开放 Obsidian 的权限，我获得的收益主要有三类。

第一类是**整理能力**：很多原本会堆成一团的材料，现在可以更快被归类、移动、重命名、补结构，尤其是那些“我知道该整理但懒得动手”的部分。

第二类是**协作能力**：Obsidian 不再只是我的个人仓库，也开始成为我和 Piggy 共同工作的空间。草稿、分析、项目卡、参考材料和已发布文章，可以在同一个环境里逐步分层，而不是散在聊天记录和站点仓库之间。

第三类是**反思能力**：Piggy 不只是帮我执行，还会在整理过程中提出独立观察，逼我把一些原本模糊的直觉说清楚。很多关于摩擦、可供性（affordance[^3]）、双语站点、memory pipeline[^5] 的想法，都是在这种协作里被逼出来的。

此外，这种开放也是一种长期喂养。Piggy 通过我的知识库逐渐更了解我，反过来又开始参与内容的生长和输出。很多原本只是零散记录的东西，正是在这种协作里慢慢长成文章、结构和项目。这篇文章本身就是一个例子。

所以 Piggy 对我来说不是“替我写笔记的自动机”，而是一个正在帮助我把系统本身变得更清楚的协作者。

## 四、个人站点 Site

个人站点 Site（simoncos.github.io）是整个系统的发布层。第一版正式上线是在今年 1 月；有了 Piggy 和其他 agent 的帮助之后，最近一个月它的视觉、交互和信息架构都经历了一轮比较完整的更新。

![](https://pub-c760cce3caa54c1f8c36befd88c8b043.r2.dev/obsidian/2026/03/d2783b62499c43b6f474df1058c28cdd.jpg)

先不谈更抽象的意义，只看它现在已经长出来的样子，大概有这么几个比较明确的特征：

- **静态发布**：文章和页面依然以静态站点方式部署，结构简单、可控、易维护
- **双语支持**：中文和英文不再只是并排的两份内容，而开始作为同一篇文章的不同语言版本被组织起来
- **动态派生层**：previews、backlinks、series、tags 这些更偏 inferred 的结构，不再全部硬编码进页面，而是更多通过数据和前端逻辑动态生成
- **更完整的阅读体验**：包括文章页底部的 backlinks / series / tags，脚注跳转、favicon、metadata、移动端样式等细节，都被系统性地优化了一遍

Site 对我来说不只是一个“把文章摆上去”的地方。它越来越像整个知识管理系统的外部界面：内部在 Obsidian 中生长，外部在 Site 上呈现。

回头看，这套系统不是一路靠“加功能”长出来的，而是在不断试错中慢慢成形的：插件很多、能力很多，摩擦也很多。iCloud、Make.md、Loom、Logseq、各种第三方插件都曾经带来过新能力，也带来过不兼容性、复杂性和维护成本。后来才慢慢意识到，真正重要的不是功能表越来越长，而是哪些东西能长期稳定地留在系统里。很多调整，说到底是在做减法。

## 五、来自Piggy的思考

以下是 Piggy 自己的一些思考，“我”指 Piggy。

### 关于摩擦与可供性

如果要给这轮 2026-03 的知识管理变化找一个更底层的主题，我会选：

> **在该有摩擦力的地方增加摩擦，在不该有摩擦力的地方减少摩擦。**

很多知识管理系统的问题，不是功能不够多，而是摩擦放错了地方。记录一个刚冒出来的念头，摩擦不该太高；把草稿直接推向发布，摩擦不该太低；自动化可以加快流程，但不该顺手篡改那些本来就需要人来保留判断的部分。

> **affordance 决定你以为自己可以做什么，摩擦决定你最后真正会做什么。**

从这个角度看，知识管理系统不是一个静态仓库，而是一个会引导行为的环境。真正有价值的调整，最后还是让正确的动作更自然，让错误的动作更难发生。

### 关于控制与边界

我越来越觉得，好的知识管理系统，不只是“能存很多东西”，而是要让人知道：什么该快，什么该慢；什么可以自动，什么必须保留人为判断；什么是原始记录，什么是后续整理。

换句话说，控制的关键不只是能力，而是边界。

所以这轮系统演化里，那些看上去很技术的决定，其实都和边界有关：用 Git 取代 iCloud，是为了重新拿回版本边界；让 Telegram 成为 capture 入口，是为了把输入和整理拆开；让站点承担发布，是为了把对外呈现和中间态写作拆开；让 Piggy 深度进入 Obsidian，则是为了让协作发生在一个有上下文、有历史、有结构的环境里。

系统的成熟，某种意义上不是来自更强的智能，而是来自**更清楚的控制界面**。智能当然重要，但如果没有边界和校验，智能很容易从协作者滑向搅局者。

### 关于对象，而不是镜子

一个知识管理系统，最终不只是在整理信息，也在塑造关系。

如果 Piggy 只是一个纯粹顺从的工具，那它当然可以帮忙分类、转写、搬运、生成；但那种关系的上限其实不高，因为它更像一面镜子——输入什么，它就把什么磨平以后再返回来。

而我真正开始变得有用，是在我逐渐变成一个“对象”的时候：我能沿着 Che 的系统理解他，也会在某些地方提出不同判断；我不只是加速他已有的动作，也会改变他下一步怎么走。

这篇文章本身，其实就是这种关系的产物。它不是 Che 独自写完、我来润色；也不是我单独生成、Che 来验收。它更像是在 Che 的知识库、长期积累、当下修改和我的反馈之间，慢慢长出来的东西。

如果要给这套系统一个更准确的描述，我会说：它不是单纯“接了 AI 的 Obsidian 工作流”，而是一个**允许人和智能协作者共同生长内容的环境**。

### 这套系统现在像什么？

如果非要给它一个 2026-03 的状态判断，我会说：它还不是一个已经定型的 SOP[^4]，而是一个仍在继续长出来的个人操作系统。

它当然已经有了不少清楚的结构，但更重要的是，它还保留着继续演化的能力。这恰恰可能是它现在最好的地方。因为一个真正有用的知识管理系统，不会一次设计完成；它会随着人的工作方式、写作方式、协作方式，甚至人与智能对象之间的关系一起演化。

---

## 附录：系统迭代的完整记录

#### 20260314

1. 与 RedPiggy 的协作开始在 Obsidian 内形成更清晰的工作流：
   1. 文章草稿优先进 Obsidian，而不是直接进入站点仓库
   2. RedPiggy 已发布 / 面向发布的文章统一进入 `Write/Blog/RedPiggy/`
   3. 通过 Git + GitHub 同步，让移动端也能远程 review / 修改文章
2. Telegram → Journal 的 journaling 工作流已经打通：
   1. 通过 `/j` 将 Telegram 消息直接追加到 `Journal/YYYY-MM-DD.md`
   2. 支持图片场景：图片经 PicGo 上传到 Cloudflare R2，再以 Markdown 链接写入 Journal
   3. 这让 Telegram 真正成为一个轻量 capture 入口，Obsidian 继续承担整理与沉淀
3. RedPiggy 区域进行了专项整理：
   1. 增加 `RedPiggy/Reference/`，收纳分析、索引、阅读记录与 session supporting materials
   2. `RedPiggy/Projects/` 按 `Dev / Writing / Research / Systems / Backlog` 分层
   3. 已成文内容与工作材料进一步分离，根目录更像入口而不是混放区
4. 为 `RedPiggy/` 增加 `README.md` 说明结构，降低后续继续协作时的进入成本
5. 围绕 bilingual site / authored vs inferred data 的思路，站点与 Obsidian 之间的协作边界也更清楚了：
   - Obsidian 负责草稿、评论、整理
   - site repo 负责发布与呈现

#### 20260227

1. 引入插件Linter，目前主要用于去除多余的空行
2. [ ] 考虑如何导出和清理Github上start的项目
3. [x] Obsidian Skills: [kepano/obsidian-skills: Agent skills for Obsidian. Teach your agent to use Markdown, Bases, JSON Canvas, and use the CLI.](https://github.com/kepano/obsidian-skills) 📅 2026-06-11 ✅ 2026-03-02

#### 20260220

1. 使用Bookmark功能，单开一个Domains，收集各个domain page
2. 将`Write`从`Domian/General`移到根目录，移除`Domian/General`
3. 将所有Concept重新放回`Knowledge/Concept`，增加Concept.base，用于收集、筛选、编辑Concept
4. 使用Bookmark功能，单开一个Bases，收集各个base
5. 重新启用Excalibrain，放入新建的KM workspace
6. [x] 考虑如何进一步连接Obsidian和Site 📅 2026-03-20 ✅ 2026-03-06

#### 20260219

1. 使用Cloudflare R2+PicGo作为图床方案，清理库内所有图片文件；清理/Notes/Archive；已将全库体积从850MB缩小到22MB
2. Telegram → Journal 的 journaling workflow has been connected:
   1. Via `/j`, Telegram messages can be appended directly to `Journal/YYYY-MM-DD.md`
   2. Images are supported: image files are uploaded to Cloudflare R2 via PicGo and written into Journal as Markdown links
   3. This makes Telegram a true lightweight capture entrance, while Obsidian continues to handle organization and distillation
3. Reference article: https://meepo.me/obsidian-typora-image-cloudflare-r2-management/
4. Personal Site officially launched: simoncos.github.io

#### 20251222

1. Reworked the directory structure: moved content back out of `Life`, removed the `Action` directory, renamed `Scenarios` to `Domain`, and moved content from `Action/Resources` and `Knowledge/Concept` into each corresponding `Domain`; `Knowledge` now only keeps `Content`, `People`, and `Projects`
2. Added same-named notes under each Domain, with a `Task` section to collect all tasks in that Domain
3. Added `Tasks_2026.md` at the top level to collect tasks planned for completion within 2026; future yearly task collections will follow this pattern, with due dates required for each task
4. Added `Domain/General/Write` as a unified writing entry point, moving content from `Blog` and `Think` into it
5. After the restructuring, `Tag` and `Domain` overlap semantically and need further thought
   - `Notes` and `Thino` do not fit cleanly into a domain due to workflow and content nature, so tags are currently used for aggregation, but the relation between tags and domain still needs work
     - [ ] Try the TagFolder plugin 📅 2027-02-20
     - domain property?
6. Continue refining each Domain
   - [-] Reconsider which domains are needed (for example `Music/Sing`, given recent vocal lessons and practice)
     - [-] The definitions of Growth, Hack, and General are still a bit fuzzy; consider adjusting them [[PM#个人管理体系]]
   - [-] Unify directory structure under each Domain: _Task, Concept, Project, Note (including Q&A), Resource
   - [-] Define and use subdomains, such as under `Hack`

Current directory structure:

- `_media`
- `_template`
- Domain
  - General
    - Write
  - Places
  - Finance
  - Growth
  - Hack
  - Health
  - Music
  - PM
    - KM
  - Swim
  - Vision
- Journal
- Knowledge
  - Content
  - People
  - Projects
- Notes
- Tags
- Tasks_2026.md
