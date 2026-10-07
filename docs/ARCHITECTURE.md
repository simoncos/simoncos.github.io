# Site Architecture Notes

A short note on how this site separates **authored content** from **inferred structure**, and where each page comes from.

## Core principle

- **Authored content** should stay as static, human-readable source and generated HTML.
- **Inferred data** (backlinks, series routes, topic lists, dates shown only where they change) should be computed once at build time and written into the page.

Every published page is complete HTML that reads fine without JavaScript. Page scripts add interaction; they never own content.

## Where each page comes from

GitHub Pages serves the `master` tree as-is, with no build step, so generated HTML and compiled JavaScript are tracked. Since 2026-09-29 the `deploy` job in `.github/workflows/site-check.yml` publishes it, only after `make check-all` passes. Its "Stage site" step copies the tree without the working files (dot-directories, `docs/`, `tests/`, `scripts/`, `templates/`, TypeScript sources, notes and build config); a new working file that should stay off the site goes on that exclude list.

| Pages | Generator | Source |
| --- | --- | --- |
| `blogs/*.html`, `blogs.html`, feeds, `data/article_index.json`, `data/backlinks_data.json` | `generate_blog_pages.py` | `blogs/*.md`, `templates/` |
| `index.html`, `gallery.html`, `apps.html`, `apps/sleep-toolkit*.html`, `gallery/music/*.html`, `about.html`, `404.html` | `scripts/build_pages.py` | `data/site.json`, `data/article_index.json`, `gallery/music/*.peaks.json` |
| `favorites.html`, `favorites/*.html` | `scripts/update_favorites_pages.py` | `data/favorites.json` |
| `gallery/research/zhihu-2015.html` | `scripts/build_zhihu_research.py`, called by `build_pages.py` | `data/zhihu-2015.json` and bilingual editorial copy |
| `gallery/music/endless-echoes.html` and its graph cover | `scripts/build_music_riddle.py`, called by `build_pages.py` | `data/music-riddle.json`; [field contract](MUSIC_RIDDLE_DATA.md) and [design guide](ENDLESS_ECHOES_DESIGN.md) |
| Shared head, header and footer blocks on every page above | `scripts/update_site_shell.py` | `scripts/site_shell.py`, `data/site_shell.json` |

A new generated page must exist before `update_site_shell.py` will accept its entry in `data/site_shell.json`, so run `python3 scripts/build_pages.py` once before the first `make generate`.

`make generate` first syncs the shell into `templates/` and refreshes `data/image_dimensions.json` (both are inputs to article generation), then runs the article, page and Favorites generators. It is idempotent apart from the feeds' `lastBuildDate`. `scripts/site_shell.py` is the single definition of the shell: navigation, language and theme toggles, footer, meta tags and script tags. `data/site_shell.json` lists the pages, their section and their script profile, plus the `css_version` / `js_version` cache keys and `site_updated`.

Hand-authored pages outside this table: `series.html` and `tags.html` (redirects into the Articles page), the Sleep essay pages under `gallery/research/`, the talk deck and the Hermes research artifact under `gallery/`. The Zhihu research page is generated; see `docs/ZHIHU_RESEARCH.md`.

### Data

- `data/site.json` — the hand-maintained record for the Index stage, the Work list and its topics, projects, the About page and the changelog.
- `gallery/music/*.peaks.json` — the waveform on a song's page: the recording's loudness in 120 bars. The build has no audio decoder, so `scripts/song_peaks.py <mp3>` measures it once (with ffmpeg) when a recording is added or replaced. A song's words, credits and lyrics are in `data/site.json` `songs`.
- `data/article_index.json` — generated. Groups bilingual article variants and carries only lightweight fields (titles, dates, excerpts, topics, series, translations). Full article HTML stays in the article pages.
- `data/backlinks_data.json` — generated relationship graph. Article pages render their "linked from" list from it at build time.
- `data/favorites.json` — every five-star book, film, album and game from a one-off Douban export. `scripts/extract_favorites.py` writes it from the local Obsidian vault and is run by hand, never in `make check`.

### Article images

