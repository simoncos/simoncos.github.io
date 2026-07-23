# Slide Deck Visual Verification

Use this when a published HTML talk deck changed layout, screenshots, assets, appendix/resource pages, animations, slide order, or contact/QR pages.

## Source-of-truth rule

Default workflow is **Obsidian canonical source → `simoncos.github.io` site artifact**:

```text
~/Documents/obsidian/simoncos/Write/Talk-YYYY-MM-DD/
└── Talk-YYYY-MM-DD-assets/web-swiss-merged/   # canonical deck dir
    ├── index.html
    ├── images/
    └── assets/

~/Documents/simoncos.github.io/gallery/talks/<talk-slug>/  # deploy artifact
```

If a site/deployed copy appears newer, snapshot both copies under canonical `_versions/` and reconcile intentionally. Do not make the deploy artifact the source just because its mtime is newer.

## Screenshot Pipeline

Preferred navigation for Che's HTML decks is deck-native `window.go(zeroBasedIndex)` plus a paint delay. Avoid raw `scrollIntoView` or manual `translateX` unless the deck has no `window.go`; they have produced repeated-cover or viewport-drift failures.

```javascript
const puppeteer = require('puppeteer');
const URL = process.argv[2];
const OUT = process.argv[3] || '/tmp/slide-shots';
const fs = require('fs'); fs.mkdirSync(OUT, {recursive:true});

(async () => {
  const browser = await puppeteer.launch({headless:'new',args:['--no-sandbox']});
  const page = await browser.newPage();
  await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
  await page.goto(URL, {waitUntil:'networkidle0'});
  await new Promise(r=>setTimeout(r,1500));

  const total = await page.evaluate(() => document.querySelectorAll('section.slide, .slide').length);
  for (let i = 0; i < total; i++) {
    await page.evaluate((idx) => {
      if (typeof window.go === 'function') window.go(idx);
      const slide = document.querySelectorAll('section.slide, .slide')[idx];
      if (slide) {
        slide.classList.add('active');
        slide.querySelectorAll('[data-anim], *').forEach(el => {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.transform = 'none';
          el.style.animation = 'none';
        });
      }
    }, i);
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: `${OUT}/slide_${String(i+1).padStart(2,'0')}.png` });
  }
  console.log(JSON.stringify({total, out: OUT}));
  await browser.close();
})();
```

Run with: `NODE_PATH=$(npm root -g) node script.js <url-or-file> /tmp/slide-shots`.

**Before trusting the batch**, inspect one non-cover slide (e.g. demo/card/appendix slide). If every screenshot is the cover, the navigation pipeline broke.

## Common Layout Issues & Fixes

### Dense appendix safe-area

**Symptom:** A footer/note exists in DOM and may show in one local screenshot, but Che cannot see it in the actual presentation/browser view.

**Fix:** Avoid absolute-bottom notes on dense appendix slides. Put notes in content flow (e.g. after the related list with a border-top and margin) or reserve generous bottom padding. Verify on the live deck after `window.go(n)` at presentation resolution; check browser chrome/nav dots do not cover it.

### Content overflow on dense slides

Split into logical columns before shrinking font size. If content is merely pinned to the top with empty space below, diagnose grid/flex alignment (`align-items`, `justify-content`, `min-height:0`) before touching font sizes.

### Paired demo screenshots

For chat + Obsidian / two-demo slides, verify source dimensions and readability. Use side-by-side only when both images remain legible; use stacked layout for mixed portrait + wide landscape pairs. Always `object-fit:contain`, never crop screenshots.

### Broken images in card-art divs

Generate or restore the missing assets, then verify the actual image URLs return HTTP 200. For final decks, remove unresolved `LIVE DEMO`, `待补素材`, and stale `data-image-slot` scaffolding.

### Link contrast on colored cards

Links on accent-colored cards may be invisible; override link color for those cards explicitly and verify computed contrast.

## Slide Deck Deployment Workflow

1. Pull/check Obsidian canonical repo and site repo.
2. Identify canonical deck directory and site talk directory; avoid hardcoded PKM paths.
3. Sync `index.html`, `images/`, and `assets/` from canonical to site artifact.
4. Verify canonical/site `index.html` SHA256 match when intended identical.
5. If commit and push are explicitly in scope, keep source and site changes in
   their owning repos and review both diffs before performing those operations.
6. After an authorized push, wait for the GitHub Pages rebuild, then verify the
   live URL: HTTP 200, expected slide count, key strings/styles, and local
   runtime assets (e.g. `assets/motion.min.js`).
7. Capture/inspect touched high-risk slides: screenshots, card grids, dense appendix pages, footer notes, contact/QR.
8. If a separately authorized formal/final release requires tags, tag the
   intended source and site revisions and push tags only after confirming the
   exact names and scope.
