# 九篇英文译文审查 · 2026-09-29

审查基线：`master@25f826e873bd8c6530984e2ef9211ec76b7ab24b`；本地缓存的 `origin/master` 与 HEAD 相同，本轮没有 fetch。完整对照九篇当前站内中文稿和英文稿，并核查生成 HTML 的语言切换、站内目标、图片与元数据。没有改写任何文章、重新生成页面、提交或发布。

结论：整体忠实且可读，不需要整批重译。原文的口语、括号里的自嘲、游戏笑话、重复句式和大部分意象都保留了下来。优先修正两处语义偏移，并消除第三篇标题的术语歧义。其余建议属于局部润色，不能与误译混为一谈。

## 优先处理

### 1. “共享先验知识”被改成了“都知道先验知识存在”

位置：`blogs/problem-solving-and-design-3-open-problems.en.md:39`；中文对应第 38 行。

- 中文：“需要建立在与问题解决者对这些已有先验知识存在的共识之上”。下一句说明这种共识等于使用隐含条件。
- 英文：`depend on a shared understanding with the solver that this prior knowledge exists`。
- 问题：论证需要的是提问者与解题者共享或默认同样的知识内容，英文却把共识的对象换成了“这种知识存在”这一事实。双方都知道某种知识存在，并不意味着默认了相同的前提，因而削弱了下一句推论的联系。
- 建议局部替换为：`depend on the person posing the problem and the solver sharing the same prior knowledge`。若要更突出交流时的默认，可用 `depend on the assumption that the person posing the problem and the solver share the same prior knowledge`。

### 2. “空荡荡的水面”不应直接变成“空池塘”

位置：`blogs/ten-years-like-rain.en.md:49`；中文对应第 48 行。

- 中文：“只看到空荡荡的水面，从池里跳出池外的水”。
- 英文：`saw only an empty pond, and the water that had leapt out of it`。
- 问题：`an empty pond` 自然会让人理解为池塘已经没有水；中文仍然明确写到“水面”，没有明确断言池水全部震空。译文增加了一个具体的灾后现场事实。
- 建议保留“水面”，例如 `saw only a bare surface of water, and water that had leapt out of the pond`。如果作者原意确实是池水已经完全震空，则应先确认这点，而不是由译者补定。

### 3. 标题 Open Problems 容易引向“未解难题”

位置：`blogs/problem-solving-and-design-3-open-problems.en.md:11`，以及第 6、15、25、27、43、47 行和第四篇第 112 行的相关用语。

这篇正文所定义的“开放”，是条件不完备、可选行动广、可能性空间会变化；不是某道公认的研究难题尚未得到解答。英文技术语境中的 `open problem` 容易让读者先想到后者。

建议标题改为 **Problem Solving and Design (3): Open-Ended Problems**，全文相关用词同步；首次定义可以说明：`problems whose constraints are incomplete and whose space of possibilities can change`。这是结合正文含义给出的术语建议，并非宣称原译在任何语境都错误。

