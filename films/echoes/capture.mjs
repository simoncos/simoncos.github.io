#!/usr/bin/env node
// Screenshots of the real game for the promo, taken in a fresh state so no
// answer is ever on screen: the phone card at the start, and the desktop card.
// Writes films/echoes/out/shots/*.png and boxes.json (element boxes in the
// phone shot, in image pixels) for the scene's overlays.
//
//   node films/echoes/capture.mjs [--lang zh|en]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fonts = path.resolve(here, '../node_modules/@fontsource-variable');
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'zh';
const outDir = path.join(here, 'out', 'shots');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = url.startsWith('/fonts/') ? path.join(fonts, url.slice(7)) : path.join(root, url);
  try { res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// The clue face is a serif that phones have (Songti SC) and this container lacks.
const FONT_CSS = `
@import url('/fonts/noto-serif/wght.css');
@import url('/fonts/noto-serif-sc/wght.css');
@import url('/fonts/noto-sans-sc/wght.css');
@import url('/fonts/inter/wght.css');
`;

async function open(browser, viewport, mobile) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 3, isMobile: mobile, hasTouch: mobile });
  await page.addInitScript(() => {
    localStorage.setItem('simoncos-endless-echoes-v1-computer-tip', 'closed');
    localStorage.setItem('simoncos-endless-echoes-v1-sound', 'off');
  });
  await page.goto(`${base}/gallery/music/endless-echoes.html?lang=${lang}`);
  await page.addStyleTag({ content: FONT_CSS });
  await page.evaluate(async () => {
    // wherever the page asks for its clue serif, use the web serif instead
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).fontFamily.includes('Iowan')) el.style.fontFamily = "'Noto Serif Variable', 'Noto Serif SC Variable', serif";
    }
    await document.fonts.ready;
  });
  await page.waitForTimeout(1200);
  return page;
}

const browser = await chromium.launch();
await mkdir(outDir, { recursive: true });
try {
  // phone: the game card at the start
  const phone = await open(browser, { width: 390, height: 844 }, true);
  const card = phone.locator('#echo-game');
  await card.scrollIntoViewIfNeeded();
  await phone.waitForTimeout(400);
  await card.screenshot({ path: path.join(outDir, `phone-${lang}.png`) });
  const boxes = await phone.evaluate(() => {
    const cardBox = document.querySelector('#echo-game').getBoundingClientRect();
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.left - cardBox.left, r.top - cardBox.top, r.width, r.height].map(v => Math.round(v * 3)); };
    const visible = sel => [...document.querySelectorAll(sel)].find(e => e.getBoundingClientRect().width > 0);
    return {
      card: [0, 0, Math.round(cardBox.width * 3), Math.round(cardBox.height * 3)],
      song: box(visible('#echo-song')),
      clue: box(visible('#echo-clue')),
      pips: box(visible('#echo-pips')),
      input: box(visible('#echo-answer')),
      submit: box(visible('#echo-form button[type=submit]')),
      hint: box(visible('#echo-hint summary')),
      reveal: box(visible('#echo-reveal summary')),
      flower: box(visible('[data-clue-flower]')),
      exits: [...document.querySelectorAll('[data-focus-side="out"], .echo-focus-node')]
        .filter(e => e.getBoundingClientRect().width > 0).map(box),
      keys: box(visible('.echo-keys')),
    };
  });
  await writeFile(path.join(outDir, `boxes-${lang}.json`), JSON.stringify(boxes, null, 1));
  console.log(boxes);

  // desktop: the whole card, clue beside the map
  const desk = await open(browser, { width: 1600, height: 1000 }, false);
  const dcard = desk.locator('#echo-game');
  await dcard.scrollIntoViewIfNeeded();
  await desk.waitForTimeout(400);
  await dcard.screenshot({ path: path.join(outDir, `desktop-${lang}.png`) });
} finally {
  await browser.close();
  server.close();
}
