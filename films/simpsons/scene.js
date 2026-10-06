// 辛普森悖论与直觉的缺陷 / Simpson's Paradox and the Flaws of Intuition
// 1920×1080, about 2.5 minutes. Two hundred dots carry the article's example:
// they apply, get admitted or not, add up, and then the film explains why.
(function () {
  const F = Film;
  const { ep, env, prog, lerp, clamp, ease } = F;
  const L = F.lang;
  const W = 1920, H = 1080, DURATION = 158;

  const BG = '#0b0b0c', INK = '#f2f2ef', DIM = '#8c8c88', FAINT = '#3a3a38', LINE = '#262624';
  const CW = '#FFD166';   // women
  const CM = '#5B7BFF';   // men

  const S = (zh, en) => (L === 'en' ? en : zh);

  // ---- captions -------------------------------------------------------
  const CAPTIONS = [
    [13.5, 18.5, '一所学校招生，有 A、B 两个学院。', 'A university admits students to two schools, A and B.'],
    [18.5, 23.5, '在两个学院里，女生的录取率都比男生高。', 'In both schools, women are admitted at a higher rate than men.'],
    [23.5, 28.5, '现在，男女生各 100 人报名。', 'Now 100 women and 100 men apply.'],
    [28.5, 34, '但他们报的学院很不一样。', 'But they apply to very different schools.'],
    [34, 40, '女生 10 人报 A，90 人报 B；男生 90 人报 A，10 人报 B。', '10 women apply to A and 90 to B; 90 men apply to A and 10 to B.'],
    [40.5, 46, 'A 学院：女生录取 100%，男生录取 90%。', 'School A admits 100% of the women and 90% of the men.'],
    [46, 51.5, 'B 学院：女生录取 10%，男生一个不收。', 'School B admits 10% of the women and none of the men.'],
    [52, 58, '把两个学院加起来——', 'Now add the two schools together.'],
    [58, 65.5, '女生共录取 19 人，男生共录取 81 人。', '19 women are admitted, and 81 men.'],
    [65.5, 71, '每个学院都是女生更高，整体却是男生大胜。这是怎么回事？', 'Women do better in every school, yet men win overall. How?'],
    [71.5, 77, '报 A 像赌输赢，风险小；报 B 像猜比分，风险大。', 'Applying to A is like betting on who wins; applying to B, on the exact score.'],
    [77, 82.5, '两个学院之间的难度差距，远远大过男女之间的差距。', 'The gap between the schools is far wider than the gap between women and men.'],
    [82.5, 88, '可女生大多报了难的 B，男生大多报了容易的 A。', 'Yet most women chose the hard school, and most men the easy one.'],
    [88, 94.5, '整体录取率按人数加权，被人多的那一边拉了过去。', 'Each overall rate is a weighted average, pulled toward where most people applied.'],
    [95.5, 100.5, '直觉里藏着一条逻辑：各部分都更大，整体就更大。', 'Intuition carries a rule: if every part is bigger, the whole is bigger.'],
    [100.5, 106, '问题出在“+”和“=”上：它们默认了可加性。', 'The trouble is the “+” and the “=”: they assume additivity.'],
    [106, 111.5, '可录取率不能这样相加。', 'Admission rates do not add up like that.'],
    [111.5, 117, '它们按报考人数加权平均。报考，是另一组要素：选择。', 'They average, weighted by who applies where. And where to apply is a choice.'],
    [117.5, 122.5, '换成几何来看：横轴是报名人数，纵轴是录取人数。', 'Geometrically: applicants along the bottom, admissions up the side.'],
    [122.5, 128, '每个学院是一个向量，斜率就是录取率。A 学院，女生更陡。', 'Each school is a vector whose slope is its admission rate. In A, the women’s is steeper.'],
    [128, 133, 'B 学院，女生依然更陡。', 'In B, the women’s is steeper too.'],
    [133, 139.5, '首尾相接，男生的总向量却陡得多：能相加的是向量，不是斜率。', 'Joined end to end, the men’s total is far steeper. Vectors add; slopes do not.'],
    [140, 145, '在形式化之前，我们很难看见可加性这个隐含前提。', 'Until we write it down, the hidden premise of additivity is hard to see.'],
  ];

  function captions(ctx, t) {
    for (const [a, b, zh, en] of CAPTIONS) {
      const o = env(t, a, b, 0.35, 0.35);
      if (o <= 0) continue;
      F.text(ctx, S(zh, en), W / 2, 1000, {
        size: L === 'en' ? 38 : 40, weight: 500, align: 'center', alpha: o, color: INK, maxWidth: 1500, valign: 'bottom', lineHeight: 1.35,
      });
    }
  }

  // ---- the two hundred dots --------------------------------------------
  const rnd = F.rng(20180327);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = n => Array.from({ length: n }, (_, i) => i);

  const dots = [];
  // Women: 10 to A (all admitted), 90 to B (9 admitted).
  // Men: 90 to A (81 admitted), 10 to B (none).
  const plan = { W: { A: [10, 10], B: [90, 9] }, M: { A: [90, 81], B: [10, 0] } };
  for (const g of ['W', 'M']) {
    const order = shuffle(range(100));
    let k = 0;
    for (const c of ['A', 'B']) {
      const [n, admitted] = plan[g][c];
      const admit = new Set(shuffle(range(n)).slice(0, admitted));
      for (let ci = 0; ci < n; ci++) {
        dots.push({ g, idx: order[k++], c, ci, n, admitted: admit.has(ci), r: rnd(), sx: rnd(), sy: rnd() });
      }
    }
  }
  // Decision times: A sweeps 41.0–45.5, B sweeps 46.5–51.
  const SWEEP = { A: { W: [41.0, 41.9], M: [42.0, 45.5] }, B: { W: [46.5, 50.0], M: [50.1, 51.0] } };
  for (const d of dots) {
    const [a, b] = SWEEP[d.c][d.g];
    d.td = a + (b - a) * (d.ci / Math.max(1, d.n - 1));
  }
  // Total slots: admitted dots fill a 10×10 grid per group, in decision order.
  for (const g of ['W', 'M']) {
    dots.filter(d => d.g === g && d.admitted).sort((p, q) => p.td - q.td).forEach((d, i) => {
      d.ti = i;
      d.tArrive = 56.2 + i * (g === 'W' ? 0.16 : 0.045) + (g === 'M' ? 0.3 : 0);
    });
  }

  const XA = 560, XB = 1360;
  const grid = (cx, top, i, gap) => [cx - 4.5 * gap + (i % 10) * gap, top + Math.floor(i / 10) * gap];

  function posScatter(d, t) {
    return [80 + d.sx * (W - 160) + F.noise(t * 0.15, d.r * 100) * 40, 80 + d.sy * (H - 220) + F.noise(t * 0.15 + 9, d.r * 100) * 40];
  }
  const posPool = d => grid(d.g === 'W' ? 740 : 1180, 430, d.idx, 32);
  const posCol = d => grid((d.c === 'A' ? XA : XB) + (d.g === 'W' ? -170 : 170), 420, d.ci, 30);
  const posTotal = d => grid(d.g === 'W' ? 700 : 1220, 640, d.ti, 25);

  function dotPos(d, t) {
    let p = posScatter(d, t);
    const t1 = 14 + d.r * 2.5;
    p = mix(p, posPool(d), ep(t, t1, t1 + 2.6));
    const t2 = 29 + d.r * 2.6 + (d.g === 'M' ? 0.4 : 0);
    p = mix(p, posCol(d), ep(t, t2, t2 + 2.2));
    if (d.admitted) p = mix(p, posTotal(d), ep(t, d.tArrive - 1.2, d.tArrive));
    return p;
  }
  const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

  function drawDots(ctx, t) {
    const fadeAll = 1 - ep(t, 70.5, 72);
    if (fadeAll <= 0) return;
    // Bring in from the title.
    const appear = ep(t, 5.5, 8.5);
    for (const d of dots) {
      const [x, y] = dotPos(d, t);
      const color = d.g === 'W' ? CW : CM;
      let a = 0.55 * appear, r = 10, filled = true, glow = 0;
      if (t < 14) a *= 0.6;                      // drifting behind the title
      if (t >= d.td) {
        const k = ep(t, d.td, d.td + 0.35, ease.out);
        if (d.admitted) {
          a = lerp(0.55, 1, k);
          r = 10 + 4 * Math.sin(Math.PI * k);
          glow = k;
        } else {
          a = lerp(0.55, 0.32, k);
          filled = k < 0.5;
        }
      }
      if (!d.admitted && t > 55) a *= 1 - ep(t, 55, 57);
      if (d.admitted && t > d.tArrive - 1.2) r = lerp(10, 8.5, ep(t, d.tArrive - 1.2, d.tArrive));
      a *= fadeAll;
      if (a <= 0.003) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (filled) {
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 14 * glow; }
        ctx.fillStyle = color; ctx.fill();
      } else {
        ctx.lineWidth = 1.6; ctx.strokeStyle = color; ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---- scene pieces ----------------------------------------------------
  function hook(ctx, t) {
    const a1 = env(t, 0.6, 6.4, 0.6, 0.6), a2 = env(t, 2.1, 6.4, 0.6, 0.6);
    const lift = k => (1 - ease.out(k)) * 16;
    F.text(ctx, S('每一组都赢了，', 'Win in every group,'), W / 2, 500 + lift(prog(t, 0.6, 1.4)), { size: 76, weight: 700, align: 'center', alpha: a1 });
    F.text(ctx, S('加起来却输了。', 'and still lose overall.'), W / 2, 610 + lift(prog(t, 2.1, 2.9)), { size: 76, weight: 700, align: 'center', alpha: a2, color: CW });
  }

  function title(ctx, t) {
    const a = env(t, 6.6, 13.4, 0.8, 0.8);
    if (!a) return;
    F.text(ctx, S('文章 · 2018', 'Essay · 2018'), W / 2, 400, { size: 26, weight: 500, align: 'center', alpha: a, color: DIM, spacing: 4 });
    F.text(ctx, S('辛普森悖论', 'Simpson’s Paradox'), W / 2, 540, { size: 128, weight: 800, align: 'center', alpha: a });
    F.text(ctx, S('与直觉的缺陷', 'and the Flaws of Intuition'), W / 2, 625, { size: 50, weight: 400, align: 'center', alpha: a, color: DIM });
  }

  // "100%  >  90%" with group colors; returns nothing.
  function compare(ctx, cx, y, left, sign, right, o) {
    const size = o.size || 56;
    const gap = size * 0.55;
    const wl = F.measure(ctx, left, { size, weight: 700 });
    const ws = F.measure(ctx, sign, { size, weight: 500 });
    const wr = F.measure(ctx, right, { size, weight: 700 });
    const total = wl + ws + wr + gap * 2;
    let x = cx - total / 2;
    F.text(ctx, left, x, y, { size, weight: 700, color: CW, alpha: o.alpha });
    x += wl + gap;
    F.text(ctx, sign, x, y, { size, weight: 500, color: o.signColor || INK, alpha: o.alpha * (o.signAlpha ?? 1) });
    if (o.pulse) {
      ctx.save();
      ctx.globalAlpha = o.alpha * o.pulse;
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + ws / 2, y - size * 0.34, size * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    x += ws + gap;
    F.text(ctx, right, x, y, { size, weight: 700, color: CM, alpha: o.alpha });
    if (o.labels) {
      F.text(ctx, S('女', 'women'), cx - total / 2 + wl / 2, y + 36, { size: 22, align: 'center', color: DIM, alpha: o.alpha });
      F.text(ctx, S('男', 'men'), cx + total / 2 - wr / 2, y + 36, { size: 22, align: 'center', color: DIM, alpha: o.alpha });
    }
  }

  function pulseAt(t) { return t > 66 && t < 71 ? 0.5 + 0.5 * Math.sin((t - 66) * Math.PI * 1.6 - Math.PI / 2) : 0; }

  function headers(ctx, t) {
    const a = env(t, 13.4, 72, 0.7, 1.2);
    if (!a) return;
    for (const [c, x, l, r, t0] of [['A', XA, '100%', '90%', 13.6], ['B', XB, '10%', '0%', 14.4]]) {
      const k = ep(t, t0, t0 + 0.8);
      const ak = a * k;
      F.text(ctx, S(`${c} 学院`, `School ${c}`), x, 140 + (1 - k) * 12, { size: 40, weight: 700, align: 'center', alpha: ak });
      const sk = ep(t, 18.6 + (c === 'B' ? 0.6 : 0), 19.6 + (c === 'B' ? 0.6 : 0));
      compare(ctx, x, 222, l, '>', r, { size: 54, alpha: ak, signAlpha: sk, labels: true, pulse: pulseAt(t) });
    }
    // divider between the schools
    ctx.save();
    ctx.globalAlpha = a * 0.8 * ep(t, 14, 15);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 110); ctx.lineTo(W / 2, 600); ctx.stroke();
    ctx.restore();
  }

  function poolLabels(ctx, t) {
    const a = env(t, 22, 30, 0.6, 0.8);
    if (!a) return;
    F.text(ctx, S('女生 100 人', '100 women'), 740, 395, { size: 28, weight: 600, align: 'center', color: CW, alpha: a });
    F.text(ctx, S('男生 100 人', '100 men'), 1180, 395, { size: 28, weight: 600, align: 'center', color: CM, alpha: a });
  }

  function clusterLabels(ctx, t) {
    const a = env(t, 33.5, 57, 0.6, 1.2);
    if (!a) return;
    for (const c of ['A', 'B']) for (const g of ['W', 'M']) {
      const [n, admitted] = plan[g][c];
      const x = (c === 'A' ? XA : XB) + (g === 'W' ? -170 : 170);
      const [s0, s1] = SWEEP[c][g];
      const done = dots.filter(d => d.c === c && d.g === g && d.admitted && t >= d.td).length;
      const label = t < s0 - 0.6
        ? S(`${n} 人`, `${n} ${g === 'W' ? 'women' : 'men'}`)
        : S(`录取 ${done}/${n}`, `${done} of ${n} in`);
      F.text(ctx, label, x, 386, { size: 26, weight: 600, align: 'center', color: g === 'W' ? CW : CM, alpha: a });
    }
  }

  function totals(ctx, t) {
    const a = env(t, 55.5, 72, 0.8, 1.2);
    if (!a) return;
    // empty slots: 100 per group
    for (const [g, cx] of [['W', 700], ['M', 1220]]) {
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = FAINT; ctx.lineWidth = 1.4;
      for (let i = 0; i < 100; i++) {
        const [x, y] = grid(cx, 640, i, 25);
        ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      const n = dots.filter(d => d.g === g && d.admitted && t >= d.tArrive).length;
      const color = g === 'W' ? CW : CM;
      const big = `${n}%`;
      if (g === 'W') {
        F.text(ctx, big, 520, 790, { size: 104, weight: 800, align: 'right', color, alpha: a });
        F.text(ctx, S(`女生整体 · ${n}/100`, `women overall · ${n}/100`), 520, 836, { size: 24, align: 'right', color: DIM, alpha: a });
      } else {
        F.text(ctx, big, 1400, 790, { size: 104, weight: 800, align: 'left', color, alpha: a });
        F.text(ctx, S(`男生整体 · ${n}/100`, `men overall · ${n}/100`), 1400, 836, { size: 24, align: 'left', color: DIM, alpha: a });
      }
    }
    const sk = ep(t, 61.5, 62.4, ease.back);
    const pulse = pulseAt(t);
    F.text(ctx, '<', W / 2, 790, { size: 104 * (0.6 + 0.4 * sk), weight: 500, align: 'center', alpha: a * prog(t, 61.5, 61.9) });
    if (pulse) {
      ctx.save(); ctx.globalAlpha = a * pulse; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(W / 2, 755, 66, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  // Rates as heights; each school a circle sized by its applicants.
  function balance(ctx, t) {
    const a = env(t, 72, 95.5, 0.9, 1);
    if (!a) return;
    const y = r => 860 - r * 6;
    const XW = 760, XM = 1160;
    ctx.save();
    ctx.globalAlpha = a;
    // axis
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.5;
    for (const r of [0, 25, 50, 75, 100]) {
      ctx.beginPath(); ctx.moveTo(560, y(r)); ctx.lineTo(1340, y(r)); ctx.stroke();
      F.text(ctx, `${r}%`, 540, y(r) + 8, { size: 22, align: 'right', color: DIM });
    }
    F.text(ctx, S('录取率', 'admission rate'), 540, 214, { size: 22, align: 'right', color: DIM });
    // rods
    for (const [x, g] of [[XW, 'W'], [XM, 'M']]) {
      ctx.strokeStyle = g === 'W' ? F.rgba(CW, 0.35) : F.rgba(CM, 0.35); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y(0)); ctx.lineTo(x, y(100)); ctx.stroke();
      F.text(ctx, S(g === 'W' ? '女生' : '男生', g === 'W' ? 'women' : 'men'), x, 912, { size: 28, weight: 600, align: 'center', color: g === 'W' ? CW : CM });
    }
    ctx.restore();

    const pts = [
      ['W', 'A', XW, 100, 10], ['W', 'B', XW, 10, 90],
      ['M', 'A', XM, 90, 90], ['M', 'B', XM, 0, 10],
    ];
    // same-school links
    const lk = ep(t, 74, 75.5);
    for (const c of ['A', 'B']) {
      const [p, q] = pts.filter(p => p[1] === c);
      ctx.save();
      ctx.globalAlpha = a * lk * 0.7;
      ctx.setLineDash([6, 8]); ctx.strokeStyle = DIM; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p[2], y(p[3])); ctx.lineTo(lerp(p[2], q[2], lk), lerp(y(p[3]), y(q[3]), lk)); ctx.stroke();
      ctx.restore();
      F.text(ctx, S(`${c} 学院`, `School ${c}`), (p[2] + q[2]) / 2, (y(p[3]) + y(q[3])) / 2 - 18, { size: 24, weight: 600, align: 'center', color: DIM, alpha: a * lk });
    }
    const grow = ep(t, 82.5, 84.5);
    for (const [g, c, x, r, n] of pts) {
      const color = g === 'W' ? CW : CM;
      const k = ep(t, 72.4 + (c === 'B' ? 0.5 : 0) + (g === 'M' ? 0.25 : 0), 73.6 + (c === 'B' ? 0.5 : 0) + (g === 'M' ? 0.25 : 0), ease.back);
      const rad = lerp(9, 7 * Math.sqrt(n), grow) * k;
      ctx.save();
      ctx.globalAlpha = a * (0.25 + 0.15 * grow);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y(r), rad, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      const side = g === 'W' ? -1 : 1;
      F.text(ctx, `${c} · ${r}%`, x + side * (Math.max(rad, 9) + 18), y(r) + 9, { size: 26, weight: 600, align: side < 0 ? 'right' : 'left', color, alpha: a * k });
      F.text(ctx, S(`${n} 人报名`, `${n} applied`), x + side * (Math.max(rad, 9) + 18), y(r) + 40, { size: 20, align: side < 0 ? 'right' : 'left', color: DIM, alpha: a * grow });
    }
    // brackets: gap between sexes (10) and between schools (80+)
    const bk = ep(t, 77.4, 78.6);
    const bracket = (x, y1, y2, label, k) => {
      ctx.save();
      ctx.globalAlpha = a * k;
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 10, y1); ctx.lineTo(x, y1); ctx.lineTo(x, y2); ctx.lineTo(x - 10, y2); ctx.stroke();
      ctx.restore();
      F.text(ctx, label, x + 22, (y1 + y2) / 2 + 9, { size: 26, weight: 600, alpha: a * k });
    };
    bracket(1420, y(100), y(90), S('男女之差：10 个百分点', 'women vs men: 10 points'), bk);
    bracket(1420, y(90), y(10), S('学院之差：80 多个百分点', 'school vs school: 80+ points'), ep(t, 79, 80.2));

    // balance points slide to the weighted averages
    const mk = ep(t, 88.6, 92.2);
    const vis = ep(t, 88, 88.6);
    for (const [x, g, from, to] of [[XW, 'W', 55, 19], [XM, 'M', 45, 81]]) {
      const color = g === 'W' ? CW : CM;
      const yy = y(lerp(from, to, mk));
      ctx.save();
      ctx.globalAlpha = a * vis;
      ctx.fillStyle = INK;
      ctx.beginPath();
      const s = g === 'W' ? 1 : -1;   // markers face the middle
      ctx.moveTo(x + s * 12, yy); ctx.lineTo(x + s * 36, yy - 13); ctx.lineTo(x + s * 36, yy + 13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 26, yy); ctx.lineTo(x + 26, yy); ctx.stroke();
      ctx.restore();
      F.text(ctx, `${Math.round(lerp(from, to, mk))}%`, x + s * 50, yy + 14, { size: 40, weight: 800, align: s < 0 ? 'right' : 'left', color, alpha: a * vis });
    }
  }

  // Formula pieces: tokens [{t, sub, color, hl}] drawn at one baseline.
  function tokens(ctx, list, cx, y, size, alpha, hl = 0) {
    const sub = size * 0.58;
    const widths = list.map(tok => F.measure(ctx, tok.t, { size, weight: 500, family: tok.family || F.MONO }) + (tok.sub ? F.measure(ctx, tok.sub, { size: sub, weight: 500, family: F.MONO }) : 0) + (tok.pad ?? size * 0.28));
    let x = cx - widths.reduce((s, w) => s + w, 0) / 2;
    list.forEach((tok, i) => {
      const color = tok.hl && hl > 0.3 ? CW : tok.color || INK;
      if (tok.hl && hl) {
        ctx.save();
        ctx.globalAlpha = alpha * hl * 0.9;
        ctx.strokeStyle = CW; ctx.lineWidth = 2.5;
        const w = F.measure(ctx, tok.t, { size, weight: 500, family: F.MONO });
        ctx.beginPath(); ctx.arc(x + w / 2, y - size * 0.32, size * 0.55, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      F.text(ctx, tok.t, x, y, { size, weight: 500, family: tok.family || F.MONO, color, alpha: alpha * (tok.a ?? 1) });
      if (tok.sub) {
        const w = F.measure(ctx, tok.t, { size, weight: 500, family: F.MONO });
        F.text(ctx, tok.sub, x + w + 2, y + size * 0.22, { size: sub, weight: 500, family: F.MONO, color, alpha: alpha * (tok.a ?? 1) });
      }
      x += widths[i];
    });
  }

  function formula(ctx, t) {
    const a = env(t, 95.6, 117.4, 0.8, 0.8);
    if (!a) return;
    const hl = env(t, 100.8, 106.4, 0.4, 0.4) * (0.8 + 0.2 * Math.sin((t - 100.8) * Math.PI * 1.4));
    const dim = lerp(1, 0.28, ep(t, 106, 107));
    const row = (v, color) => [
      { t: v, color }, { t: '=', hl: true }, { t: v, sub: '1', color }, { t: '+', hl: true }, { t: v, sub: '2', color }, { t: '+', hl: true }, { t: '…' }, { t: '+', hl: true }, { t: v, sub: 'n', color },
    ];
    const k1 = ep(t, 96, 97), k2 = ep(t, 96.6, 97.6), k3 = ep(t, 97.8, 98.8);
    tokens(ctx, row('A'), W / 2, 260, 64, a * k1 * dim, hl);
    tokens(ctx, row('B'), W / 2, 360, 64, a * k2 * dim, hl);
    const cond = L === 'en'
      ? [{ t: 'if', family: F.SANS }, { t: 'A', sub: 'i' }, { t: '>' }, { t: 'B', sub: 'i' }, { t: 'for every i,', family: F.SANS, pad: 30 }, { t: 'then', family: F.SANS }, { t: 'A' }, { t: '>' }, { t: 'B' }]
      : [{ t: '若每个 i 都有', family: F.SANS }, { t: 'A', sub: 'i' }, { t: '>' }, { t: 'B', sub: 'i' }, { t: '，则', family: F.SANS, pad: 18 }, { t: 'A' }, { t: '>' }, { t: 'B' }];
    tokens(ctx, cond, W / 2, 480, 48, a * k3 * dim);

    // 100% + 10% ≠ 19%
    const k4 = env(t, 106.6, 111.6, 0.6, 0.5);
    if (k4) {
      tokens(ctx, [{ t: '100%', color: CW }, { t: '+' }, { t: '10%', color: CW }, { t: '≠', color: INK }, { t: '19%', color: CW }], W / 2, 690, 72, a * k4);
    }
    // weighted averages
    const k5 = ep(t, 111.8, 112.8), k6 = ep(t, 112.6, 113.6);
    if (k5) {
      const lineW = [{ t: '19%', color: CW }, { t: '=' }, { t: '0.1', color: INK }, { t: '×' }, { t: '100%', color: CW }, { t: '+' }, { t: '0.9', color: INK }, { t: '×' }, { t: '10%', color: CW }];
      const lineM = [{ t: '81%', color: CM }, { t: '=' }, { t: '0.9', color: INK }, { t: '×' }, { t: '90%', color: CM, pad: 18 + 28 }, { t: '+' }, { t: '0.1', color: INK }, { t: '×' }, { t: '0%', color: CM, pad: 18 + 28 }];
      tokens(ctx, lineW, W / 2, 660, 56, a * k5);
      tokens(ctx, lineM, W / 2, 760, 56, a * k6);
      const k7 = ep(t, 114, 115);
      F.text(ctx, S('报考比例 × 录取率', 'share who applied × admission rate'), W / 2 + 70, 590, { size: 24, align: 'center', color: DIM, alpha: a * k7 });
    }
  }

  function vectors(ctx, t) {
    const a = env(t, 117.6, 140, 0.8, 0.9);
    if (!a) return;
    const OX = 620, OY = 880, SC = 6.0;
    const P = (x, y) => [OX + x * SC, OY - y * SC];
    ctx.save();
    ctx.globalAlpha = a;
    // axes
    const ax = ep(t, 117.8, 119);
    ctx.strokeStyle = DIM; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(OX, OY); ctx.lineTo(OX + 640 * ax, OY); ctx.moveTo(OX, OY); ctx.lineTo(OX, OY - 640 * ax); ctx.stroke();
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    for (const v of [25, 50, 75, 100]) {
      ctx.globalAlpha = a * ax;
      ctx.beginPath(); ctx.moveTo(...P(v, 0)); ctx.lineTo(...P(v, 100)); ctx.moveTo(...P(0, v)); ctx.lineTo(...P(100, v)); ctx.stroke();
    }
    ctx.restore();
    F.text(ctx, S('报名人数 →', 'applicants →'), OX + 600, OY + 46, { size: 24, align: 'right', color: DIM, alpha: a * ax });
    F.text(ctx, S('录取人数 ↑', 'admitted ↑'), OX - 20, OY - 600, { size: 24, align: 'right', color: DIM, alpha: a * ax });
    F.text(ctx, '100', ...P(100, 0).map((v, i) => v + (i ? 34 : 0)), { size: 20, align: 'center', color: DIM, alpha: a * ax });
    F.text(ctx, '100', P(0, 100)[0] - 14, P(0, 100)[1] + 7, { size: 20, align: 'right', color: DIM, alpha: a * ax });

    const arrow = (from, to, color, k, o = {}) => {
      if (k <= 0) return;
      const [x0, y0] = P(...from), [x1, y1] = P(...to);
      const x = lerp(x0, x1, k), y = lerp(y0, y1, k);
      ctx.save();
      ctx.globalAlpha = a * (o.alpha ?? 1);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = o.width || 4; ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
      ctx.setLineDash([]);
      const ang = Math.atan2(y - y0, x - x0), h = o.head || 16;
      if (Math.hypot(x - x0, y - y0) > 4) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - h * Math.cos(ang - 0.42), y - h * Math.sin(ang - 0.42));
        ctx.lineTo(x - h * Math.cos(ang + 0.42), y - h * Math.sin(ang + 0.42));
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    };
    // A vectors
    arrow([0, 0], [10, 10], CW, ep(t, 123.4, 124.6));
    arrow([0, 0], [90, 81], CM, ep(t, 124, 125.8));
    // B vectors, from the tips
    arrow([10, 10], [100, 19], CW, ep(t, 128.4, 130.2));
    arrow([90, 81], [100, 81], CM, ep(t, 129, 130));
    // totals
    arrow([0, 0], [100, 19], CW, ep(t, 133.6, 135.4), { dash: [10, 10], width: 3, alpha: 0.9 });
    arrow([0, 0], [100, 81], CM, ep(t, 134, 135.8), { dash: [10, 10], width: 3, alpha: 0.9 });

    // ledger on the right
    const rows = [
      [S('A 学院', 'School A'), '100%', '>', '90%', 124.4],
      [S('B 学院', 'School B'), '10%', '>', '0%', 129.6],
      [S('整体', 'Overall'), '19%', '<', '81%', 135.4],
    ];
    rows.forEach(([name, l, s, r, t0], i) => {
      const k = ep(t, t0, t0 + 0.7);
      const yy = 420 + i * 110;
      F.text(ctx, name, 1420, yy, { size: 28, weight: 600, color: DIM, alpha: a * k });
      F.text(ctx, l, 1640, yy, { size: 44, weight: 700, color: CW, align: 'right', alpha: a * k });
      F.text(ctx, s, 1680, yy, { size: 44, weight: 500, align: 'center', alpha: a * k });
      F.text(ctx, r, 1720, yy, { size: 44, weight: 700, color: CM, alpha: a * k });
    });
    const k = ep(t, 136.4, 137.2);
    F.text(ctx, S('斜率不可加，向量可加', 'slopes don’t add; vectors do'), 1590, 780, { size: 28, weight: 600, align: 'center', color: INK, alpha: a * k });
  }

  function closing(ctx, t) {
    const a = env(t, 145.6, 151.2, 0.9, 0.9);
    if (a) {
      F.text(ctx, S('数字不会说谎，', 'Numbers don’t lie.'), W / 2, 500, { size: 76, weight: 700, align: 'center', alpha: a });
      F.text(ctx, S('只会被算错。', 'They only get miscalculated.'), W / 2, 610, { size: 76, weight: 700, align: 'center', alpha: a * ep(t, 146.8, 147.6), color: CW });
    }
    const e = env(t, 151.6, DURATION + 1, 0.9, 0.1);
    if (e) {
      // a small field of the two hundred dots, settled
      for (const d of dots) {
        const x = 960 + (d.sx - 0.5) * 1500 + F.noise(t * 0.2, d.r * 50) * 10;
        const y = 540 + (d.sy - 0.5) * 760 + F.noise(t * 0.2 + 5, d.r * 50) * 10;
        ctx.save(); ctx.globalAlpha = e * (d.admitted ? 0.55 : 0.18); ctx.fillStyle = d.g === 'W' ? CW : CM;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = e * 0.85; ctx.fillStyle = BG;
      F.roundRect(ctx, W / 2 - 640, 420, 1280, 240, 24); ctx.fill(); ctx.restore();
      F.text(ctx, S('辛普森悖论与直觉的缺陷', 'Simpson’s Paradox and the Flaws of Intuition'), W / 2, 535, { size: 66, weight: 800, align: 'center', alpha: e });
      F.text(ctx, S('全文：simoncos.github.io', 'Read it at simoncos.github.io'), W / 2, 612, { size: 32, weight: 500, align: 'center', color: DIM, alpha: e });
    }
  }

  function draw(ctx, t) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1200);
    g.addColorStop(0, 'rgba(255,255,255,0.025)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    hook(ctx, t);
    title(ctx, t);
    headers(ctx, t);
    poolLabels(ctx, t);
    clusterLabels(ctx, t);
    totals(ctx, t);
    drawDots(ctx, t);
    balance(ctx, t);
    formula(ctx, t);
    vectors(ctx, t);
    closing(ctx, t);
    captions(ctx, t);
  }

  // Sound cues for the score (read by films/simpsons/score.py via render.mjs --events).
  const events = [];
  for (const d of dots) events.push({ t: d.td, kind: d.admitted ? 'admit' : 'reject', group: d.g });
  for (const d of dots) if (d.admitted) events.push({ t: d.tArrive, kind: 'arrive', group: d.g });
  events.push({ t: 61.5, kind: 'flip' });

  const strings = [
    ...CAPTIONS.map(c => (L === 'en' ? c[3] : c[2])),
    '每一组都赢了，加起来却输了。文章辛普森悖论与直觉的缺陷学院女男生人录取报名整体全文率之差个百分点多若每都有则报考比例数字不会说谎只会被算错',
    'Win in every group, and still lose overall. Essay Simpson’s Paradox Flaws Intuition School women men applied admitted overall share rate points vs Read it at numbers don’t lie miscalculated slopes vectors',
    '→↑≠×…“”’',
  ];
  const film = F.create({
    width: W, height: H, duration: DURATION, strings, draw,
    fonts: [[400, F.SANS], [500, F.SANS], [600, F.SANS], [700, F.SANS], [800, F.SANS], [500, F.MONO]],
  });
  film.events = events.sort((p, q) => p.t - q.t);
})();
