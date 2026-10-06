# 辛普森悖论：旁白稿（草稿）

一段一行，对应画面里的一个节拍。配音后按每段音频的实际时长重排画面时间轴，字幕直接用这里的文字。
括号里是画面提示，不念。

| # | 画面 | 中文旁白 | English narration |
|---|---|---|---|
| 1 | 开场两行大字 | 每一组都赢了，加起来却输了。这是怎么回事？ | Win in every group, and still lose overall. How does that happen? |
| 2 | 标题 | 这就是辛普森悖论。 | This is Simpson's paradox. |
| 3 | 两个学院的录取率 | 假设一所学校招生，有 A、B 两个学院。在两个学院里，女生的录取率都比男生高：A 学院，百分之百对百分之九十；B 学院，百分之十对零。 | Picture a university with two schools, A and B. In both of them, women are admitted at a higher rate than men: in A, a hundred percent against ninety; in B, ten percent against zero. |
| 4 | 两组各 100 个点 | 现在，男女生各一百人来报名。 | Now a hundred women and a hundred men apply. |
| 5 | 点流向两个学院 | 但他们报的学院很不一样：女生十个报 A，九十个报 B；男生正好反过来，九十个报 A，十个报 B。 | But they apply to very different places. Ten women apply to A and ninety to B. The men are the other way round: ninety to A, ten to B. |
| 6 | A 学院逐个录取 | A 学院把十个女生全收了，九十个男生里收了八十一个。 | School A takes all ten women, and eighty-one of the ninety men. |
| 7 | B 学院逐个录取 | B 学院，九十个女生收了九个，男生一个没收。 | School B takes nine of the ninety women, and none of the men. |
| 8 | 被录取的点汇合 | 把两个学院加起来：女生一共录取十九人，男生八十一人。 | Add the two schools together: nineteen women admitted, and eighty-one men. |
| 9 | 19% < 81%，符号闪动 | 每个学院都是女生占优，整体却是男生大胜。 | Women come out ahead in every school, and yet men win overall by a mile. |
| 10 | 难度刻度 | 换个说法：报 A 学院像赌输赢，风险小；报 B 学院像猜比分，风险大。 | Think of it as betting on football. Applying to A is betting on who wins — low risk. Applying to B is guessing the exact score — high risk. |
| 11 | 两条括号 | 两个学院之间的难度差距，远远大过男女之间的差距。 | The gap between the two schools is far wider than any gap between women and men. |
| 12 | 圆圈按人数长大 | 女生更强，却大多选了难的那个；男生较弱，却大多选了容易的那个。更强也更冒险的女生大多落榜，较弱但更保守的男生，活下来更多。 | The women are stronger, but most of them chose the hard school. The men are weaker, but most chose the easy one. So the bold, stronger women mostly fall, and the cautious men mostly survive. |
| 13 | 平衡点滑到 19% 和 81% | 所以，整体录取率是按人数加权的平均数，会被人多的那一边拉过去。 | Each overall rate is an average weighted by head count, and it gets pulled toward wherever most people applied. |
| 14 | 公式 | 为什么这违背直觉？因为我们心里有一条逻辑：一个东西的每一部分都更大，它整体就更大。 | So why does this feel wrong? Because intuition carries a rule: if every part of one thing is bigger, the whole thing is bigger. |
| 15 | 加号和等号被圈出 | 可这条逻辑里的加号和等号，悄悄假设了可加性。 | But the plus signs and the equals sign in that rule quietly assume the parts can be added. |
| 16 | 100% + 10% ≠ 19% | 录取率不能这样相加。 | Admission rates don't add up like that. |
| 17 | 加权平均的两行 | 它们是按报考比例加权平均出来的。而报考，是另一组要素：选择。 | They are averages, weighted by the share who applied to each school. And where to apply is a second factor entirely: a choice. |
| 18 | 坐标轴 | 维基百科上还有一个几何的解释：横轴是报名人数，纵轴是录取人数。 | Wikipedia offers a geometric picture: applicants along the bottom, admissions up the side. |
| 19 | A 学院的两个向量 | 每个学院画成一个向量，斜率就是录取率。A 学院，女生的向量更陡。 | Each school becomes a vector whose slope is its admission rate. In A, the women's vector is steeper. |
| 20 | B 学院的两个向量 | B 学院，女生的依然更陡。 | In B, the women's is steeper too. |
| 21 | 两条总向量 | 可首尾相接之后，男生的总向量却陡得多。能相加的是向量，不是斜率。 | Yet joined end to end, the men's total is far steeper. Vectors add; slopes don't. |
| 22 | 收尾 | 在形式化之前，我们很难看见可加性这个隐含的前提。 | Until we write it down, the hidden premise of additivity is very hard to see. |
| 23 | 金句 | 数字不会说谎，只会被算错。 | Numbers don't lie. They only get miscalculated. |
| 24 | 片尾 | 全文在 simoncos.github.io。 | The full essay is at simoncos.github.io. |

中文约 760 字，按每秒 4.5 字左右，大约 2 分 50 秒；英文约 2 分 40 秒。比现在的无声版长 15 秒左右，画面节拍会跟着旁白重排。
