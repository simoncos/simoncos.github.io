let motion: any;
if(window.__lowPowerMode || new URLSearchParams(location.search).get('pdf') === '1'){
  document.querySelectorAll<HTMLElement>('[data-anim]').forEach(el=>{el.style.opacity='1';el.style.transform='none'});
  document.querySelectorAll<HTMLElement>('[data-animate="pipeline"] [data-anim]').forEach(el=>el.style.opacity='1');
} else {
  try {
    motion = await import('./assets/motion.min.js');
  } catch(e1) {
    try {
      motion = await import('https://cdn.jsdelivr.net/npm/motion@11.11.17/+esm');
    } catch(e2) {
      console.warn('[motion] local + CDN both failed, disabling animations', e1, e2);
      document.querySelectorAll<HTMLElement>('[data-anim]').forEach(el=>{el.style.opacity='1';el.style.transform='none'});
      document.querySelectorAll<HTMLElement>('[data-animate="pipeline"] [data-anim]').forEach(el=>el.style.opacity='1');
    }
  }
}

if(motion){
  const { animate } = motion;
  document.body.classList.add('motion-ready');

  /* ============================================================
     IBM Carbon Motion · 每个 recipe 服务一种表达
     不是一刀切的 stagger,而是把动效绑在内容语义上
     ============================================================ */
  const EASE_PROD       = [.2, 0, .38, .9];
  const EASE_ENTRY_EXP  = [0, 0, .3, 1];

  const slides = [...document.querySelectorAll<HTMLElement>('.slide')];
  let lastIdx = -1;

  function resetAnims(slide){
    slide.querySelectorAll('[data-anim]').forEach(el=>{
      el.style.opacity='';
      el.style.transform='';
    });
    /* 同时复位需要被 recipe 接管的元素 */
    slide.querySelectorAll('.row-fill,.tl-node,.stack-block,.bar-tower,.sub-card,.col,.vrule,.kpi-cell')
      .forEach(el=>{el.style.cssText = el.dataset._origCss || el.style.cssText;});
  }

  /* ---------- 通用工具 ---------- */
  const fade = (el: Element, opts: any = {})=>animate(el,
    {opacity:[0,1], y:[opts.y ?? 12, 0]},
    {duration:opts.duration ?? .6, delay:opts.delay ?? 0,
     easing:opts.easing ?? EASE_ENTRY_EXP});

  /* ---------- recipe: hero · 封面索引 ----------
     大编号一个个亮起 → 索引行最后落定 */
  function rHero(slide, all){
    const numRows = [...slide.querySelectorAll('.cover-row')];
    const rest = all.filter(el=>!numRows.length || el !== numRows[0]);
    /* 先入: chrome 240ms */
    const chrome = slide.querySelector('.chrome-min');
    if(chrome) animate(chrome, {opacity:[0,1]}, {duration:.24, easing:EASE_PROD});
    /* 大编号 01/02/03 像点名一样依次亮 */
    numRows.forEach((row, i)=>{
      animate(row, {opacity:[0,1], x:[-12,0]},
        {duration:.5, delay:.15 + i*.18, easing:EASE_ENTRY_EXP});
    });
    /* 索引底栏最后慢慢落定 */
    const idx = slide.querySelector('[data-anim="line"]');
    if(idx) fade(idx, {delay:.15 + numRows.length*.18 + .1, duration:.5, y:6});
  }

  /* ---------- recipe: progression · 1× → 10× → 1000× ----------
     节点依次入场,每个节点的数字单独"递进生长"营造跃迁 */
  function rProgression(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});

    const nodes = [...slide.querySelectorAll('.tl-node')];
    nodes.forEach((node, i)=>{
      const base = .35 + i*.32;          /* 节点之间间隔大,营造时间感 */
      /* 整个节点先轻微浮入 */
      animate(node, {opacity:[0,1], y:[14, 0]},
        {duration:.55, delay:base, easing:EASE_ENTRY_EXP});
      /* 再让 multi(数字)从 .85 scale 弹到 1,延迟 100ms */
      const multi = node.querySelector('.multi');
      if(multi) animate(multi, {scale:[.92, 1], opacity:[0,1]},
        {duration:.5, delay:base + .12, easing:EASE_ENTRY_EXP});
    });

    /* 底部 KPI 4 列最后落定,内部 60ms stagger */
    const kpis = [...slide.querySelectorAll('.kpi-cell')];
    kpis.forEach((cell, i)=>{
      animate(cell, {opacity:[0,1], y:[8, 0]},
        {duration:.4, delay:1.4 + i*.07, easing:EASE_PROD});
    });
  }

  /* ---------- recipe: statement · 大宣言 ----------
     左半屏标题逐行落下,右半屏 leaked 信息晚 600ms 进 */
  function rStatement(slide, all){
    const halves = [...slide.querySelectorAll('.half')];
    if(halves.length === 2){
      animate(halves[0], {opacity:[0,1], y:[18,0]},
        {duration:.7, delay:0, easing:EASE_ENTRY_EXP});
      animate(halves[1], {opacity:[0,1], y:[18,0]},
        {duration:.7, delay:.6, easing:EASE_ENTRY_EXP});
    } else {
      /* P9 Index Card — 三行像盖章一样依次落 */
      const head = slide.querySelector('[data-anim="line"]');
      if(head) fade(head, {duration:.5, y:6});
      const blocks = all.filter(el=>el !== head);
      blocks.forEach((el, i)=>{
        animate(el, {opacity:[0,1], y:[20,0]},
          {duration:.55, delay:.25 + i*.18, easing:EASE_ENTRY_EXP});
      });
    }
  }

  /* ---------- recipe: grid-reveal · 五个定义 ----------
     卡片按 nb-corner 序号 01→02→03→04→05→Σ 依次揭示 */
  function rGridReveal(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});
    const cards = [...slide.querySelectorAll('.sub-card')];
    cards.forEach((card, i)=>{
      animate(card, {opacity:[0,1], y:[20,0], scale:[.96, 1]},
        {duration:.5, delay:.3 + i*.09, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: stack-build · 三层架构 ----------
     中间 thin 先入 → 上层 fat skills 从顶推下 → 下层 application 从底推上 */
  function rStackBuild(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});

    const blocks = [...slide.querySelectorAll('.stack-block')];
    /* 先入: 中间薄层(LAYER 02) */
    if(blocks[1]) animate(blocks[1], {opacity:[0,1], scaleY:[.85, 1]},
      {duration:.55, delay:.3, easing:EASE_ENTRY_EXP});
    /* 上推下: LAYER 01 fat skills 从顶部 push down */
    if(blocks[0]) animate(blocks[0], {opacity:[0,1], y:[-22, 0]},
      {duration:.6, delay:.6, easing:EASE_ENTRY_EXP});
    /* 下推上: LAYER 03 application 从底部 push up */
    if(blocks[2]) animate(blocks[2], {opacity:[0,1], y:[22, 0]},
      {duration:.6, delay:.6, easing:EASE_ENTRY_EXP});

    const foot = slide.querySelector('.t-meta');
    if(foot) animate(foot, {opacity:[0,1]}, {duration:.3, delay:1.3, easing:EASE_PROD});
  }

  /* ---------- recipe: measure-up ----------
     塔从底部 scaleY 0→1 生长 + 数字最后弹入 */
  function rMeasureUp(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});

    const towers = [...slide.querySelectorAll('.bar-tower')];
    towers.forEach((tower, i)=>{
      const block = tower.querySelector('.body-block');
      if(block){
        block.style.transformOrigin = 'bottom center';
        animate(block, {opacity:[0,1], scaleY:[.05, 1]},
          {duration:.7, delay:.35 + i*.12, easing:EASE_ENTRY_EXP});
      }
      /* cap (顶部图标) 等柱体长好后弹入 */
      const cap = tower.querySelector('.cap');
      if(cap) animate(cap, {opacity:[0,1], y:[-8, 0]},
        {duration:.4, delay:.85 + i*.12, easing:EASE_PROD});
    });
  }

  /* ---------- recipe: bar-grow ----------
     标题先入 → hairline 从中点向两侧 stroke draw → bar 依次 width 0→target → 数值 fade in */
  function rBarGrow(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});

    /* 中部 hairline:从 100% width 0 拉到 100% (transformOrigin: center) */
    const midRow = slide.querySelector('[data-anim="up"]');
    if(midRow){
      const midLabel = midRow.querySelector('.t-cat');
      const midLine = midRow.querySelector('div[style*="height:1px"]');
      if(midLabel) animate(midLabel, {opacity:[0,1], x:[-8,0]},
        {duration:.4, delay:.4, easing:EASE_PROD});
      if(midLine){
        midLine.style.transformOrigin = 'center';
        animate(midLine, {opacity:[0,1], scaleX:[0, 1]},
          {duration:.55, delay:.5, easing:EASE_ENTRY_EXP});
      }
    }

    /* bar 行依次 width 增长 */
    const fills = [...slide.querySelectorAll('.row-fill')];
    const labels = [...slide.querySelectorAll('.row-lbl')];
    const values = [...slide.querySelectorAll('.row-val')];
    fills.forEach((fill, i)=>{
      const target = fill.style.width;
      fill.style.width = '0%';
      if(labels[i]) animate(labels[i], {opacity:[0,1], x:[-12,0]},
        {duration:.4, delay:.85 + i*.14, easing:EASE_PROD});
      animate(fill, {width:['0%', target]},
        {duration:.65, delay:.95 + i*.14, easing:EASE_ENTRY_EXP});
      if(values[i]) animate(values[i], {opacity:[0,1]},
        {duration:.3, delay:1.5 + i*.14, easing:EASE_PROD});
    });
  }

  /* ---------- recipe: duo-mirror ----------
     左侧入场,vrule 从中心 scaleY 0→1,右侧入场 */
  function rDuoMirror(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.6, y:10});

    const cols = [...slide.querySelectorAll('.duo-compare .col')];
    const vrule = slide.querySelector('.duo-compare .vrule');
    if(cols[0]) animate(cols[0], {opacity:[0,1], x:[-24, 0]},
      {duration:.65, delay:.4, easing:EASE_ENTRY_EXP});
    if(vrule){
      vrule.style.transformOrigin = 'center';
      animate(vrule, {opacity:[0,1], scaleY:[0, 1]},
        {duration:.55, delay:.55, easing:EASE_ENTRY_EXP});
    }
    if(cols[1]) animate(cols[1], {opacity:[0,1], x:[24, 0]},
      {duration:.65, delay:.7, easing:EASE_ENTRY_EXP});

    const foot = slide.querySelector('.t-meta');
    if(foot) animate(foot, {opacity:[0,1]}, {duration:.3, delay:1.3, easing:EASE_PROD});
  }

  /* ---------- recipe: split-statement · 收尾 ----------
     左黑半屏的 once / forever 错位入场;右白半屏 takeaway list 后跟 */
  function rSplitStatement(slide, all){
    const halves = [...slide.querySelectorAll('.half')];
    /* 左黑半屏 — once 先入,forever 间隔 600ms */
    if(halves[0]){
      animate(halves[0], {opacity:[0,1]}, {duration:.4, easing:EASE_PROD});
      const kpis = halves[0].querySelectorAll('.kpi-thin');
      kpis.forEach((k, i)=>{
        animate(k, {opacity:[0,1], y:[24,0]},
          {duration:.7, delay:.25 + i*.55, easing:EASE_ENTRY_EXP});
      });
    }
    /* 右白半屏 — list 三条依次入,在左侧 once 出现后开始 */
    if(halves[1]){
      animate(halves[1], {opacity:[0,1]}, {duration:.4, delay:.3, easing:EASE_PROD});
      const items = halves[1].querySelectorAll('.takeaway-list li');
      items.forEach((li, i)=>{
        animate(li, {opacity:[0,1], x:[20, 0]},
          {duration:.45, delay:1.0 + i*.12, easing:EASE_ENTRY_EXP});
      });
    }
  }

  /* ---------- recipe: timeline-walk · P11 横向 evolution ----------
     标题先入 → 横轴虚线 scaleX 拉开(伪) → 5 个 dot 按年代依次 scale 入 → label 跟随 */
  function rTimelineWalk(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const tl = slide.querySelector('.timeline-h');
    if(tl) animate(tl, {opacity:[0,1]}, {duration:.4, delay:.35, easing:EASE_PROD});

    const nodes = [...slide.querySelectorAll('.timeline-h .th-node')];
    nodes.forEach((node, i)=>{
      const base = .55 + i*.18;
      const dot = node.querySelector('.dot');
      const label = node.querySelector('.label');
      if(dot){
        dot.style.transformOrigin='center';
        animate(dot, {opacity:[0,1], scale:[.2, 1]},
          {duration:.45, delay:base, easing:EASE_ENTRY_EXP});
      }
      if(label){
        const fromY = node.classList.contains('up') ? 8 : -8;
        /* 保留 CSS 的水平居中 translateX(-50%),避免动效覆盖后 label 与 dot 错位 */
        animate(label, {opacity:[0,1], transform:[`translate(-50%, ${fromY}px)`, 'translate(-50%, 0px)']},
          {duration:.5, delay:base + .12, easing:EASE_ENTRY_EXP});
      }
    });

    const foot = slide.querySelector('.t-meta');
    if(foot) animate(foot, {opacity:[0,1]}, {duration:.3, delay:1.7, easing:EASE_PROD});
  }

  /* ---------- recipe: manifesto · P12 Form & Found ----------
     副标先入 → 大字两段错峰落 → 底部 ink 通栏条从下推上 */
  function rManifesto(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head){
      const cat = head.querySelector('.t-cat');
      const title = head.querySelector('div:nth-child(2)');
      if(cat) animate(cat, {opacity:[0,1], x:[-10,0]},
        {duration:.4, delay:.1, easing:EASE_PROD});
      if(title) animate(title, {opacity:[0,1], y:[26, 0]},
        {duration:.85, delay:.3, easing:EASE_ENTRY_EXP});
    }
    /* 底部 ink 条从下推入 */
    const foot = [...slide.querySelectorAll('[data-anim="up"]')];
    foot.forEach((el, i)=>{
      animate(el, {opacity:[0,1], y:[40, 0]},
        {duration:.75, delay:.85 + i*.12, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: three-forces · P13 ----------
     左 ink hero 先入 → 右 3 张卡按 1/2/3 依次从右滑入 + 每张大数字单独弹入 */
  function rThreeForces(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.5, y:8});

    const grid = slide.querySelector('[data-anim="up"]');
    if(grid) animate(grid, {opacity:[0,1]}, {duration:.3, delay:.3, easing:EASE_PROD});

    const heroBlock = grid?.querySelector(':scope > div:first-child');
    if(heroBlock) animate(heroBlock, {opacity:[0,1], x:[-26, 0]},
      {duration:.6, delay:.4, easing:EASE_ENTRY_EXP});

    const cards = grid ? [...grid.querySelectorAll(':scope > div:nth-child(2) > .card-fill')] : [];
    cards.forEach((card, i)=>{
      const base = .6 + i*.18;
      animate(card, {opacity:[0,1], x:[28, 0]},
        {duration:.6, delay:base, easing:EASE_ENTRY_EXP});
      const num = card.querySelector(':scope > div:first-child');
      if(num) animate(num, {opacity:[0,1], scale:[.7, 1]},
        {duration:.5, delay:base + .15, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: loop-form · P14 自学闭环 ----------
     左 4 步像台阶依次入 → 右环图节点按时钟顺序入 → 中心 improves scale 入 */
  function rLoopForm(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const grid = slide.querySelector('[data-anim="up"]');
    if(grid) animate(grid, {opacity:[0,1]}, {duration:.3, delay:.35, easing:EASE_PROD});

    /* 左侧 4 步台阶,每步从左滑入 */
    const steps = grid ? [...grid.querySelectorAll(':scope > div:first-child > div')] : [];
    steps.forEach((step, i)=>{
      animate(step, {opacity:[0,1], x:[-18, 0]},
        {duration:.5, delay:.5 + i*.14, easing:EASE_ENTRY_EXP});
    });

    /* 右侧 SVG 节点 (4 个 circle + label) 按 01→04 顺序入 */
    const svg = grid?.querySelector('svg');
    if(svg){
      const ring = svg.querySelector('circle:first-of-type');
      if(ring) animate(ring, {opacity:[0,.25]}, {duration:.5, delay:.6, easing:EASE_PROD});

      const nodeCircles = [...svg.querySelectorAll('circle')].slice(1);
      nodeCircles.forEach((c, i)=>{
        c.style.transformOrigin = `${c.getAttribute('cx')}px ${c.getAttribute('cy')}px`;
        animate(c, {opacity:[0,1], scale:[.4, 1]},
          {duration:.45, delay:.7 + i*.16, easing:EASE_ENTRY_EXP});
      });

      const arrows = [...svg.querySelectorAll('path[marker-end]')];
      arrows.forEach((p, i)=>{
        animate(p, {opacity:[0,1]},
          {duration:.4, delay:.85 + i*.16, easing:EASE_PROD});
      });

      const center = [...svg.querySelectorAll('text')].slice(-2);
      center.forEach((t, i)=>{
        animate(t, {opacity:[0,1], scale:[.7, 1]},
          {duration:.5, delay:1.55 + i*.1, easing:EASE_ENTRY_EXP});
      });
    }
  }

  /* ---------- recipe: matrix-fill · P15 skill 矩阵 ----------
     标题入 → 12 张卡按对角线波 (i+j) 扫入 → 底部 20,000 大数字最后 fade 入 */
  function rMatrixFill(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const matrix = slide.querySelector('[data-anim="up"]');
    if(!matrix) return;
    animate(matrix, {opacity:[0,1]}, {duration:.3, delay:.35, easing:EASE_PROD});

    const cards = [...matrix.children];
    const cols = 6;
    cards.forEach((card, i)=>{
      const row = Math.floor(i/cols), col = i%cols;
      const wave = (row + col) * .055;
      animate(card, {opacity:[0,1], y:[14, 0], scale:[.92, 1]},
        {duration:.42, delay:.5 + wave, easing:EASE_ENTRY_EXP});
    });

    /* 底部 20,000 区块 */
    const foot = [...slide.querySelectorAll('[data-anim="up"]')][1];
    if(foot){
      animate(foot, {opacity:[0,1], y:[18, 0]},
        {duration:.7, delay:1.4, easing:EASE_ENTRY_EXP});
      const bigNum = foot.querySelector('div:nth-child(1) > div:nth-child(2)');
      if(bigNum) animate(bigNum, {opacity:[0,1], scale:[.94, 1]},
        {duration:.7, delay:1.55, easing:EASE_ENTRY_EXP});
    }
  }

  /* ---------- recipe: field-notes · P16 散点观察 ----------
     标题入 → 6 张卡按"散点"乱序延迟入,微小旋转复位 */
  function rFieldNotes(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const grid = slide.querySelector('[data-anim="up"]');
    if(!grid) return;
    animate(grid, {opacity:[0,1]}, {duration:.3, delay:.35, easing:EASE_PROD});

    /* 散点顺序: 用一个稍微打乱的索引数组,营造"乱中有序"感 */
    const order = [0, 3, 1, 4, 2, 5];
    const cards = [...grid.children];
    order.forEach((idx, i)=>{
      const card = cards[idx];
      if(!card) return;
      animate(card, {opacity:[0,1], y:[18, 0], rotate:[(idx%2?-.6:.6), 0]},
        {duration:.55, delay:.5 + i*.11, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: system-diagram · P17 三圆系统图 ----------
     标题入 → SVG 三组图依次入 + 中间同心圆从外向内 scale 入 → 下方注释列依次入 */
  function rSystemDiagram(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const stage = slide.querySelector('[data-anim="up"]');
    if(!stage) return;
    animate(stage, {opacity:[0,1]}, {duration:.3, delay:.35, easing:EASE_PROD});

    const svgs = [...stage.querySelectorAll('svg')];
    svgs.forEach((svg, i)=>{
      const base = .55 + i*.22;
      const circles = [...svg.querySelectorAll('circle')];
      /* 中间是同心圆: 从外圈到内圈依次 scale 入 */
      if(circles.length > 1){
        circles.forEach((c, j)=>{
          c.style.transformOrigin = `${c.getAttribute('cx')}px ${c.getAttribute('cy')}px`;
          animate(c, {opacity:[0,1], scale:[.4, 1]},
            {duration:.5, delay:base + j*.13, easing:EASE_ENTRY_EXP});
        });
      } else if(circles[0]){
        circles[0].style.transformOrigin = `${circles[0].getAttribute('cx')}px ${circles[0].getAttribute('cy')}px`;
        animate(circles[0], {opacity:[0,1], scale:[.4, 1]},
          {duration:.5, delay:base, easing:EASE_ENTRY_EXP});
      }
      const labels = [...svg.querySelectorAll('text')];
      labels.forEach((t, j)=>{
        animate(t, {opacity:[0,1]},
          {duration:.4, delay:base + .25 + j*.06, easing:EASE_PROD});
      });
    });

    /* 下方注释列 */
    const cols = [...stage.querySelectorAll(':scope > div:last-child > div')];
    cols.forEach((col, i)=>{
      animate(col, {opacity:[0,1], y:[12, 0]},
        {duration:.45, delay:1.3 + i*.1, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: why-now · P18 三列 + 巨大底数 ----------
     标题入 → 三列文本入 → 三个底部巨数 01/02/03 错峰 scale 落定 */
  function rWhyNow(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.55, y:10});

    const grid = slide.querySelector('[data-anim="up"]');
    if(!grid) return;
    animate(grid, {opacity:[0,1]}, {duration:.3, delay:.35, easing:EASE_PROD});

    const cols = [...grid.children];
    cols.forEach((col, i)=>{
      const base = .5 + i*.16;
      const body = col.querySelector(':scope > div:not(:last-child)');
      const big = col.querySelector(':scope > div:last-child');
      if(body) animate(body, {opacity:[0,1], y:[14, 0]},
        {duration:.55, delay:base, easing:EASE_ENTRY_EXP});
      if(big) animate(big, {opacity:[0,1], scale:[.7, 1]},
        {duration:.7, delay:base + .35, easing:EASE_ENTRY_EXP});
    });
  }

  /* ---------- recipe: four-cards · P19 4 列卡片 ----------
     顶部红线 scaleX 0→1 → 标题入 → 4 卡按 01-04 依次入 */
  function rFourCards(slide, all){
    /* 顶部红线 */
    const topRule = slide.querySelector('[data-anim="line"] > div:first-child');
    if(topRule){
      topRule.style.transformOrigin = 'left center';
      animate(topRule, {opacity:[0,1], scaleX:[0, 1]},
        {duration:.5, delay:.1, easing:EASE_ENTRY_EXP});
    }

    const head = slide.querySelector('[data-anim="line"]');
    if(head){
      const title = head.querySelector(':scope > div:nth-child(2)');
      if(title) animate(title, {opacity:[0,1], y:[14, 0]},
        {duration:.55, delay:.4, easing:EASE_ENTRY_EXP});
    }

    const grid = slide.querySelector('[data-anim="up"]');
    if(!grid) return;
    animate(grid, {opacity:[0,1]}, {duration:.3, delay:.55, easing:EASE_PROD});

    const cards = [...grid.children];
    cards.forEach((card, i)=>{
      animate(card, {opacity:[0,1], y:[18, 0]},
        {duration:.55, delay:.7 + i*.13, easing:EASE_ENTRY_EXP});
    });
  }

  /* ============ P20 · Stacked KPI Ledger · 4 行账单逐行点亮 + 行间发丝从左画 ============ */
  function rStackedLedger(slide, all){
    const ledger = slide.querySelector('[data-anim="ledger"]');
    if(!ledger) return;
    animate(ledger, {opacity:[0,1]}, {duration:.3, delay:.1, easing:EASE_PROD});

    const rows = [...ledger.querySelectorAll('.ledger-row')];
    rows.forEach((row, i)=>{
      const base = .25 + i*.18;
      const num   = row.querySelector('.ledger-num');
      const label = row.querySelector('.ledger-label');
      const icon  = row.querySelector('.ledger-icon');
      if(num)   animate(num,   {opacity:[0,1], y:[20, 0]},   {duration:.7,  delay:base,        easing:EASE_ENTRY_EXP});
      if(label) animate(label, {opacity:[0,1], x:[-12, 0]},  {duration:.55, delay:base + .12, easing:EASE_ENTRY_EXP});
      if(icon)  animate(icon,  {opacity:[0,1], scale:[.6,1]},{duration:.55, delay:base + .22, easing:EASE_ENTRY_EXP});
    });
  }

  /* ============ P21 · Tech Spec Sheet · 标题分行 / KPI 顶线画出 + count 风感 / 竖线弹起 / 底巨数 ============ */
  function rTechSpec(slide, all){
    const head = slide.querySelector('[data-anim="line"]');
    if(head) fade(head, {duration:.5, y:8});

    const main = slide.querySelector('[data-anim="up"]');
    if(main){
      animate(main, {opacity:[0,1]}, {duration:.3, delay:.25, easing:EASE_PROD});

      /* 左大标题分行 */
      const titleLines = main.querySelector(':scope > div:first-child > div:first-child');
      if(titleLines){
        animate(titleLines, {opacity:[0,1], y:[18, 0]}, {duration:.7, delay:.35, easing:EASE_ENTRY_EXP});
      }
      const titleNote = main.querySelector(':scope > div:first-child > div:nth-child(2)');
      if(titleNote){
        animate(titleNote, {opacity:[0,1], y:[10, 0]}, {duration:.5, delay:.95, easing:EASE_ENTRY_EXP});
      }

      /* 三 KPI · 顶线 scaleX + 数字 fade-up + 副文字 */
      const kpis = [...main.querySelectorAll(':scope > div:not([data-anim]):not(:first-child)')];
      kpis.forEach((kpi, i)=>{
        const base = .55 + i*.18;
        const topRule = kpi.querySelector(':scope > div:first-child');
        if(topRule){
          topRule.style.transformOrigin = 'left center';
          animate(topRule, {scaleX:[0,1], opacity:[0,1]}, {duration:.5, delay:base, easing:EASE_ENTRY_EXP});
        }
        const num = kpi.querySelector('.kpi-num');
        if(num) animate(num, {opacity:[0,1], y:[14, 0]}, {duration:.6, delay:base + .15, easing:EASE_ENTRY_EXP});
        const otherKids = [...kpi.children].filter(el=>el !== topRule && el !== num);
        otherKids.forEach((el, j)=>{
          animate(el, {opacity:[0,1]}, {duration:.4, delay:base + .25 + j*.05, easing:EASE_PROD});
        });
      });

    }

    /* 底部 hero 区: 巨数 + goal + tags + 右下竖线 */
    const hero = slide.querySelector('[data-anim="hero"]');
    if(hero){
      animate(hero, {opacity:[0,1]}, {duration:.3, delay:1.3, easing:EASE_PROD});
      const bottomHero = hero.querySelector('.bottom-hero');
      if(bottomHero) animate(bottomHero, {opacity:[0,1], y:[24, 0], scale:[.92, 1]}, {duration:.7, delay:1.4, easing:EASE_ENTRY_EXP});
      const middle = hero.querySelector(':scope > div:nth-child(2)');
      if(middle){
        const kids = [...middle.children];
        kids.forEach((el, i)=>{
          if(el.style && el.style.background === 'var(--ink)'){
            el.style.transformOrigin = 'left center';
            animate(el, {scaleX:[0,1], opacity:[0,1]}, {duration:.5, delay:1.6 + i*.1, easing:EASE_ENTRY_EXP});
          } else {
            animate(el, {opacity:[0,1], y:[10, 0]}, {duration:.5, delay:1.55 + i*.1, easing:EASE_ENTRY_EXP});
          }
        });
      }
      /* 右下: 文字先入, 9 根竖线再从底部 scaleY 弹起 */
      const right = hero.querySelector(':scope > div:nth-child(3)');
      if(right){
        const rightText = right.querySelector(':scope > div:last-child');
        if(rightText) animate(rightText, {opacity:[0,1], y:[10, 0]}, {duration:.5, delay:1.85, easing:EASE_ENTRY_EXP});
      }
      const bars = slide.querySelectorAll('[data-anim="bars"] .vbar');
      bars.forEach((bar, i)=>{
        bar.style.transformOrigin = 'bottom';
        animate(bar, {scaleY:[0,1], opacity:[0,1]}, {duration:.5, delay:2.0 + i*.04, easing:EASE_ENTRY_EXP});
      });
    }
  }

  /* ============ P22 · Image Hero · 图缓推 + 标题白块从左滑入 + 三 KPI 顶线画出 ============ */
  function rImageHero(slide, all){
    const img = slide.querySelector('[data-anim="img"] img');
    if(img){
      animate(img, {opacity:[0,1], scale:[1.06, 1]}, {duration:1.1, delay:.05, easing:EASE_ENTRY_EXP});
    }

    const titleBlock = slide.querySelector('[data-anim="title-block"]');
    if(titleBlock){
      titleBlock.style.transformOrigin = 'left center';
      animate(titleBlock, {opacity:[0,1], scaleX:[0, 1]}, {duration:.7, delay:.45, easing:EASE_ENTRY_EXP});
      const titleText = titleBlock.querySelector('div');
      if(titleText) animate(titleText, {opacity:[0,1]}, {duration:.4, delay:.85, easing:EASE_PROD});
    }

    const kpiWrap = slide.querySelector('[data-anim="kpi"]');
    if(kpiWrap){
      animate(kpiWrap, {opacity:[0,1]}, {duration:.3, delay:.7, easing:EASE_PROD});

      /* 段落 */
      const para = kpiWrap.querySelector(':scope > div:first-child');
      if(para) animate(para, {opacity:[0,1], y:[14, 0]}, {duration:.6, delay:.85, easing:EASE_ENTRY_EXP});

      /* 三列 KPI · 顶线 scaleX + 数字升起 */
      const cols = [...kpiWrap.querySelectorAll(':scope > div:nth-child(2) > div')];
      cols.forEach((col, i)=>{
        const base = 1.1 + i*.18;
        const topRule = col.querySelector(':scope > div:first-child');
        if(topRule){
          topRule.style.transformOrigin = 'left center';
          animate(topRule, {scaleX:[0,1], opacity:[0,1]}, {duration:.5, delay:base, easing:EASE_ENTRY_EXP});
        }
        const cat = col.querySelector('.t-meta');
        if(cat) animate(cat, {opacity:[0,1]}, {duration:.4, delay:base + .15, easing:EASE_PROD});
        const hero = col.querySelector('.kpi-hero');
        if(hero) animate(hero, {opacity:[0,1], y:[18, 0]}, {duration:.7, delay:base + .25, easing:EASE_ENTRY_EXP});
        const handled = new Set([topRule, cat, hero]);
        [...col.children]
          .filter(el => !handled.has(el))
          .forEach((el, j)=>{
            animate(el, {opacity:[0,1]}, {duration:.4, delay:base + .45 + j*.05, easing:EASE_PROD});
          });
      });
    }
  }

  const RECIPES = {
    'hero': rHero,
    'progression': rProgression,
    'statement': rStatement,
    'grid-reveal': rGridReveal,
    'stack-build': rStackBuild,
    'measure-up': rMeasureUp,
    'bar-grow': rBarGrow,
    'duo-mirror': rDuoMirror,
    'split-statement': rSplitStatement,
    'timeline-walk': rTimelineWalk,
    'manifesto': rManifesto,
    'three-forces': rThreeForces,
    'loop-form': rLoopForm,
    'matrix-fill': rMatrixFill,
    'field-notes': rFieldNotes,
    'system-diagram': rSystemDiagram,
    'why-now': rWhyNow,
    'four-cards': rFourCards,
    'stacked-ledger': rStackedLedger,
    'tech-spec': rTechSpec,
    'image-hero': rImageHero,
  };

  function revealStatic(slide){
    resetAnims(slide);
    document.getAnimations?.().forEach(a=>a.cancel());
    slide.querySelectorAll('[data-anim],.row-fill,.tl-node,.stack-block,.bar-tower,.sub-card,.col,.vrule,.kpi-cell,.card-fill,.card-accent,.card-ink')
      .forEach(el=>{
        el.style.opacity='1';
        el.style.transform='none';
      });
  }

  function playSlide(i){
    const slide = slides[i];
    if(!slide) return;
    lastIdx = i;

    if(window.__lowPowerMode){
      revealStatic(slide);
      return;
    }

    resetAnims(slide);

    /* 关键:[data-anim] 容器很多时候只是占位标记,真正的几何动画在子元素上.
       默认强制 reveal 所有 [data-anim] 容器, recipe 想做块入场时用 motion 的 {opacity:[0,1]} 会自动覆盖 */
    slide.querySelectorAll('[data-anim]').forEach(el=>{
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    const all = [...slide.querySelectorAll('[data-anim]')];
    const recipe = slide.dataset.animate;
    const fn = RECIPES[recipe];
    if(fn){ fn(slide, all); return; }

    /* fallback: 平凡 fade */
    if(all.length) animate(all, {opacity:[0,1], y:[12,0]},
      {duration:.6, delay:i=>i*.08, easing:EASE_ENTRY_EXP});
  }

  window.__playSlide = playSlide;
  window.__pipeAdvance = ()=>false;  /* 当前 deck 不用 pipeline recipe */

  playSlide(window.__currentSlideIndex || 0);
}
