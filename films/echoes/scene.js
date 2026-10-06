// 漫无止尽的回响 · 宣传片 / Endless Echoes · promo
// 1080×1920, about one minute. The real game in its fresh state (no answer is
// ever on screen), the flower map drawn from the puzzle's own geometry, a hook
// for the hidden echo that is only named, never shown, and a QR code to play.
(function () {
  const F = Film;
  const { ep, env, prog, lerp, clamp, ease } = F;
  const L = F.lang;
  const S = (zh, en) => (L === 'en' ? en : zh);
  const W = 1080, H = 1920, DURATION = 59;
  const D = window.ECHOES;

  const BG = '#0f1016', MAPBG = '#161923', SURF = '#21202a', INK = '#f0e8e3', DIM = '#a39fa8', SOFT = '#777782';
  const ACC = '#f1b291', GOLD = '#efd9a8', BLUEPATH = '#91b5ed';
  const BLOOM = { poppy: '#f2a08b', blue: '#a3b7f1', ivory: '#f0ca80', dahlia: '#eca45d' };

  const images = {
    garden: '/gallery/music/assets/endless-echoes-garden-v5.webp',
    poppy: '/gallery/music/assets/echo-flower-poppy.webp',
    blue: '/gallery/music/assets/echo-flower-blue.webp',
    ivory: '/gallery/music/assets/echo-flower-ivory.webp',
    dahlia: '/gallery/music/assets/echo-flower-dahlia.webp',
    phone: `/films/echoes/out/shots/phone-${L}.png`,
    desk: `/films/echoes/out/shots/desktop-${L}.png`,
  };
  let I = {}, BOX = null, gardenBlur = null;

  // ---- map geometry --------------------------------------------------------
  const byId = new Map(D.nodes.map(n => [n.id, n]));
  const edges = [];
  for (const n of D.nodes) for (const m of n.next) {
    const pts = [[n.x, n.y], ...(D.map.routes[`${n.id}:${m}`] || []), [byId.get(m).x, byId.get(m).y]];
    edges.push({ from: n.id, to: m, pts: spline(pts) });
  }
  // Catmull-Rom through the route points, sampled, trimmed short of both nodes.
  function spline(pts) {
    const out = [];
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < P.length - 2; i++) {
      for (let s = 0; s < 16; s++) {
        const t = s / 16, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(P[i - 1][0], P[i][0], P[i + 1][0], P[i + 2][0]), f(P[i - 1][1], P[i][1], P[i + 1][1], P[i + 2][1])]);
      }
    }
    out.push(pts[pts.length - 1]);
    // trim 26 map units at each end so arrows and flowers don't touch
    const trim = (arr, d) => { let acc = 0; for (let i = 1; i < arr.length; i++) { acc += Math.hypot(arr[i][0] - arr[i - 1][0], arr[i][1] - arr[i - 1][1]); if (acc > d) return arr.slice(i); } return arr; };
    return trim(trim(out, 26).reverse(), 30).reverse();
  }
  const edgeOf = (a, b) => edges.find(e => e.from === a && e.to === b);

  // A real walk: the shortest way from the start to the ending.
  function shortest(a, b) {
    const prev = new Map([[a, null]]), q = [a];
    while (q.length) { const u = q.shift(); if (u === b) break; for (const v of byId.get(u).next) if (!prev.has(v)) { prev.set(v, u); q.push(v); } }
    const path = []; for (let u = b; u; u = prev.get(u)) path.unshift(u); return path;
  }
  const WALK = shortest(D.start, D.ending);
  const WALK0 = 35.2, STEP = 0.72;
  // Then the rest of the map lights in breadth-first order, all but one song.
  const order = [];
  { const seen = new Set(WALK), q = [...WALK]; while (q.length) { const u = q.shift(); for (const v of byId.get(u).next) if (!seen.has(v)) { seen.add(v); order.push(v); q.push(v); } } for (const n of D.nodes) if (!seen.has(n.id)) order.push(n.id); }
  const LAST = order.pop();   // the one bud left for the hook
  const SPREAD0 = WALK0 + WALK.length * STEP + 0.3, SPREAD1 = 44.4;
  const litAt = new Map();
  WALK.forEach((id, i) => litAt.set(id, i === 0 ? 0 : WALK0 + i * STEP));
  order.forEach((id, i) => litAt.set(id, lerp(SPREAD0, SPREAD1, i / Math.max(1, order.length - 1))));

  function edgeProgress(e, t) {
    const a = litAt.get(e.from), b = litAt.get(e.to);
    if (a === undefined || b === undefined) return 0;
    const wi = WALK.indexOf(e.to);
    if (wi > 0 && WALK[wi - 1] === e.from) return ep(t, b - STEP * 0.7, b, ease.inOut);
    const at = Math.max(a, b);
    return ep(t, at - 0.15, at + 0.5, ease.out) * (b >= a ? 1 : 1);
  }

  function drawMap(ctx, ox, oy, sc, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ox, oy);
    ctx.scale(sc, sc);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // ghost network
    ctx.strokeStyle = 'rgba(119,119,130,0.42)'; ctx.lineWidth = 2.2 / sc * 1.2;
    for (const e of edges) { ctx.beginPath(); e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); arrow(ctx, e.pts, 'rgba(119,119,130,0.6)', 12); }
    // walked paths, gold with a soft glow
    for (const e of edges) {
      const k = edgeProgress(e, t);
      if (k <= 0) continue;
      const n = Math.max(2, Math.round(e.pts.length * k));
      const seg = e.pts.slice(0, n);
      ctx.save();
      ctx.shadowColor = 'rgba(239,217,168,0.7)'; ctx.shadowBlur = 14;
      ctx.strokeStyle = GOLD; ctx.lineWidth = 3.4;
      ctx.beginPath(); seg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.restore();
      if (k >= 0.98) arrow(ctx, e.pts, GOLD, 16);
    }
    // nodes
    for (const n of D.nodes) {
      const at = litAt.get(n.id);
      const lit = at === undefined ? 0 : ep(t, at, at + 0.5, ease.back);
      const isEnd = n.id === D.ending, isStart = n.id === D.start;
      if (lit < 1 && !isEnd) {
        // bud: a dot and a dashed ring
        ctx.save();
        ctx.globalAlpha *= 1 - lit;
        ctx.fillStyle = '#aaa4a8';
        ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(170,164,168,0.55)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(n.x, n.y, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const show = isEnd ? Math.max(lit, 0.55) : lit;
      if (show > 0) {
        const color = BLOOM[n.flower];
        const size = (isStart || isEnd ? 66 : 54) * show;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, size * 1.5);
        g.addColorStop(0, F.rgba(color, 0.42 * show)); g.addColorStop(1, F.rgba(color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, size * 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha *= isEnd && lit < 1 ? 0.85 : 1;
        ctx.drawImage(I[n.flower], n.x - size / 2, n.y - size / 2, size, size);
        ctx.restore();
        // a ring that blooms out when the song is found
        if (at !== undefined && t > at && t < at + 1.2) {
          const k = prog(t, at, at + 1.2);
          ctx.save(); ctx.globalAlpha *= (1 - k) * 0.8; ctx.strokeStyle = color; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(n.x, n.y, 20 + 50 * ease.out(k), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      }
      if (isStart || isEnd) {
        ctx.save();
        ctx.font = F.font(26, 600, F.SANS); ctx.textAlign = 'center'; ctx.fillStyle = isEnd ? GOLD : INK;
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
        ctx.fillText(isStart ? S('起点', 'Start') : S('终点', 'End'), n.x, n.y + 58);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function arrow(ctx, pts, color, size) {
    const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[Math.max(0, pts.length - 3)];
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - size * Math.cos(a - 0.45), y1 - size * Math.sin(a - 0.45));
    ctx.lineTo(x1 - size * 0.6 * Math.cos(a), y1 - size * 0.6 * Math.sin(a));
    ctx.lineTo(x1 - size * Math.cos(a + 0.45), y1 - size * Math.sin(a + 0.45));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // ---- shared pieces ---------------------------------------------------------
  function motes(ctx, t, alpha, n = 70) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const r = F.rng(i * 7717);
      const x0 = r() * W, y0 = r() * H, sp = 14 + r() * 30, sz = 1 + r() * 2.6;
      const x = x0 + F.noise(t * 0.25 + i, 2) * 40;
      const y = ((y0 - t * sp) % H + H) % H;
      const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + r()) + i);
      ctx.globalAlpha = alpha * (0.15 + 0.45 * tw);
      ctx.fillStyle = i % 3 ? '#ffd8b0' : '#cfdcff';
      ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function backdrop(ctx, t, dim) {
    ctx.drawImage(gardenBlur, 0, 0, W, H);
    ctx.fillStyle = `rgba(10,10,15,${dim})`;
    ctx.fillRect(0, 0, W, H);
  }

  function serif(ctx, str, x, y, size, o = {}) {
    return F.text(ctx, str, x, y, { size: L === 'en' ? size * 0.86 : size, weight: o.weight || 500, family: F.SERIF, align: o.align || 'center', alpha: o.alpha, color: o.color || INK, maxWidth: o.maxWidth || 960, lineHeight: o.lineHeight || 1.45, valign: o.valign, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 18 });
  }
  function sans(ctx, str, x, y, size, o = {}) {
    return F.text(ctx, str, x, y, { size: L === 'en' ? size * 0.92 : size, weight: o.weight || 500, align: o.align || 'center', alpha: o.alpha, color: o.color || DIM, maxWidth: o.maxWidth || 960, lineHeight: 1.5, spacing: o.spacing, valign: o.valign });
  }

  // ---- 0–5: the hook -----------------------------------------------------------
  function opening(ctx, t) {
    const o = env(t, 0, 5.6, 0.01, 0.8);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.restore();
    motes(ctx, t, o * 0.5, 30);
    const cx = W / 2, cy = 880;
    const bloom = ep(t, 3.6, 4.6, ease.back);
    // the bud
    ctx.save();
    ctx.globalAlpha = o * (1 - bloom) * ep(t, 0.2, 1.0);
    ctx.fillStyle = '#aaa4a8'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.setLineDash([6, 8]); ctx.strokeStyle = 'rgba(170,164,168,0.7)'; ctx.lineWidth = 3;
    ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); ctx.arc(cx, cy, 34 + 3 * Math.sin(t * 2.4), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    if (bloom > 0) {
      const s = 300 * bloom;
      ctx.save(); ctx.globalAlpha = o; ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.3);
      g.addColorStop(0, F.rgba(BLOOM.blue, 0.35)); g.addColorStop(1, F.rgba(BLOOM.blue, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, s * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha = o; ctx.drawImage(I.blue, cx - s / 2, cy - s / 2, s, s); ctx.restore();
    }
    serif(ctx, S('每一首歌里，', 'Inside every song'), W / 2, 560, 66, { alpha: o * env(t, 0.5, 6, 0.7, 0.1) });
    serif(ctx, S('都藏着下一首歌。', 'hides the next one.'), W / 2, 1300, 66, { alpha: o * env(t, 1.7, 6, 0.7, 0.1), color: ACC });
  }

  // ---- 5–12: the world and the title ---------------------------------------------
  function titleCard(ctx, t) {
    const o = env(t, 4.8, 12.4, 0.9, 0.7);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o;
    backdrop(ctx, t, 0.35);
    // the key visual, uncropped, slowly drifting closer
    const k = prog(t, 4.8, 12.4);
    const z = lerp(1.0, 1.12, ease.sine(k));
    const w = 1080 * z, h = 720 * z;
    const y = 640;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y, W, 720); ctx.clip();
    ctx.drawImage(I.garden, (W - w) / 2 + 40 * (1 - k), y + (720 - h) / 2 + 30 * (1 - k), w, h);
    // feather the band's edges into the backdrop
    const fade = (y0, y1, a0, a1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(12,12,18,${a0})`); g.addColorStop(1, `rgba(12,12,18,${a1})`); ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0); };
    fade(y, y + 120, 0.9, 0); fade(y + 600, y + 720, 0, 0.9);
    ctx.restore();
    ctx.restore();
    motes(ctx, t, o * 0.8);
    sans(ctx, S('音乐谜题 · 扩展版', 'A music riddle · expanded'), W / 2, 300, 30, { alpha: o * ep(t, 5.6, 6.4), color: ACC, spacing: 4, weight: 600 });
    serif(ctx, S('漫无止尽的回响', 'Endless Echoes'), W / 2, 460, 116, { alpha: o * ep(t, 5.9, 7.0), weight: 600 });
    serif(ctx, S('36 首陈奕迅的歌，不止一条路。', '36 Eason Chan songs. More than one way through.'), W / 2, 1520, 44, { alpha: o * ep(t, 7.6, 8.6) });
    sans(ctx, S('读一段线索，猜下一首歌。', 'Read a clue. Guess the next song.'), W / 2, 1600, 34, { alpha: o * ep(t, 8.6, 9.6) });
  }

  // ---- 12–31: how to play, on the real phone card ---------------------------------
  const PH = { x: 90, w: 900 };
  const phS = () => PH.w / I.phone.width;
  const CAM = [[12.0, 330], [18.4, 330], [19.4, -470], [23.2, -470], [24.0, 300], [26.0, 300], [26.9, -720], [31.5, -720]];
  const camY = t => {
    if (t <= CAM[0][0]) return CAM[0][1];
    for (let i = 1; i < CAM.length; i++) if (t <= CAM[i][0]) return lerp(CAM[i - 1][1], CAM[i][1], ease.inOut(prog(t, CAM[i - 1][0], CAM[i][0])));
    return CAM[CAM.length - 1][1];
  };
  const STEPS = [
    [12.2, 18.6, '01', S('读一段线索', 'Read a clue'), S('线索主要藏在歌词里，而不是曲调里。', 'The clues hide in the lyrics, not the melody.')],
    [18.6, 25.6, '02', S('猜下一首歌', 'Guess the next song'), S('输入歌名，简繁体均可。答对了，路就接上了。', 'Type its title. Get it right and the path connects.')],
    [25.6, 31.4, '03', S('卡住了也没关系', 'Stuck? That’s fine'), S('先看提示，或者主动揭晓答案。进度自动保存。', 'Take a hint, or reveal the answer. Progress saves itself.')],
  ];

  function howToPlay(ctx, t) {
    const o = env(t, 11.8, 31.6, 0.8, 0.6);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o;
    backdrop(ctx, t, 0.62);
    const s = phS();
    const top = camY(t) + (1 - ep(t, 11.8, 12.9, ease.out)) * 240;
    const P = (bx, by) => [PH.x + bx * s, top + by * s];
    // the phone card
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
    F.roundRect(ctx, PH.x, top, PH.w, I.phone.height * s, 34); ctx.fillStyle = SURF; ctx.fill();
    ctx.restore();
    ctx.save(); F.roundRect(ctx, PH.x, top, PH.w, I.phone.height * s, 34); ctx.clip();
    ctx.drawImage(I.phone, PH.x, top, PH.w, I.phone.height * s);
    ctx.restore();

    // spotlight on what each step is about
    const spot = (box, a, pad = 18) => {
      if (!box || a <= 0) return;
      const [x, y] = P(box[0], box[1]);
      const w = box[2] * s, h = box[3] * s;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(8,8,12,0.55)';
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 20); ctx.fill('evenodd');
      ctx.strokeStyle = F.rgba(ACC, 0.9); ctx.lineWidth = 3; ctx.shadowColor = ACC; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 20); ctx.stroke();
      ctx.restore();
    };
    const join = (a, b) => [a[0], a[1], Math.max(a[0] + a[2], b[0] + b[2]) - a[0], b[1] + b[3] - a[1]];
    spot(BOX.clue, env(t, 13.4, 18.4, 0.5, 0.4));
    spot(join(BOX.input, BOX.submit), env(t, 19.6, 23.0, 0.4, 0.3));
    spot(join(BOX.hint, BOX.reveal), env(t, 27.0, 31.2, 0.4, 0.4));

    // typing: the answer stays a secret, so it is drawn as dots
    if (t > 19.8 && t < 24.2) {
      const [ix, iy] = P(BOX.input[0], BOX.input[1]);
      const ih = BOX.input[3] * s;
      const n = Math.min(4, Math.floor((t - 20.2) / 0.38) + 1);
      ctx.save();
      ctx.fillStyle = '#2a2833';
      F.roundRect(ctx, ix + 8, iy + 8, BOX.input[2] * s - 16, ih - 16, 12); ctx.fill();
      if (t > 20.2) {
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = INK;
          ctx.beginPath(); ctx.arc(ix + 46 + i * 40, iy + ih / 2, 11, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (Math.floor(t * 2) % 2 === 0 || t < 20.2) { ctx.fillStyle = ACC; ctx.fillRect(ix + 36 + (t > 20.2 ? n * 40 : 0), iy + ih / 2 - 24, 3, 48); }
      ctx.restore();
    }
    // pressing "check answer"
    const press = env(t, 22.2, 23.2, 0.12, 0.6);
    if (press) {
      const [bx, by] = P(BOX.submit[0], BOX.submit[1]);
      ctx.save(); ctx.globalAlpha = press * 0.55; ctx.fillStyle = ACC;
      F.roundRect(ctx, bx, by, BOX.submit[2] * s, BOX.submit[3] * s, 16); ctx.fill(); ctx.restore();
      ripple(ctx, bx + BOX.submit[2] * s / 2, by + BOX.submit[3] * s / 2, t, 22.3);
    }
    // the first way out turns into a flower; its name stays hidden
    const found = ep(t, 24.0, 24.9, ease.back);
    if (found > 0 && BOX.exits[0]) {
      const ex = BOX.exits[0];
      const [x, y] = P(ex[0], ex[1]);
      const cx = x + ex[2] * s / 2, cy = y + 80 * s * 0.85;
      ctx.save();
      ctx.fillStyle = 'rgba(30,30,40,1)';
      ctx.beginPath(); ctx.arc(cx, cy, 44 * s * found + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
      g.addColorStop(0, F.rgba(BLOOM.poppy, 0.5 * found)); g.addColorStop(1, F.rgba(BLOOM.poppy, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const fs = 120 * found;
      ctx.drawImage(I.poppy, cx - fs / 2, cy - fs / 2, fs, fs);
      // name: a blurred bar where the title would be
      ctx.save(); ctx.globalAlpha = found;
      ctx.fillStyle = '#26252f'; ctx.fillRect(x - 6, cy + 46, ex[2] * s + 12, 60);
      ctx.filter = 'blur(6px)'; ctx.fillStyle = 'rgba(240,232,227,0.7)';
      F.roundRect(ctx, x + 14, cy + 62, ex[2] * s - 28, 26, 10); ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
      ripple(ctx, cx, cy, t, 24.0, BLOOM.poppy);
    }
    // toast: found, 2 / 36
    const toast = env(t, 24.4, 26.2, 0.3, 0.4);
    if (toast) {
      const y = 1500 + (1 - ease.out(prog(t, 24.4, 24.8))) * 30;
      ctx.save(); ctx.globalAlpha = toast;
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30;
      F.roundRect(ctx, 200, y, 680, 110, 55); ctx.fillStyle = 'rgba(33,32,42,0.96)'; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = F.rgba(BLOOM.poppy, 0.6); ctx.lineWidth = 2; ctx.stroke();
      ctx.drawImage(I.poppy, 228, y + 17, 76, 76);
      ctx.restore();
      sans(ctx, S('找到了一首 · 2 / 36', 'Song found · 2 / 36'), 560, y + 70, 36, { alpha: toast, color: INK, weight: 600 });
    }
    // tapping hint, then reveal
    for (const [box, at] of [[BOX.hint, 28.0], [BOX.reveal, 29.4]]) {
      const [x, y] = P(box[0], box[1]);
      ripple(ctx, x + 120, y + box[3] * s / 2, t, at);
    }

    // step label on a dark band at the top
    ctx.save();
    const band = ctx.createLinearGradient(0, 0, 0, 380);
    band.addColorStop(0, 'rgba(10,10,15,0.96)'); band.addColorStop(0.75, 'rgba(10,10,15,0.85)'); band.addColorStop(1, 'rgba(10,10,15,0)');
    ctx.fillStyle = band; ctx.fillRect(0, 0, W, 380);
    ctx.restore();
    for (const [a, b, num, head, sub] of STEPS) {
      const so = env(t, a, b, 0.45, 0.35);
      if (!so) continue;
      const lift = (1 - ease.out(prog(t, a, a + 0.6))) * 16;
      F.text(ctx, num, 90, 150 + lift, { size: 40, weight: 600, family: F.MONO, color: ACC, alpha: so });
      serif(ctx, head, 180, 152 + lift, 64, { align: 'left', alpha: so });
      sans(ctx, sub, 92, 240 + lift, 32, { align: 'left', alpha: so, maxWidth: 900 });
    }
    ctx.restore();
  }

  function ripple(ctx, x, y, t, at, color = ACC) {
    if (t < at || t > at + 0.9) return;
    const k = prog(t, at, at + 0.9);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = color; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 20 + 70 * ease.out(k), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = F.rgba(color, 0.35 * (1 - k));
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---- 31–35: on a computer ---------------------------------------------------------
  function desktop(ctx, t) {
    const o = env(t, 31.2, 35.4, 0.6, 0.6);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o;
    backdrop(ctx, t, 0.6);
    const k = prog(t, 31.2, 35.4);
    // show the desktop card large, panning across clue → map
    const h = 1180, w = I.desk.width * (h / I.desk.height);
    const x = lerp(60, W - w - 60 + 380, ease.sine(k)) - 380 * ease.sine(k) * 0 ;
    const y = 520;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60;
    F.roundRect(ctx, x, y, w, h, 24); ctx.fillStyle = SURF; ctx.fill();
    ctx.restore();
    ctx.save(); F.roundRect(ctx, x, y, w, h, 24); ctx.clip(); ctx.drawImage(I.desk, x, y, w, h); ctx.restore();
    serif(ctx, S('在电脑上，', 'On a computer,'), W / 2, 250, 64, { alpha: o });
    serif(ctx, S('线索和地图可以并排看。', 'clue and map sit side by side.'), W / 2, 350, 64, { alpha: o * ep(t, 31.8, 32.6) });
    ctx.restore();
  }

  // ---- 35–44: the map --------------------------------------------------------------
  const MAP_Y = 560, CHIPS_Y = 1420;
  // The found songs as the page lists them, a chip each: flower and name.
  // The names are answers, so they are drawn blurred.
  const FOUND = [...litAt.entries()].sort((a, b) => a[1] - b[1]);
  function chips(ctx, t, alpha) {
    const cw = 158, chh = 50, gap = 12, perRow = 6;
    const x0 = (W - (perRow * cw + (perRow - 1) * gap)) / 2;
    FOUND.forEach(([id, at], i) => {
      const k = ep(t, at, at + 0.35, ease.out);
      if (!k) return;
      const r = Math.floor(i / perRow), c = i % perRow;
      const x = x0 + c * (cw + gap), y = CHIPS_Y + r * (chh + gap) + (1 - k) * 10;
      const n = byId.get(id);
      ctx.save();
      ctx.globalAlpha = alpha * k;
      F.roundRect(ctx, x, y, cw, chh, 25); ctx.fillStyle = 'rgba(33,32,42,0.95)'; ctx.fill();
      ctx.strokeStyle = F.rgba(BLOOM[n.flower], 0.35); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.drawImage(I[n.flower], x + 8, y + 7, 36, 36);
      ctx.filter = 'blur(5px)';
      ctx.fillStyle = 'rgba(240,232,227,0.55)';
      const w = 52 + (F.rng(i * 991)() * 44);
      F.roundRect(ctx, x + 54, y + 18, w, 15, 7); ctx.fill();
      ctx.filter = 'none';
      ctx.restore();
    });
  }

  function mapScene(ctx, t) {
    const o = env(t, 35.0, 49.2, 0.7, 0.4);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const sc = (W - 40) / D.map.width;
    const mh = D.map.height * sc;
    // the map card, with the page's header: 回响地图 and n / 36
    ctx.save();
    F.roundRect(ctx, 20, MAP_Y - 110, W - 40, mh + 140, 28); ctx.fillStyle = MAPBG; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    const lit = [...litAt.values()].filter(at => t >= at).length;
    sans(ctx, S('回响地图', 'Echo map'), 56, MAP_Y - 52, 26, { align: 'left', alpha: o, color: DIM });
    F.text(ctx, `${lit}`, W - 150, MAP_Y - 44, { size: 54, weight: 600, align: 'right', color: INK, alpha: o });
    F.text(ctx, '/ 36', W - 140, MAP_Y - 44, { size: 28, weight: 500, family: F.MONO, align: 'left', color: DIM, alpha: o });
    // progress line
    ctx.save(); ctx.globalAlpha = o;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(56, MAP_Y - 20, W - 112, 3);
    ctx.fillStyle = ACC; ctx.fillRect(56, MAP_Y - 20, (W - 112) * lit / 36, 3);
    ctx.restore();
    const dimHook = 1 - 0.55 * ep(t, 44.6, 45.6);
    drawMap(ctx, 20, MAP_Y, sc, t, dimHook);
    sans(ctx, S('已经找到的歌', 'Songs found'), 56, CHIPS_Y - 26, 26, { align: 'left', alpha: o * ep(t, 35.6, 36.4) });
    chips(ctx, t, o * dimHook);
    ctx.restore();
    serif(ctx, S('有分岔，有回环，也有死胡同。', 'Branches, loops and dead ends.'), W / 2, 250, 60, { alpha: o * env(t, 35.6, 40.6, 0.6, 0.5) });
    serif(ctx, S('通往终点，不止一条路。', 'More than one way to the end.'), W / 2, 250, 60, { alpha: o * env(t, 40.6, 44.6, 0.5, 0.5) });
  }

  // ---- 44.6–49.2: the hook for what is hidden ---------------------------------------
  function hiddenHook(ctx, t) {
    const o = env(t, 44.8, 49.4, 0.6, 0.5);
    if (!o) return;
    // the last bud pulses
    const n = byId.get(LAST);
    const sc = (W - 40) / D.map.width;
    const x = 20 + n.x * sc, y = MAP_Y + n.y * sc;
    const p = 0.5 + 0.5 * Math.sin((t - 44.8) * Math.PI * 1.6);
    ctx.save(); ctx.globalAlpha = o;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 70 + 20 * p);
    g.addColorStop(0, `rgba(240,232,227,${0.35 + 0.25 * p})`); g.addColorStop(1, 'rgba(240,232,227,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 90, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = o; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 10;
    ctx.beginPath(); ctx.arc(x, y, 18 + 6 * p, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    serif(ctx, S('找全 36 首，', 'Find all 36,'), W / 2, 200, 66, { alpha: o });
    serif(ctx, S('会有一段隐藏的回响。', 'and a hidden echo appears.'), W / 2, 300, 66, { alpha: o * ep(t, 45.6, 46.4), color: ACC });
  }

  // ---- 49–59: play now ---------------------------------------------------------------
  function cta(ctx, t) {
    const o = env(t, 49.0, DURATION + 1, 0.8, 0.1);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o;
    backdrop(ctx, t, 0.55);
    motes(ctx, t, 0.8);
    // a few flowers drifting at the edges
    [['poppy', 140, 300, 0], ['blue', 960, 420, 1], ['ivory', 120, 1650, 2], ['dahlia', 950, 1720, 3]].forEach(([f, x, y, i]) => {
      const s = 150 + 20 * Math.sin(t * 0.7 + i);
      ctx.save(); ctx.globalAlpha = o * 0.85 * ep(t, 49.4 + i * 0.2, 50.4 + i * 0.2);
      ctx.translate(x + F.noise(t * 0.3, i) * 14, y + F.noise(t * 0.3 + 4, i) * 14); ctx.rotate(Math.sin(t * 0.3 + i) * 0.15);
      ctx.drawImage(I[f], -s / 2, -s / 2, s, s); ctx.restore();
    });
    serif(ctx, S('下一首是什么？', 'Which song comes next?'), W / 2, 360, 84, { alpha: o * ep(t, 49.4, 50.2), weight: 600 });
    sans(ctx, S('来接上第一条路。', 'Come and connect the first path.'), W / 2, 450, 36, { alpha: o * ep(t, 50.0, 50.8), color: INK });

    // QR card: dark modules on cream, a flower in the middle
    const qr = D.qr[L].rows, n = qr.length;
    const size = 560, quiet = 34, cell = (size - quiet * 2) / n;
    const x0 = (W - size) / 2, y0 = 560;
    const k = ep(t, 50.3, 51.2, ease.back);
    ctx.save();
    ctx.globalAlpha = o * ep(t, 50.3, 50.8);
    ctx.translate(W / 2, y0 + size / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-W / 2, -(y0 + size / 2));
    ctx.shadowColor = 'rgba(241,178,145,0.35)'; ctx.shadowBlur = 50;
    F.roundRect(ctx, x0, y0, size, size, 30); ctx.fillStyle = '#f4ede6'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#161923';
    const mid = n / 2, hole = 3.4;   // modules kept clear for the flower
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (qr[r][c] !== '1') continue;
      if (Math.abs(r + 0.5 - mid) < hole && Math.abs(c + 0.5 - mid) < hole) continue;
      ctx.fillRect(x0 + quiet + c * cell - 0.3, y0 + quiet + r * cell - 0.3, cell + 0.6, cell + 0.6);
    }
    const fs = cell * hole * 2 - 4;
    ctx.drawImage(I.blue, W / 2 - fs / 2, y0 + size / 2 - fs / 2, fs, fs);
    ctx.restore();

    sans(ctx, S('扫码，在手机上开始', 'Scan to play on your phone'), W / 2, 1210, 38, { alpha: o * ep(t, 51.0, 51.8), color: INK, weight: 600 });
    F.text(ctx, 'simoncos.github.io', W / 2, 1310, { size: 44, weight: 600, align: 'center', color: ACC, alpha: o * ep(t, 51.4, 52.2) });
    sans(ctx, S('作品 → 游戏 → 漫无止尽的回响', 'Work → Games → Endless Echoes'), W / 2, 1372, 30, { alpha: o * ep(t, 51.6, 52.4) });
    sans(ctx, S('免费 · 无需注册 · 进度自动保存', 'Free · no sign-up · progress saves itself'), W / 2, 1490, 30, { alpha: o * ep(t, 52.2, 53.0), color: INK });
    sans(ctx, S('电脑上体验更佳：线索和地图可以并排看', 'Best on a computer: clue and map side by side'), W / 2, 1546, 26, { alpha: o * ep(t, 52.6, 53.4) });
    ctx.restore();
  }

  function draw(ctx, t) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    titleCard(ctx, t);
    howToPlay(ctx, t);
    desktop(ctx, t);
    mapScene(ctx, t);
    hiddenHook(ctx, t);
    cta(ctx, t);
    opening(ctx, t);
  }

  // sound cues for score.py
  const events = [
    { t: 0.6, kind: 'chord', id: D.start, vel: 0.4 },
    { t: 3.6, kind: 'bloom', id: D.start },
    ...Array.from({ length: 4 }, (_, i) => ({ t: 20.2 + i * 0.38, kind: 'key' })),
    { t: 22.3, kind: 'press' },
    { t: 24.0, kind: 'found', id: byId.get(D.start).next[0] },
    { t: 28.0, kind: 'tap' }, { t: 29.4, kind: 'tap' },
    ...WALK.slice(1).map((id, i) => ({ t: WALK0 + (i + 1) * STEP, kind: 'walk', id })),
    ...order.map(id => ({ t: litAt.get(id), kind: 'spread', id })),
    { t: 44.8, kind: 'hook' },
    { t: 49.4, kind: 'cta' },
  ];

  const strings = [
    ...STEPS.flatMap(s => [s[3], s[4]]),
    S('每一首歌里，都藏着下一首歌。音乐谜题扩展版漫无止尽的回响36首陈奕迅的歌，不止一条路。读一段线索，猜下一首歌。在电脑上，线索和地图可以并排看。有分岔，有回环，也有死胡同。通往终点，不止一条路。找全36首，会有一段隐藏的回响。下一首是什么？来接上第一条路。扫码，在手机上开始作品→游戏→免费无需注册进度自动保存电脑上体验更佳首已点亮找到了一首起点终点',
      'Inside every song hides the next one. A music riddle expanded Endless Echoes 36 Eason Chan songs More than one way through Read a clue Guess the next song On a computer clue and map sit side by side Branches loops dead ends to the end Find all and a hidden echo appears Which song comes next? Come connect the first path Scan to play on your phone Work Games Free no sign-up progress saves itself Best songs found Song Start End'),
    'simoncos.github.io0123456789/·→',
  ];
  const film = F.create({
    width: W, height: H, duration: DURATION, images, strings, draw,
    fonts: [[500, F.SANS], [600, F.SANS], [700, F.SANS], [500, F.SERIF], [600, F.SERIF], [600, F.MONO]],
    init: async ({ images: loaded }) => {
      I = loaded;
      BOX = await (await fetch(`/films/echoes/out/shots/boxes-${L}.json`)).json();
      gardenBlur = document.createElement('canvas');
      gardenBlur.width = W; gardenBlur.height = H;
      const g = gardenBlur.getContext('2d');
      g.filter = 'blur(40px) brightness(0.6) saturate(1.1)';
      F.cover(g, loaded.garden, -150, -150, W + 300, H + 300, 1.0);
    },
  });
  film.events = events;
})();
