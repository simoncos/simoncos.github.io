#!/usr/bin/env node
// Load site pages in system Chrome and report one line per page and width.
//
//   node check_pages.cjs <base-url> <path> [<path> ...]
//   node check_pages.cjs http://127.0.0.1:8048/ blogs/tracing-back.html blogs/tracing-back.en.html
//   SLUGS=tracing-back,my-hands node check_pages.cjs http://127.0.0.1:8048/
//
// SLUGS=a,b expands to blogs/a.html and blogs/a.en.html for each slug.
// WIDTHS=390,1280 (default). DARK=1 adds a dark-mode pass at the first width.
// Requests to other origins are aborted, so Google Fonts cannot hang a load.
// A live base gets a cache-busting query, since Pages caches for up to 600 s.
//
// Checks: HTTP 200, no page errors, no horizontal overflow, every article image
// and video poster loads and has alt text. Prints the H1 and the Created date so
// titles and dates can be compared with the QA record. Exits 1 on any failure.
//
// macOS has no `timeout`; wrap the run: perl -e 'alarm 150; exec @ARGV' node check_pages.cjs ...

const fs = require('fs');
const os = require('os');
const path = require('path');

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_PATH, 'playwright'];
  const npx = path.join(os.homedir(), '.npm/_npx');
  if (fs.existsSync(npx)) {
    for (const dir of fs.readdirSync(npx)) tries.push(path.join(npx, dir, 'node_modules/playwright'));
  }
  for (const t of tries.filter(Boolean)) {
    try { return require(t); } catch (e) { /* next */ }
  }
  throw new Error('Playwright not found. Run `npx playwright --version` once, or set PLAYWRIGHT_PATH.');
}

const [base, ...args] = process.argv.slice(2);
if (!base) {
  console.error('usage: node check_pages.cjs <base-url> <path> [<path> ...]');
  process.exit(2);
}
const paths = [...args];
for (const slug of (process.env.SLUGS || '').split(',').filter(Boolean)) {
  paths.push(`blogs/${slug}.html`, `blogs/${slug}.en.html`);
}
const widths = (process.env.WIDTHS || '390,1280').split(',').map(Number);
const origin = new URL(base).origin;
const live = !/^https?:\/\/(127\.0\.0\.1|localhost)/.test(origin);

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ channel: 'chrome' });
  const passes = widths.map((w) => ({ w, dark: false }));
  if (process.env.DARK) passes.push({ w: widths[0], dark: true });
  let failures = 0;
  for (const { w, dark } of passes) {
    const mobile = w < 768;
    const ctx = await browser.newContext({
      viewport: { width: w, height: 900 }, isMobile: mobile, hasTouch: mobile,
      colorScheme: dark ? 'dark' : 'light',
    });
    await ctx.route((url) => url.origin !== origin, (route) => route.abort());
    for (const p of paths) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
      let url = new URL(p, base).href;
      if (live) url += (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
      const res = await page.goto(url, { waitUntil: 'load' });
      const r = await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('.post-content img, main img')];
        imgs.forEach((img) => { img.loading = 'eager'; });
        await Promise.all(imgs.map((img) => (img.complete ? 0 : new Promise((ok) => { img.onload = img.onerror = ok; }))));
        const videos = [...document.querySelectorAll('.post-content video')];
        return {
          h1: (document.querySelector('h1.article-title') || document.querySelector('h1'))?.textContent.trim().replace(/\s+/g, ' '),
          created: document.querySelector('.article-meta .meta-item .num')?.textContent.trim(),
          imgs: imgs.length,
          broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.src.split('/').pop()),
          noAlt: imgs.filter((i) => !i.alt.trim()).map((i) => i.src.split('/').pop()),
          videos: videos.length,
          noPoster: videos.filter((v) => !v.poster).length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      const problems = [];
      if (res.status() !== 200) problems.push(`status ${res.status()}`);
      if (r.broken.length) problems.push(`broken ${r.broken.join(' ')}`);
      if (r.noAlt.length) problems.push(`no alt ${r.noAlt.join(' ')}`);
      if (r.noPoster) problems.push(`${r.noPoster} video(s) without poster`);
      if (r.overflow > 0) problems.push(`overflow ${r.overflow}px`);
      if (errors.length) problems.push(`errors ${errors.join('; ')}`);
      if (problems.length) failures++;
      const tag = `${w}${dark ? ' dark' : ''}`;
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${tag} ${p} | ${r.created || '-'} | ${r.h1 || '-'} | imgs ${r.imgs} videos ${r.videos}${problems.length ? ' | ' + problems.join(' | ') : ''}`);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `${failures} failing loads` : `all ${passes.length * paths.length} loads ok`);
  process.exit(failures ? 1 : 0);
})();