用法依据：MIT 的 [Open-Problem Sessions](https://ocw.mit.edu/courses/6-849-geometric-folding-algorithms-linkages-origami-polyhedra-fall-2012/pages/instructor-insights/open-problem-sessions-and-collaboration/) 将 open problems 用于尚无人知道答案的研究问题；Illinois 的 [Problem Identification](https://publish.illinois.edu/siipcompendium/2021/08/19/problem-identification-recognition/) 在工程设计与问题界定语境中使用 open-ended 和 ill-defined。以上来源支持术语差异；采用哪个词是针对本文的编辑判断。

若采纳，不必改动稳定的文件 slug，只需改标题、描述、正文和站点系列简介，再通过现有生成器更新派生内容。

## 可选的局部润色

| 位置 | 当前措辞 | 建议与理由 |
|---|---|---|
| `a-bulbuls-first-100-days.en.md:44`，中文第 43、47 行 | `a stay-at-home dad (an intern one?)` | “奶爸（实习？）”没有“不工作的全职父亲”这一信息，下一段还写了上班。可改为 `a dad (in training?)` 或 `a rookie dad`；第 48 行的 `at the computer` 可恢复成 `working at my computer`。这是对叙述者身份的轻微过译。 |
| `a-bulbuls-first-100-days.en.md:13` | `Since I brought ... before I knew it today has become ...` | since、before I knew it、today has become 叠在一起，开篇明显拗口。可直接以 `Today marks the little bulbul's hundredth day with us` 起句，再接回带回家的那个周六；不需要改变流水日记的口吻。 |
| `problem-solving-and-design-3-open-problems.en.md:35`、`:37`，第四篇 `:112` | `keep the big, drop the small` | 英文裸用 big/small 容易像大小筛选。这里强调因素的重要性，建议 `focus on what matters and set aside minor details`。正文后续的速度量级例子可保留。 |
| `problem-solving-and-design-4-choice-and-optima.en.md:74` | `model of decision` | `decision model` 更自然，也与“决策模型”同义。中文原稿括号里本就写了 Model of Decision，因此这是英语表达优化，不是把原文错误归咎于译者。 |

《我的手》开头 `Do you feel heavy` 略直译，可能让英语读者先想到身体重量；如果作者希望明确写心理负担，可考虑 `Are you weighed down`。但中文“你沉重吗”本身保留了歧义，诗歌不必被解释成单一含义，因此不列为必改。`let your good dreams stay the night` 和 `steams the morning light soft` 保留了原诗的陌生感，也不应仅因不日常而抹平。

## 全文覆盖与不重复报告的事项

| 文章 | 本轮结论 |
|---|---|
| 十年如雨 | 叙事、反复出现的“通讯断绝”和结尾雨/泪意象完整；处理上面的池塘句。 |
| 谢谢你曾来避雨 | 未发现需优先修正的语义问题；相遇、善意传递和放手的叙事连接完整。 |
| 问题解析的极限 | 未发现实质漏译或论证方向改变；黑箱、模块化和分析边界相互对应。 |
| 问题解决与设计（一） | 未发现影响主要论证的翻译错误；问题情境、信息与搜索路径的关系保留。 |
| 问题解决与设计（二） | 六个问题、资源/方法区分和定势/功能固着的推进完整。 |
| 问题解决与设计（三） | 重点处理共享先验知识的句子与 open problems 术语；逻辑公式与中文一致。 |
| 问题解决与设计（四） | 用户已认可的数值/符号修正均同步；其余论证忠于当前中文稿。 |
| 小白头翁的100天 | 22 个日记小节和 22 个图片位置一致；it 到 he 的切换与中文确认性别的时点一致；可润色开头及“奶爸”。 |
| 我的手 | 作者自己的诗逐行对应，意象与诗行顺序完整；附录采取链接原诗的处理，见下。 |

《谢谢你曾来避雨》的歌词改成概述、《我的手》附录没有译出海子原诗，是既有交接文档明确记录的编辑处理，英文也交代了附诗未译。本轮将其与意外漏译区分；因此“九篇双语”不等于歌词和附诗均逐字对译。未重新作版权判断，也没有补译这些引用。

第三、四篇某些论点本身是否成立，是原文内容审稿问题。例如“没有完整性便根本不存在最优解”在中英两版都如此，并非英文自行添加。本轮不借翻译审查重写原文理论。

此前已经修正的电车人数、101 的数值、模型 3 的 x2·x3、“圆心”“年初的雪灾”“明年春夏”等，中英文同步，本轮不重复报错。

## 结构核验与边界

- 九对文件的 date、updated、written、tags、series、series_part 均匹配。
- 中英文图片 URL 与顺序一致（共 32 个位置，含 7 张 GIF）；这不是本轮重新验证远程图片加载的证据。
- 九篇英文生成页面的语言按钮均指向正确中文同篇；文内英文站内文章链接目标存在。附诗链接到中文是已声明的例外。
- 章节结构匹配；未发现意外缺章。元数据、正文、标题、图注均纳入对照。
- 本轮直接运行 `scripts/check_site.py`，检查通过；两份百日记录各有 7 张 R2 动图的提示是已知资源依赖，不是失败。没有重新跑构建或浏览器视觉 QA，也没有把既往的上线记录当作本轮线上验证。
- 文章未改动；只新增本审查文档。原有未跟踪 ZIP 保留。

收尾时工作区另外出现 `generate_blog_pages.py` 与 `scripts/localize_images.py` 的并行修改。本轮未触碰或审查这两处新改动，也未为其重新跑检查；本文的译文结论仍针对上述提交中的九对文章。
