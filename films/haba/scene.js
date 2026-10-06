// 我的哈巴雪山之旅 / My Haba Snow Mountain Journey
// 1920×1080, about 3.5 minutes. The article's own photos in route order,
// carried by the elevation: 0 → 2,400 → 4,100 → 5,396 → 0 m.
(function () {
  const F = Film;
  const { ep, env, prog, lerp, clamp, ease } = F;
  const L = F.lang;
  const W = 1920, H = 1080, DURATION = 206;
  const S = (zh, en) => (L === 'en' ? en : zh);

  const INK = '#f4f3ef', DIM = '#a3a39e', ACC = '#FFD166';
  const IMG = 'blogs/assets/images/my-haba-snow-mountain-journey/';
  const ROOT = '/';
  const P = {
    cover: '8636a1a47ea2beb545dcbac8495c1dc2', notes: 'e8d915d311e1c02a271d668779f5b619', gorge: 'b1c14c29f1f03c298a00fa7c6bdebb82',
    tea: '2926e0b71cbe7c58912d8dbfba77c323', goats: '2fce4b18b4c88bac853659b35a1fedcb', forest: 'ab651f40e466df5ff31e865dea6af584',
    meadow: 'a39df4d7790620c1cdece83f0fcc6307', mules: '5a608b6b1ff96d5eddf7730dcbad1959', riding: '74b9a0abe85684f88f9e17636e89461e',
    camp: '9be7058e873bc20f268619d376c2ebc7', dorm: '56e34dfaa0550ecfc3a4580d0cf80569', food: '58228d92ccd170492e269ed23bb8659d',
    night: '1804715afcbd9ae9b6a5b4d66500ff16', slope: '93d98c360cf1aae1b93a79dd43d1efb4', sign: '4274e16cc6981c973f6d3d0a6609dd86',
    summit: '3cd9bc3cc2e2887a1446b4a1d9fa983d', axe: '31e196c4a5f4951ea1acbe441ed21f14', streams: '66d7820d9784fb2b20fedbf5cb89db4d',
    village: '71c6bf1121418a29625b6681cda8bc4a', porter: 'd88e3140e238cb447cc9999ff35ed48b', boots: '2b8ec11dfc596f9afb08b4640d244cef',
  };
  const images = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, `${ROOT}${IMG}${v}.jpg`]));

  // ---- the route: elevation and clock over film time ---------------------
  const ELEV = [
    [34, 0], [40, 2400], [41, 2400], [52.5, 2900], [65.5, 4100], [86, 4100], [100, 4350], [106, 4500],
    [114, 4750], [118, 4900], [136, 5300], [141, 5396], [150, 5396], [169, 4100], [175, 4100], [178, 2400], [181, 0],
  ];
  // minutes after 00:00 on 09.29
  const CLOCK = [
    [34, 22 * 60], [40.4, 25 * 60], [41, 30 * 60], [47, 32.5 * 60], [52.5, 33 * 60], [65.5, 37 * 60], [71, 40 * 60],
    [76, 43.5 * 60], [79.5, 45.5 * 60], [86, 50 * 60 + 59], [106, 53.5 * 60], [118, 55 * 60], [141, 57 * 60 + 31],
    [150, 58 * 60], [169, 62 * 60 + 30], [175, 64 * 60], [181, 67 * 60],
  ];
  const curve = (keys, t, smooth = true) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) return lerp(v0, v1, smooth ? ease.sine(prog(t, t0, t1)) : prog(t, t0, t1));
    }
    return keys[keys.length - 1][1];
  };
  const elev = t => curve(ELEV, t);
  const clock = t => {
    const m = Math.floor(curve(CLOCK, t, false));
    const day = Math.floor(m / 1440), mm = m % 1440;
    const date = ['09.29', '09.30', '10.01', '10.02'][day];
    return `${date}  ${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
  };
  const CHAPTERS = [
    [34, 41, 'Day 0 · 香港 → 丽江', 'Day 0 · Hong Kong → Lijiang'],
    [41, 76, 'Day 1 · 丽江 → 哈巴村 → 大本营', 'Day 1 · Lijiang → Haba Village → Base Camp'],
    [76, 86, 'Day 1 · 大本营之夜', 'Day 1 · Night at Base Camp'],
    [86, 150, 'Day 2 · 冲顶', 'Day 2 · Summit push'],
    [150, 175, 'Day 2 · 下撤', 'Day 2 · Descent'],
    [175, 181.5, '归途', 'The way back'],
  ];

  // ---- photographs -----------------------------------------------------
  // kind: cover (full bleed), fit (portrait on a blurred field), pair (two halves)
  const SHOTS = [
    { img: 'night', a: 0.4, b: 9.3, z: [1.18, 1.08], pan: [[0.2, 0.3], [0, 0.1]], dim: 0.62, fi: 2.2 },
    { img: 'cover', a: 8.6, b: 16.4, z: [1.04, 1.12], pan: [[0, 0], [0.15, -0.1]], dim: 0.42, fi: 1.4 },
    { img: 'notes', a: 15.8, b: 34.4, z: [1.06, 1.16], pan: [[-0.3, -0.2], [0.3, 0.2]], dim: 0.78, blur: 10 },
    { img: 'gorge', a: 40.6, b: 47.4, z: [1.04, 1.13], pan: [[0.3, 0], [-0.2, 0]], dim: 0.12 },
    { img: 'tea', a: 46.8, b: 52.9, z: [1.1, 1.02], pan: [[0, 0.2], [0, -0.1]], dim: 0.1 },
    { img: 'riding', img2: 'goats', kind: 'pair', a: 52.3, b: 59.4, z: [1.02, 1.1], pan: [[0, 0.3], [0, -0.2]], dim: 0.1 },
    { img: 'forest', a: 58.8, b: 62.9, z: [1.03, 1.1], pan: [[-0.3, 0], [0.2, 0]], dim: 0.12 },
    { img: 'meadow', a: 62.3, b: 66.0, z: [1.08, 1.02], pan: [[0.2, 0], [-0.1, 0]], dim: 0.12 },
    { img: 'camp', a: 65.4, b: 71.4, z: [1.0, 1.1], pan: [[0, 0], [0.1, 0.1]], dim: 0.12 },
    { img: 'dorm', img2: 'food', kind: 'pair', a: 70.8, b: 76.6, z: [1.02, 1.08], pan: [[0, 0], [0, 0.1]], dim: 0.15 },
    { img: 'night', a: 86.0, b: 93.6, z: [1.0, 1.1], pan: [[-0.2, 0.2], [0.1, 0]], dim: 0.12, fi: 1.6 },
    { img: 'slope', kind: 'fit', a: 118.0, b: 136.6, z: [1.0, 1.06], pan: [[0, 0.2], [0, -0.2]], dim: 0.05, fi: 1.6 },
    { img: 'sign', a: 136.0, b: 141.6, z: [1.0, 1.08], pan: [[0, 0], [0, 0]], dim: 0.05 },
    { img: 'summit', kind: 'fit', dx: 330, a: 141.0, b: 150.5, z: [1.0, 1.05], pan: [[0, 0], [0, -0.1]], dim: 0.05, fi: 0.4 },
    { img: 'axe', a: 149.9, b: 157.4, z: [1.02, 1.12], pan: [[0, 0], [0.2, 0.1]], dim: 0.12 },
    { img: 'streams', a: 156.8, b: 163.4, z: [1.0, 1.0], pan: [[-1, 0], [1, 0]], dim: 0.12 },
    { img: 'porter', a: 162.8, b: 169.4, z: [1.05, 1.12], pan: [[0.2, 0], [-0.1, 0]], dim: 0.1 },
    { img: 'village', a: 168.8, b: 175.4, z: [1.02, 1.1], pan: [[0, 0.2], [0, -0.2]], dim: 0.3 },
    { img: 'boots', kind: 'fit', a: 174.8, b: 181.6, z: [1.0, 1.05], pan: [[0, 0], [0, 0]], dim: 0.1, fo: 1.4 },
  ];
  const blurred = {};

  function photo(ctx, s, t) {
    const o = env(t, s.a, s.b, s.fi ?? 0.6, s.fo ?? 0.6);
    if (!o) return;
    const k = prog(t, s.a, s.b);
    const z = lerp(s.z[0], s.z[1], ease.sine(k));
    const px = lerp(s.pan[0][0], s.pan[1][0], ease.sine(k)), py = lerp(s.pan[0][1], s.pan[1][1], ease.sine(k));
    ctx.save();
    ctx.globalAlpha = o;
    if (s.kind === 'fit') {
      ctx.drawImage(blurred[s.img], 0, 0, W, H);
      const img = imgs[s.img];
      const h = H * z, w = (img.width / img.height) * h;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60;
      ctx.drawImage(img, (W - w) / 2 + (s.dx || 0) + px * 40, (H - h) / 2 + py * 40, w, h);
      ctx.restore();
    } else if (s.kind === 'pair') {
      const half = W / 2 - 4;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, half, H); ctx.clip();
      F.cover(ctx, imgs[s.img], 0, 0, half, H, z, px, py); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(W - half, 0, half, H); ctx.clip();
      F.cover(ctx, imgs[s.img2], W - half, 0, half, H, lerp(s.z[1], s.z[0], ease.sine(k)), -px, -py); ctx.restore();
    } else if (s.blur) {
      ctx.filter = `blur(${s.blur}px)`;
      F.cover(ctx, imgs[s.img], -40, -40, W + 80, H + 80, z, px, py);
      ctx.filter = 'none';
    } else {
      F.cover(ctx, imgs[s.img], 0, 0, W, H, z, px, py);
    }
    if (s.dim) { ctx.fillStyle = `rgba(0,0,0,${s.dim})`; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  // ---- weather and light -------------------------------------------------
  const rainAmt = t => Math.max(
    0.35 * env(t, 41, 76, 1, 1),
    env(t, 76, 86.5, 1, 0.5) * lerp(0.3, 1, ep(t, 80, 84)),
    0.45 * env(t, 86, 107, 0.5, 2),
  );
  const sleetAmt = t => 0.5 * env(t, 105, 118.5, 2, 0.5);
  const snowAmt = t => Math.max(env(t, 117.5, 141.8, 0.8, 0.6), 0.45 * env(t, 141.2, 150.4, 0.3, 0.4), 0.35 * env(t, 149.8, 157.5, 0.4, 1.2));

  function rain(ctx, t, amt, sleet) {
    if (amt <= 0.01) return;
    const n = Math.round(260 * amt);
    ctx.save();
    ctx.strokeStyle = sleet ? 'rgba(230,235,245,0.5)' : 'rgba(200,210,225,0.28)';
    ctx.lineWidth = sleet ? 2 : 1.3;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const r = F.rng(i * 7919)();
      const r2 = F.rng(i * 104729)();
      const speed = sleet ? 520 + r2 * 200 : 1500 + r2 * 900;
      const len = sleet ? 12 : 26 + r2 * 26;
      const y = ((r2 * H * 3 + t * speed) % (H + 200)) - 100;
      const x = ((r * W * 1.3 + y * 0.18) % (W + 100)) - 50;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.18, y - len);
    }
    ctx.stroke();
    ctx.restore();
  }

  function snow(ctx, t, amt) {
    if (amt <= 0.01) return;
    const n = Math.round(420 * amt);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const rr = F.rng(i * 15485863);
      const r1 = rr(), r2 = rr(), r3 = rr();
      const depth = 0.3 + r3 * 0.7;
      const vx = -380 * depth - 120, vy = 160 * depth + 60;
      const x = (((r1 * W * 4 + t * vx) % (W + 100)) + W + 100) % (W + 100) - 50 + F.noise(t * 0.8 + i, 3) * 20;
      const y = (r2 * H * 4 + t * vy) % (H + 60) - 30;
      ctx.globalAlpha = (0.25 + 0.6 * depth) * Math.min(1, amt * 1.5);
      ctx.beginPath(); ctx.arc(x, y, 1 + depth * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // A line of headlamps zigzagging up a dark slope.
  function headlamps(ctx, t) {
    const o = env(t, 92.6, 111.5, 1.2, 2.5);
    if (!o) return;
    const path = s => {
      // switchbacks from bottom centre to the top
      const turns = 7;
      const seg = s * turns, i = Math.floor(seg), f = seg - i;
      const x0 = i % 2 ? 1250 : 700, x1 = i % 2 ? 700 : 1250;
      const y = lerp(1150, 140, s) + Math.sin(s * 40) * 6;
      return [lerp(x0, x1, ease.sine(f)) + (s * 300 - 150), y];
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const r = F.rng(i * 31337);
      const s0 = r(), sp = 0.004 + r() * 0.002;
      const s = (s0 + (t - 92) * sp) % 1;
      const [x, y] = path(s);
      const far = s;  // higher on the slope = further away
      const flick = 0.75 + 0.25 * F.noise(t * 3 + i, 9);
      const size = lerp(5, 1.2, far);
      ctx.globalAlpha = o * flick * lerp(0.95, 0.35, far);
      const g = ctx.createRadialGradient(x, y, 0, x, y, size * 7);
      g.addColorStop(0, 'rgba(255,248,225,1)');
      g.addColorStop(0.18, 'rgba(255,236,190,0.55)');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, size * 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // our own lamp: a soft cone at the bottom
    ctx.save();
    ctx.globalAlpha = o * 0.5;
    const g = ctx.createRadialGradient(W / 2, H + 60, 10, W / 2, H + 60, 520);
    g.addColorStop(0, 'rgba(255,240,210,0.35)');
    g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Night, dawn and the ridge between the night push and the slope photo.
  function sky(ctx, t) {
    const o = env(t, 75.6, 119, 0.8, 1.2);
    if (!o) return;
    const dawn = ep(t, 108, 117);
    ctx.save();
    ctx.globalAlpha = o;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${lerp(4, 70, dawn)},${lerp(6, 82, dawn)},${lerp(10, 100, dawn)})`);
    g.addColorStop(0.65, `rgb(${lerp(6, 120, dawn)},${lerp(8, 128, dawn)},${lerp(12, 138, dawn)})`);
    g.addColorStop(1, `rgb(${lerp(3, 40, dawn)},${lerp(4, 44, dawn)},${lerp(6, 50, dawn)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // ridge
    const ridge = ep(t, 104, 112);
    if (ridge) {
      ctx.globalAlpha = o * ridge;
      ctx.fillStyle = `rgb(${lerp(8, 30, dawn)},${lerp(9, 33, dawn)},${lerp(12, 38, dawn)})`;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) {
        const y = 560 + 120 * Math.sin(x / 380 + 1.2) * 0.6 - 260 * Math.exp(-Math.pow((x - 1180) / 380, 2)) + F.noise(x / 60, 4) * 22 + F.noise(x / 13, 8) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---- type --------------------------------------------------------------
  const CAPTIONS = [
    [16.6, 22, '九月二十日定下行程，出发前只有七天可以准备。', 'Plans were fixed on September 20, with seven days to get ready.'],
    [22, 27.6, '台风桦加沙逼近香港，所有物资改寄丽江的酒店。', 'Typhoon Ragasa was bearing down on Hong Kong, so every package went to the hotel in Lijiang.'],
    [27.6, 33.6, '体能训练：爬楼梯。爬到楼顶，坐电梯下来，再爬。', 'Training: stairs. Climb to the roof, ride the lift down, climb again.'],
    [34.8, 40.4, '22:00 抵达丽江，拆快递到凌晨一点，只睡了 4.5 小时。', 'Landed in Lijiang at 22:00, unpacked parcels until 1 a.m., slept 4.5 hours.'],
    [41.0, 47.0, '6:00 出发。车子经过虎跳峡，云雾之中也很美。', 'Off at 6:00. The road passed Tiger Leaping Gorge, beautiful even in the mist.'],
    [47.0, 52.6, '进村时阴雨纷纷，有点头晕。阿叔现熬的酥油茶。', 'Rain in Haba Village, and a light head. An uncle’s fresh butter tea.'],
    [52.6, 59.0, '骑上骡子，哈巴雪山之旅正式开始。', 'Onto the mules. The journey had begun.'],
    [59.0, 65.4, '雨雾泥泞的林间，一路颠簸向上 1200 米。', 'Through misty, muddy forest, 1,200 meters of jolting climb.'],
    [65.6, 71.0, '大本营的棱角，终于从雾中浮现。', 'At last the outline of Base Camp appeared out of the fog.'],
    [71.0, 76.2, '八个人挤一间上下铺。饭菜，意外地好。', 'Eight men to a bunk room. The food, surprisingly good.'],
    [86.6, 92.4, '2:59，出发。黑暗中，已经有很多摇曳的光点。', '2:59, out the door. Up in the dark, many lights were already swaying.'],
    [105.6, 110.8, '4500 米，避风小屋。开始打颤，失温的威胁清晰了。', '4,500 m, the wind shelter. I started to shiver; hypothermia was real.'],
    [110.8, 114.4, '天开始蒙蒙亮。', 'The sky began to lighten.'],
    [114.4, 118.2, '碎石坡：冰爪、冰镐、手脚并用。', 'The scree: crampons, ice axe, hands and feet.'],
    [118.6, 123.6, '雪线之上，绝望坡：4900 到 5300 米。', 'Above the snow line, the Slope of Despair: 4,900 to 5,300 m.'],
    [129.8, 135.8, '体力持续消耗，七八步、五六步，就得停一停。', 'Then I had to stop after seven or eight steps, then five or six.'],
    [136.4, 141.4, '终于，前面的人说看到牌子了。', 'At last, someone ahead said they could see the sign.'],
    [143.4, 149.8, '从三点到九点半，齐整的 6 个半小时。', 'From three to half past nine: six and a half hours, exactly.'],
    [150.2, 157.0, '上山容易下山难。雪会跟你的脚讨价还价。', 'Going down is harder. The snow bargains with your feet.'],
    [157.0, 163.0, '不再有雪的路段，掏出登山杖，力气莫名地回来了。', 'Off the snow, out came the trekking poles, and strength came back.'],
    [163.0, 169.0, '协作小哥说：今天天气不好，但还是上去了。', 'My guide said the weather was bad that day, but we still made it up.'],
    [169.4, 175.0, '14:30 回到大本营。当天的登顶率，大约 15%–20%。', 'Back at Base Camp at 14:30. That day, about 15–20% reached the top.'],
    [175.2, 181.0, '没有干袜子了，光着脚穿着拖鞋，上了回丽江的车。', 'No dry socks left: barefoot in slippers, onto the car back to Lijiang.'],
  ];
  // Centered lines in the serif; [a, b, zh, en, size, y]
  const LINES = [
    [1.4, 8.6, '凌晨 2:59', '2:59 a.m.', 64, 470],
    [3.4, 8.6, '出门的瞬间，我按下了手表。', 'The moment I stepped outside, I pressed start on my watch.', 44, 580],
    [76.6, 79.6, '19:30，躺下。', '19:30. Lights out.', 54, 540],
    [79.6, 82.6, '醒来以为睡了很久，看表：21:30。', 'I woke thinking I’d slept for hours. 21:30.', 54, 540],
    [82.6, 86.2, '头痛到睡不着。一点过，下起了大雨。', 'Too much headache to sleep. After one, heavy rain.', 54, 540],
    [93.6, 97.6, '黑夜、交织的头灯、细雨、冷风、汗水、喘气声。', 'Darkness, tangled headlamps, fine rain, cold wind, sweat, breathing.', 48, 540],
    [97.6, 100.2, '继续向上吧。', 'Keep going up.', 60, 540],
    [100.2, 102.8, '继续向上吧。', 'Keep going up.', 60, 540],
    [102.8, 105.6, '继续向上吧。', 'Keep going up.', 60, 540],
    [181.8, 186.4, '为什么要爬山？', 'Why climb mountains?', 64, 540],
    [186.4, 191.6, '因为挑战，也因为美景；因为我与山均在。', 'For the challenge, and the scenery. Because the mountain and I are both here.', 50, 540],
    [191.6, 198.4, '只要还能从中找到价值和意义，\n那就继续爬山吧，直到不得不停下来为止。', 'As long as it still means something,\nkeep climbing, until you truly have to stop.', 50, 510],
  ];
  // the crampon rhythm on the Slope of Despair, one word per step
  const STEPS = L === 'en'
    ? ['Axe in,', 'left foot,', 'right foot,', 'stop,', 'bow.']
    : ['双手一插，', '左脚，', '右脚，', '停，', '再叩首。'];
  const STEP0 = 124.0, STEP = 0.9;

  function captions(ctx, t) {
    for (const [a, b, zh, en] of CAPTIONS) {
      const o = env(t, a, b, 0.35, 0.35);
      if (!o) continue;
      // a soft band so captions read over snow
      ctx.save();
      ctx.globalAlpha = o * 0.55;
      const g = ctx.createLinearGradient(0, H - 260, 0, H);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, H - 260, W, 260);
      ctx.restore();
      F.text(ctx, S(zh, en), W / 2, 1000, { size: L === 'en' ? 36 : 38, weight: 500, align: 'center', alpha: o, maxWidth: 1400, valign: 'bottom', lineHeight: 1.35, shadow: 'rgba(0,0,0,0.8)', shadowBlur: 12 });
    }
  }

  function lines(ctx, t) {
    for (const [a, b, zh, en, size, y] of LINES) {
      const o = env(t, a, b, 0.7, 0.6);
      if (!o) continue;
      const rise = (1 - ease.out(prog(t, a, a + 1))) * 10;
      F.text(ctx, S(zh, en), W / 2, y + rise, { size: L === 'en' ? size * 0.88 : size, weight: 500, family: F.SERIF, align: 'center', alpha: o, maxWidth: 1500, valign: 'middle', lineHeight: 1.6, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 20 });
    }
  }

  function title(ctx, t) {
    const o = env(t, 9.4, 16.2, 1, 0.8);
    if (!o) return;
    F.text(ctx, S('文章 · 2026', 'Essay · 2026'), W / 2, 420, { size: 26, weight: 500, align: 'center', color: ACC, alpha: o, spacing: 4 });
    F.text(ctx, S('我的哈巴雪山之旅', 'My Haba Snow Mountain Journey'), W / 2, 545, { size: L === 'en' ? 96 : 112, weight: 600, family: F.SERIF, align: 'center', alpha: o, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 30 });
    F.text(ctx, S('5,396 m · 两天一夜', '5,396 m · two days, one night'), W / 2, 625, { size: 36, weight: 500, align: 'center', alpha: o * ep(t, 10.4, 11.4), color: INK });
  }

  function prepCards(ctx, t) {
    const o = env(t, 16.4, 34.2, 0.6, 0.8);
    if (!o) return;
    const cards = [
      [17.0, S('7 天', '7 days'), S('准备时间', 'to prepare')],
      [22.4, S('10 个快递', '10 parcels'), S('8 完好 · 1 破损 · 1 丢失', '8 fine · 1 damaged · 1 lost')],
      [28.0, S('5 次爬楼', '5 stair sessions'), S('每次约 100 层 · 300 米爬升', 'about 100 floors · 300 m each')],
    ];
    cards.forEach(([t0, big, small], i) => {
      const k = ep(t, t0, t0 + 0.9, ease.out);
      if (!k) return;
      const x = 300 + i * 460;
      F.text(ctx, big, x, 520 + (1 - k) * 20, { size: 76, weight: 700, alpha: o * k });
      F.text(ctx, small, x, 580 + (1 - k) * 20, { size: 28, weight: 500, color: DIM, alpha: o * k });
      ctx.save(); ctx.globalAlpha = o * k; ctx.fillStyle = ACC; ctx.fillRect(x, 410, 46 * k, 4); ctx.restore();
    });
    F.text(ctx, S('行前准备', 'Getting ready'), 300, 360, { size: 30, weight: 600, color: ACC, alpha: o * ep(t, 16.6, 17.4), spacing: 2 });
  }

  function day0(ctx, t) {
    const o = env(t, 34.2, 41, 0.6, 0.8);
    if (!o) return;
    ctx.save(); ctx.globalAlpha = o; ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H); ctx.restore();
    // the flight: a dotted arc from sea level to Lijiang
    const k = ep(t, 35, 39.5);
    ctx.save();
    ctx.globalAlpha = o;
    ctx.strokeStyle = 'rgba(244,243,239,0.85)'; ctx.lineWidth = 4; ctx.setLineDash([2, 13]); ctx.lineCap = 'round';
    ctx.beginPath();
    const N = 80;
    for (let i = 0; i <= N * k; i++) {
      const s = i / N;
      const x = lerp(420, 1500, s), y = lerp(700, 470, s) - Math.sin(Math.PI * s) * 160;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    F.text(ctx, S('香港 · 0 m', 'Hong Kong · 0 m'), 420, 750, { size: 30, weight: 600, align: 'center', alpha: o });
    F.text(ctx, S('丽江 · 2,400 m', 'Lijiang · 2,400 m'), 1500, 430, { size: 30, weight: 600, align: 'center', alpha: o * ep(t, 39, 39.8) });
  }

  function slopeData(ctx, t) {
    const o = env(t, 119.4, 124.0, 0.8, 0.5);
    if (!o) return;
    const x = 1400, y = 240;
    ctx.save();
    ctx.globalAlpha = o * 0.78; ctx.fillStyle = 'rgba(10,12,16,0.82)';
    F.roundRect(ctx, x - 40, y - 70, 470, 400, 18); ctx.fill();
    ctx.restore();
    F.text(ctx, S('绝望坡', 'Slope of Despair'), x, y, { size: 30, weight: 700, color: ACC, alpha: o });
    const rows = [
      [S('坡度', 'Gradient'), S('约 45°', 'about 45°')],
      [S('爬升', 'Climb'), '4,900 → 5,300 m'],
      [S('积雪', 'Snow'), '20–30 cm'],
      [S('能见度', 'Visibility'), S('几十米', 'tens of meters')],
    ];
    rows.forEach(([k, v], i) => {
      const a = o * ep(t, 120 + i * 0.5, 120.8 + i * 0.5);
      F.text(ctx, k, x, y + 70 + i * 66, { size: 26, color: DIM, alpha: a });
      F.text(ctx, v, x + 390, y + 70 + i * 66, { size: 32, weight: 600, align: 'right', alpha: a });
    });
  }

  function stepsRhythm(ctx, t) {
    const o = env(t, STEP0 - 0.2, STEP0 + STEPS.length * STEP + 1.6, 0.2, 0.6);
    if (!o) return;
    const size = L === 'en' ? 56 : 66;
    const widths = STEPS.map(s => F.measure(ctx, s, { size, weight: 600, family: F.SERIF }) + 18);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = W / 2 - total / 2;
    ctx.save();
    ctx.globalAlpha = o * 0.7; ctx.fillStyle = 'rgba(8,10,14,0.85)';
    F.roundRect(ctx, x - 48, 560 - size - 34, total + 96 - 18, size + 80, 20); ctx.fill();
    ctx.restore();
    STEPS.forEach((s, i) => {
      const ti = STEP0 + i * STEP;
      const k = ep(t, ti, ti + 0.25, ease.out);
      const settle = 1 - ep(t, ti + 0.25, ti + 0.7);
      if (k) F.text(ctx, s, x, 560 - (1 - k) * 14, { size, weight: 600, family: F.SERIF, alpha: o * k, color: settle > 0.05 ? ACC : INK, shadow: 'rgba(0,0,0,0.7)', shadowBlur: 22 });
      x += widths[i];
    });
  }

  function summitMark(ctx, t) {
    const o = env(t, 141.4, 150, 0.5, 0.8);
    if (!o) return;
    const k = ep(t, 141.4, 142.6, ease.out);
    F.text(ctx, '5,396', 180, 560, { size: 150, weight: 800, alpha: o * k, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 30 });
    F.text(ctx, 'm', 180 + F.measure(ctx, '5,396', { size: 150, weight: 800 }) + 14, 560, { size: 56, weight: 600, alpha: o * k });
    F.text(ctx, S('10.01  09:31 · 登顶', '10.01  09:31 · summit'), 186, 630, { size: 34, weight: 600, color: ACC, alpha: o * ep(t, 142.2, 143) });
  }

  function campStats(ctx, t) {
    const o = env(t, 170, 175, 0.6, 0.6);
    if (!o) return;
    const items = [
      ['11.5 h', S('冲顶往返', 'summit and back')],
      ['15–20%', S('当天登顶率', 'reached the top that day')],
    ];
    items.forEach(([big, small], i) => {
      const k = ep(t, 170.2 + i * 0.6, 171 + i * 0.6, ease.out);
      const x = 560 + i * 560;
      F.text(ctx, big, x, 520, { size: 104, weight: 800, align: 'center', alpha: o * k, shadow: 'rgba(0,0,0,0.5)', shadowBlur: 24 });
      F.text(ctx, small, x, 580, { size: 30, weight: 500, align: 'center', color: INK, alpha: o * k, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 12 });
    });
  }

  // ---- the corner instrument: chapter, elevation, clock, profile ----------
  const PROFILE_T = [34, 181];
  function profilePath(ctx, x, y, w, h, upto) {
    ctx.beginPath();
    const [t0, t1] = PROFILE_T;
    for (let i = 0; i <= 240; i++) {
      const tt = lerp(t0, t1, i / 240);
      if (tt > upto) break;
      const px = x + (i / 240) * w, py = y + h - (elev(tt) / 5396) * h;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  }

  function hud(ctx, t) {
    const o = env(t, 34.4, 181.8, 0.8, 0.8);
    if (!o) return;
    const x = 88, y = 92;
    let label = '';
    for (const [a, b, zh, en] of CHAPTERS) if (t >= a && t < b) label = S(zh, en);
    ctx.save();
    ctx.globalAlpha = o * 0.5;
    const g = ctx.createRadialGradient(240, 150, 20, 240, 150, 420);
    g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 760, 420);
    ctx.restore();
    F.text(ctx, label, x, y, { size: 24, weight: 600, color: ACC, alpha: o, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 10 });
    const raw = Math.round(elev(t));
    const e = raw >= 5390 ? raw : Math.round(raw / 10) * 10;   // the summit reads exactly
    const es = e.toLocaleString('en-US');
    F.text(ctx, es, x, y + 78, { size: 68, weight: 700, alpha: o, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 16 });
    F.text(ctx, 'm', x + F.measure(ctx, es, { size: 68, weight: 700 }) + 10, y + 78, { size: 30, weight: 600, alpha: o });
    F.text(ctx, clock(t), x, y + 120, { size: 26, weight: 500, family: F.SANS, color: DIM, alpha: o, shadow: 'rgba(0,0,0,0.6)', shadowBlur: 10 });
    // profile
    const px = x, py = y + 150, pw = 340, ph = 64;
    ctx.save();
    ctx.globalAlpha = o;
    ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(244,243,239,0.18)';
    profilePath(ctx, px, py, pw, ph, Infinity); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,243,239,0.9)';
    profilePath(ctx, px, py, pw, ph, t); ctx.stroke();
    const k = prog(t, ...PROFILE_T);
    const dx = px + k * pw, dy = py + ph - (elev(t) / 5396) * ph;
    ctx.fillStyle = ACC; ctx.shadowColor = ACC; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(dx, dy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function endCard(ctx, t) {
    const o = env(t, 198.6, DURATION + 1, 1.2, 0.1);
    if (!o) return;
    const x = 460, y = 300, w = 1000, h = 280;
    const k = ep(t, 198.8, 202.2);
    ctx.save();
    ctx.globalAlpha = o;
    ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(244,243,239,0.85)';
    profilePath(ctx, x, y, w, h, lerp(PROFILE_T[0], PROFILE_T[1], k)); ctx.stroke();
    ctx.restore();
    // summit marker
    const ts = 141;
    const sx = x + prog(ts, ...PROFILE_T) * w, sy = y;
    const sk = ep(t, 200.4, 201.2);
    ctx.save(); ctx.globalAlpha = o * sk; ctx.fillStyle = ACC; ctx.shadowColor = ACC; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    F.text(ctx, '5,396 m', sx, sy - 26, { size: 28, weight: 700, align: 'center', color: ACC, alpha: o * sk });
    F.text(ctx, S('我的哈巴雪山之旅', 'My Haba Snow Mountain Journey'), W / 2, 720, { size: L === 'en' ? 60 : 68, weight: 600, family: F.SERIF, align: 'center', alpha: o * ep(t, 201, 202.2) });
    F.text(ctx, S('全文：simoncos.github.io', 'Read it at simoncos.github.io'), W / 2, 790, { size: 30, weight: 500, align: 'center', color: DIM, alpha: o * ep(t, 201.6, 202.6) });
  }

  function draw(ctx, t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    sky(ctx, t);
    for (const s of SHOTS) photo(ctx, s, t);
    headlamps(ctx, t);
    rain(ctx, t, rainAmt(t), false);
    rain(ctx, t, sleetAmt(t), true);
    snow(ctx, t, snowAmt(t));
    day0(ctx, t);
    title(ctx, t);
    prepCards(ctx, t);
    slopeData(ctx, t);
    stepsRhythm(ctx, t);
    summitMark(ctx, t);
    campStats(ctx, t);
    lines(ctx, t);
    hud(ctx, t);
    captions(ctx, t);
    endCard(ctx, t);
    // letterbox-free vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1200);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  let imgs = {};
  const strings = [
    ...CAPTIONS.map(c => (L === 'en' ? c[3] : c[2])),
    ...LINES.map(c => (L === 'en' ? c[3] : c[2])),
    ...CHAPTERS.map(c => (L === 'en' ? c[3] : c[2])),
    STEPS.join(''),
    '文章我的哈巴雪山之旅两天一夜行前准备天快递完好破损丢失次爬楼每次约层米爬升准备时间香港丽江绝望坡坡度积雪能见度几十冲顶往返当天登顶率全文',
    'Essay My Haba Snow Mountain Journey two days one night Getting ready parcels fine damaged lost stair sessions about floors each to prepare Hong Kong Lijiang Slope of Despair Gradient Climb Snow Visibility tens meters summit and back reached the top that day Read it at',
  ];
  const events = [];
  STEPS.forEach((_, i) => events.push({ t: STEP0 + i * STEP, kind: 'step', i }));
  const film = F.create({
    width: W, height: H, duration: DURATION, images, strings, draw,
    fonts: [[500, F.SANS], [600, F.SANS], [700, F.SANS], [800, F.SANS], [500, F.SERIF], [600, F.SERIF]],
    init: ({ images: loaded }) => {
      imgs = loaded;
      for (const s of SHOTS) {
        if (s.kind !== 'fit' || blurred[s.img]) continue;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const cx = c.getContext('2d');
        cx.filter = 'blur(48px) brightness(0.55)';
        F.cover(cx, loaded[s.img], -120, -120, W + 240, H + 240, 1.1);
        blurred[s.img] = c;
      }
    },
  });
  film.events = events;
  film.curves = { rain: rainAmt, sleet: sleetAmt, snow: snowAmt };
})();