- Article images live in the repository, at `blogs/assets/images/<slug>/`. Obsidian uploads them to R2; `scripts/localize_images.py <slug>` downloads an article's R2 images, writes web copies (sRGB, at most 1520 × 2026 px, progressive JPEG) and rewrites both language files to use them. An animated GIF becomes a silent looping MP4 with a JPEG poster of the same name; the generator renders `![alt](<name>.mp4)` as `video.post-loop`, which `article.ts` plays like a GIF (paused with controls under reduced motion). Then run `make generate`.
- Phones get a smaller file. `scripts/image_variants.py <slug>` writes a 1080 px WebP (`<name>.1080w.webp`) beside each image wider than that, and `localize_images.py` does it for every image it writes. The generator offers the variant through `srcset`/`sizes` and keeps the original as `src` (share cards, feeds). On the Haba article, a 360 or 390 px phone at three device pixels per CSS pixel now loads 1.88 MB of images instead of 5.05 MB (measured 2026-10-03). `sizes` assumes 20 px of margin each side; keep it exact, or a 360 px phone asks for more than 1080 px and loads the original.
- An `<iframe class="embedded-page">` is wrapped with a cover link (`.embed-cover`, label from the iframe's `data-open-label`). On touch screens and narrow windows the cover lies over the frame, so a swipe scrolls the article and a tap opens the page in a new tab; elsewhere the frame works as before.
- `scripts/check_site.py` fails when an image or clip an article shows is over 1 MB, or a clip lacks its poster, size or text alternative, and lists articles that still load images from R2 without failing.
- Images left on another host need their size recorded in `data/image_dimensions.json` (`scripts/update_image_dimensions.py`, part of `make generate`), or they shift the layout as they load.

### Languages

- Section pages (Index, Articles, Work, Favorites, About) carry both languages as `<span data-l="en">…</span><span data-l="zh" lang="zh-Hans">…</span>` pairs. `?lang=zh` or the toggle picks one; the choice is remembered.
- Attributes that change with language are declared with `data-i18n="<attr>"` and a `data-zh-<attr>` value.
- Articles and project boards are one language per file (`*.en.html` / `*.html`) and link their translation.
- Article publishing policy (owner decision, 2026-09-28): every article must have both Chinese and English versions before going live. Use `blogs/<slug>.md` and `blogs/<slug>.en.md`, with matching dates, tags and series metadata. A Chinese-only local preview is not ready for publication. `scripts/check_site.py` rejects incomplete language pairs; do not push them to the Pages branch. Translation quality still needs review beyond this structural check.
- An older piece republished here keeps its historical first-publication `date`, not the day it was added. The rules are under [Dates](ARTICLE_PUBLICATION.md#dates).
- Favorites: page chrome is bilingual, titles and reviews stay in Chinese.

### Client scripts

TypeScript entrypoints in `src/ts/*.ts` compile to tracked `src/js/*.js` (`npm run build:ts`). Root TypeScript uses `strict: true`, including nested source modules. `scripts/build_client.mjs` uses the pinned esbuild dependency to bundle `site`, `music-riddle` and `zhihu-network` as classic IIFEs; the other small entrypoints retain their existing classic-script compilation. Nested modules add no browser requests. Each page loads `site.js` plus at most one page script chosen by its profile:

- `site.ts` — language and theme, mobile menu, page transitions (a curtain between sections, a fade within one), external-link marking, cursor image previews, copy buttons.
- `home.ts` — the Selected work stage and the topic filter over Newest.
- `articles.ts` — search, tag filter and excerpts on the list (a click anywhere on a row opens its excerpt); the month index (each month heading sticks under the header and opens a popover of every month, which follows the filter; `#2012-09` lands on a month); the series view. Addresses: `#series`, `#series-<id>`, `#topic-<slug>` where the slug is the tag's English label (`#topic-outdoors`, from `tag_slug` in `generate_blog_pages.py`).
- `article.ts` — reading progress, the contents list, footnote highlighting, back to top.
- `work.ts` — the wheel of work types; `#apps`, `#talks` and so on open a type directly.
- `board.ts` — Board / Present modes on the Sleep Toolkit boards.
- `song.ts` — the player on a Music page: play and pause, and the waveform as the seek bar (mouse, arrow keys, or a tap or sideways drag on a touch screen; a vertical swipe over it scrolls the page). Without scripts the browser's own audio controls show.
- `favorites.ts` — index peeks; paging, filters and folds on category pages (`?filter=`, `?page=`).
- `theme-init.ts` — runs in the head before paint; sets the theme and adds the `js` class that CSS uses to gate no-JS fallbacks.

`src/ts/shell/` separates preferences, menus, navigation, link marking, previews and clipboard behavior. `src/ts/music-riddle/` separates typed data validation, saved progress, answer normalization, map rendering and optional sound controls. EchoPiano and EchoScore remain independent optional classic scripts. `src/ts/network/` separates validated network data/indexes from Canvas rendering. JSON and browser storage are read as `unknown` and checked before graph IDs or music routes are consumed; missing mandatory controls fail at named guards rather than through non-null assertions.

### CSS sources

Author shared CSS in `src/css/sections/*.css`. `src/css/styles.sources.json` lists their cascade order; `scripts/build_styles.py` joins their raw bytes into tracked `src/css/styles.css`. `make generate` runs this before asset hashing and `make check` rejects drift. The split preserves the stylesheet bytes and the single browser request; edit a section rather than the generated file.

The PKM talk keeps its canonical desktop `deck.css` from Obsidian. Site-only phone reading rules live in `gallery/talks/pkm-2026-06-07/reader.css`; the site HTML loads this layer and the TypeScript navigation leaves native scrolling enabled below 901px. Preserve this web adaptation when syncing a canonical deck.

Other TypeScript bundles: `gallery/talks/pkm-2026-06-07/deck.ts` / `deck.mts`, the Sleep runtime described below, and the Haba pretext runtime. `make check` compiles main-site entrypoints into a temporary directory and compares tracked output without rewriting the working tree; `make check-all` adds research, talk and Haba bundles, and CI runs it. Sleep chart modules, essay UI, pretext and loader also use strict typing. The talk and Haba compiler policies stay independent. The only unconverted `.js` file is `gallery/talks/pkm-2026-06-07/assets/motion.min.js`, a third-party minified vendor asset.

### Sleep charts

Both hand-authored Sleep essays load `gallery/research/assets/sleep-chart-loader.js`, which downloads Plotly and the common `sleep-charts.js` when a chart approaches the viewport. The common entrypoint `sleep-charts.ts` imports the single published payload `sleep/data.json`, its typed contracts, bilingual localization and section renderers under `sleep/`. It is bundled as one minified classic script. Data values, rendering order and each language's labels/layout choices are preserved; this is source consolidation, not a statistical reanalysis.

The build also emits byte-identical compatibility copies at `sleep-2016-2026.js` and `sleep-2016-2026.en.js`. Keep these published URLs for essays/loaders cached before the shared-runtime migration; they require no separate source implementation or extra requests from current pages. The loader tracks the latest request per chart, including pending offscreen filters and retries, so an older rendering failure cannot clear the latest result.

`scripts/update_sleep_assets.py` fingerprints the common runtime, loader, UI and pretext references in both essays. The chart payload remains one download at the first chart; individual charts still draw on approach, and failed loads offer retry. `scripts/test_sleep_charts.cjs` compares ordered default/filter Plotly calls against hashes captured from the pre-refactor bilingual bundles. The fixture covers 36 initial plots and 22 filter redraws per language; update it only after reviewing an intentional output change.

The fingerprint updater parses real script attributes, accepts legal quoting, and fails for missing, unexpected or duplicate required entries before writing either page. `check_site.py` also checks the local target of `data-runtime`. Regression checks exercise the frozen old loader and both compatibility bundles, malformed references, and out-of-order drawing failures.

### AI / agent-readable

- `llms.txt` is the concise Markdown orientation file at the site root. It points agents to the highest-signal public surfaces rather than mirroring the sitemap.
- `agent-index.json` is the structured companion for machines that prefer stable fields over prose.
- These files describe public context only. They are not permission, training-control or licensing documents; `robots.txt` keeps that role.

### Public artifact metadata boundary

- Every local HTML URL in `sitemap.xml` is public and indexable. It must have a title, description, matching canonical and `og:url`, plus basic Open Graph title, description and image metadata.
- Embedded support pages under `blogs/assets/pages/` are implementation artifacts, not standalone publications, and must declare `noindex`.
- A new standalone artifact must be placed on one side of this boundary explicitly; being reachable in the repository is not enough to make it public.

### Drift guards

- Never hand-edit generated output; change the source or the generator and regenerate.
- After a CSS or JS change, bump `css_version` / `js_version` in `data/site_shell.json` and regenerate, so browsers do not keep stale files.
- `site_updated` must not be older than the newest work, project or article; `scripts/check_site.py` enforces it.
- Project skills exist twice, file for file: `.claude/skills/` for Claude Code and `.agents/skills/` for Codex, which alone also has `agents/openai.yaml`. After editing one copy, run `python3 scripts/sync_skills.py` (add `--from agents` when the Codex copy was edited). `make check` fails while the two differ.

Run `make check` before publishing structural changes.

## Practical lessons

1. **Transcript/data first, thesis/UI second**
   - Do not overfit implementation before the actual data flow is clear.

2. **Generate inferred views; keep scripts for interaction**
   - backlinks, series routes and excerpts are written into the HTML at build time; scripts only filter, page, fold and switch language.

3. **For tiny cross-platform icons, inline SVG is safer than relying on glyph rendering**
   - browser/font differences are real.

4. **Avoid fake precision**
   - if post times are not meaningful to the second, show date only.

5. **After CSS changes, expect mobile cache issues**
   - cache-busting is part of the workflow, not an afterthought.

## Default direction for future changes

When adding a feature, ask first:

1. Is this **authored content** or **inferred structure**?
2. If inferred, can the generator compute it once and write it into the page?
3. Are we preserving the real source faithfully, or inventing another interpretation layer?

### Generator modules and performance checks

Article generation delegates to six `scripts/article_*.py` modules; page generation delegates to seven `scripts/page_*.py` modules. Entrypoints retain their helper imports. Backlinks parse each source variant once and invert outgoing links while retaining original equal-date ordering.

Shared resources use per-file SHA-256 cache keys. `data/performance_budgets.json` keeps the established baseline and explicit limits; `make check-all` rejects source/output drift and budget growth. The Sleep static-element limits remain 850 in this engineering candidate; the separate GEO expansion is still uncommitted.
