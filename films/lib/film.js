// Shared drawing kit for the article films. Each film page loads this, then
// calls Film.create({...}) with its size, duration, images, strings and a
// draw(ctx, t) function. render.mjs drives window.__film.render(t) per frame.
(function () {
  const F = {};

  F.lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';

  F.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  F.lerp = (a, b, t) => a + (b - a) * t;
  // 0 → 1 as x goes a → b, clamped.
  F.prog = (x, a, b) => (b === a ? (x >= b ? 1 : 0) : F.clamp((x - a) / (b - a)));
  F.ease = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - Math.pow(1 - t, 3),
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    sine: t => 0.5 - 0.5 * Math.cos(Math.PI * t),
    expoOut: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    back: t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  };
  // Eased progress between a and b.
  F.ep = (x, a, b, e = F.ease.inOut) => e(F.prog(x, a, b));
  // Opacity envelope: fades in over [a, a+fi], out over [b-fo, b].
  F.env = (t, a, b, fi = 0.5, fo = 0.5) =>
    t < a || t > b ? 0 : Math.min(F.ease.sine(F.prog(t, a, a + fi)), 1 - F.ease.sine(F.prog(t, b - fo, b)));

  F.rng = seed => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  // Smooth 1-D value noise, deterministic.
  F.noise = (x, seed = 0) => {
    const h = n => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return F.lerp(h(i), h(i + 1), u) * 2 - 1;
  };

  F.SANS = '"Inter Variable", "Noto Sans SC Variable", sans-serif';
  F.SERIF = '"Noto Serif SC Variable", serif';
  F.MONO = '"JetBrains Mono Variable", "Noto Sans SC Variable", monospace';
  F.font = (size, weight = 400, family = F.SANS) => `${weight} ${size}px ${family}`;

  F.rgba = (hex, a = 1) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // Text. Options: size, weight, family, color, alpha, align, baseline, spacing (px), maxWidth, lineHeight.
  F.text = (ctx, str, x, y, o = {}) => {
    const size = o.size || 40;
    ctx.save();
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    ctx.font = F.font(size, o.weight || 400, o.family || F.SANS);
    ctx.fillStyle = o.color || '#f2f2ef';
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    ctx.letterSpacing = `${o.spacing || 0}px`;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur || 24; }
    const lines = o.maxWidth ? F.wrap(ctx, str, o.maxWidth) : String(str).split('\n');
    const lh = (o.lineHeight || 1.45) * size;
    let y0 = y;
    if (o.valign === 'middle') y0 = y - ((lines.length - 1) * lh) / 2;
    if (o.valign === 'bottom') y0 = y - (lines.length - 1) * lh;
    lines.forEach((line, i) => ctx.fillText(line, x, y0 + i * lh));
    ctx.restore();
    return lines.length * lh;
  };

  F.measure = (ctx, str, o = {}) => {
    ctx.save();
    ctx.font = F.font(o.size || 40, o.weight || 400, o.family || F.SANS);
    ctx.letterSpacing = `${o.spacing || 0}px`;
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  };

  // Line breaking that works for Chinese (any character) and English (words).
  // Keeps closing punctuation off the start of a line.
  F.wrap = (ctx, str, maxWidth) => {
    const out = [];
    for (const para of String(str).split('\n')) {
      const tokens = para.match(/[A-Za-z0-9%.,:;!?'’"“”()\-–—/+=<>×·…]+\s*|\s+|./gu) || [''];
      let line = '';
      for (const tok of tokens) {
        const next = line + tok;
        if (ctx.measureText(next.trimEnd()).width > maxWidth && line.trim()) {
          if (/^[，。、；：！？）」』”’,.;:!?)]/.test(tok)) { line = next; continue; }
          out.push(line.trimEnd());
          line = tok.trimStart();
        } else line = next;
      }
      out.push(line.trimEnd());
    }
    return out;
  };

  // Draw an image to cover a box, with zoom (1 = cover) and pan in [-1, 1].
  F.cover = (ctx, img, x, y, w, h, zoom = 1, panX = 0, panY = 0) => {
    const s = Math.max(w / img.width, h / img.height) * zoom;
    const iw = img.width * s, ih = img.height * s;
    const ox = x + (w - iw) / 2 + panX * Math.max(0, (iw - w) / 2);
    const oy = y + (h - ih) / 2 + panY * Math.max(0, (ih - h) / 2);
    ctx.drawImage(img, ox, oy, iw, ih);
  };
  // Draw an image to fit inside a box.
  F.contain = (ctx, img, x, y, w, h, zoom = 1) => {
    const s = Math.min(w / img.width, h / img.height) * zoom;
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    return { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih };
  };

  F.roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  F.loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });

  // Film.create({ width, height, duration, images: {key: url}, strings: [..], fonts: [[size, weight, family]], draw })
  F.create = spec => {
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const images = {};
    const ready = (async () => {
      const text = (spec.strings || []).join('') + '0123456789%.,:;-–—+=<>×÷·…/()abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ';
      const families = spec.fonts || [[400, F.SANS], [700, F.SANS]];
      await Promise.all(families.map(([w, fam]) => document.fonts.load(F.font(40, w, fam), text)));
      await document.fonts.ready;
      await Promise.all(Object.entries(spec.images || {}).map(async ([k, url]) => { images[k] = await F.loadImage(url); }));
      if (spec.init) await spec.init({ ctx, images });
      return true;
    })();
    window.__film = {
      width: spec.width,
      height: spec.height,
      duration: spec.duration,
      ready,
      render: async t => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        spec.draw(ctx, t, images);
        ctx.restore();
      },
    };
    // Scrub preview in a normal browser: ?t=12.5 or drag across the canvas.
    const q = new URLSearchParams(location.search);
    if (q.has('preview')) {
      canvas.style.width = '100%';
      ready.then(() => {
        let t = Number(q.get('t') || 0);
        const show = () => window.__film.render(t);
        canvas.addEventListener('mousemove', e => { t = (e.offsetX / canvas.clientWidth) * spec.duration; show(); });
        show();
      });
    }
    return window.__film;
  };

  window.Film = F;
})();
