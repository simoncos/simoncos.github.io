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
| `gallery/games/endless-echoes.html` and its graph cover | `scripts/build_music_riddle.py`, called by `build_pages.py` | `data/music-riddle.json`; [field contract](MUSIC_RIDDLE_DATA.md) and [design guide](ENDLESS_ECHOES_DESIGN.md) |
| Shared head, header and footer blocks on every page above | `scripts/update_site_shell.py` | `scripts/site_shell.py`, `data/site_shell.json` |

A new generated page must exist before `update_site_shell.py` will accept its entry in `data/site_shell.json`, so run `python3 scripts/build_pages.py` once before the first `make generate`.

`make generate` first syncs the shell into `templates/` and refreshes `data/image_dimensions.json` (both are inputs to article generation), then runs the article, page and Favorites generators. It is idempotent apart from the feeds' `lastBuildDate`. `scripts/site_shell.py` is the single definition of the shell: navigation, language and theme toggles, footer, meta tags and script tags. `data/site_shell.json` lists the pages, their section, script profile and `site_updated`. Shared `src/js/*.js` and `src/css/styles.css` URLs use the first 12 hex characters of each file's SHA-256 as their `?v=` key. Unchanged assets keep their URL; there is no global version to bump. Compile TypeScript before updating the shell so hashes describe the shipped JavaScript. Topic-specific assets outside this shared shell keep their own loading/version policy.

Hand-authored pages outside this table: `series.html` and `tags.html` (redirects into the Articles page), the Sleep essay pages under `gallery/research/`, the talk deck under `gallery/`. The Zhihu research page is generated; see `docs/ZHIHU_RESEARCH.md`.

### Film pages

Film entries in `data/site.json` carry `film.youtube`, bilingual introductory copy and a local poster. `scripts/page_film.py`, called by `build_pages.py`, renders the screening page; the player is a responsive YouTube embed with a direct watch link. The making-of articles use the same video ID and `blogs/assets/film-embed.css`. An iframe's `data-poster`, `width` and `height` allow the article generator to use that local artwork for social previews. Video files stay on YouTube.

### Generator modules

`generate_blog_pages.py` owns the article CLI and two-pass orchestration. Its former helper API remains re-exported for existing callers. Implementation lives in `scripts/article_content.py` (parsing, metadata and labels), `article_media.py` (images and embeds), `article_relations.py` (bilingual groups, sequences and backlinks), `article_render.py` (article HTML), `article_listing.py` (listing and series views), and `article_feeds.py` (feeds). The relationship module builds the inverted link index once; rendering does not reparse the whole corpus for each article.

`scripts/build_pages.py` owns page output selection and its CLI. Shared helpers are in `page_common.py`; page rendering lives in `page_home.py`, `page_work.py`, `page_apps.py`, `page_board.py`, `page_music.py` and `page_about.py`. Existing entrypoint imports remain available. Both generator drift checks exercise these modules from a temporary checkout and compare complete outputs.

### Data

- `data/site.json` — the hand-maintained record for the Index stage, the Work list and its topics, projects, the About page and the changelog.
- `gallery/music/*.peaks.json` — the waveform on a song's page: the recording's loudness in 120 bars. The build has no audio decoder, so `scripts/song_peaks.py <mp3>` measures it once (with ffmpeg) when a recording is added or replaced. A song's words, credits and lyrics are in `data/site.json` `songs`.
- `data/article_index.json` — generated. Groups bilingual article variants and carries only lightweight fields (titles, dates, excerpts, topics, series, translations). Full article HTML stays in the article pages.
- `data/article_credits.json` — default article authorship and explicit exceptions for AI narration/collaboration, shared by both languages. The human identity comes from `data/site.json` → `about.identity`, `native_name` and existing contact links; `scripts/site_entities.py` generates visible credits and JSON-LD from these same facts.
- `data/backlinks_data.json` — generated relationship graph. Each language variant is parsed once to build an inverted link index; article pages and the JSON reuse that graph. Article pages render their "linked from" list from it at build time.
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
- Article date evidence and revision rules are under [Dates](ARTICLE_PUBLICATION.md#dates).
- Favorites: page chrome is bilingual, titles and reviews stay in Chinese.

### Client scripts

TypeScript entrypoints in `src/ts/*.ts` compile to tracked `src/js/*.js` (`npm run build:ts`). Root TypeScript uses `strict: true`, including nested source modules. `scripts/build_client.mjs` uses the pinned esbuild dependency to bundle `site`, `music-riddle` and `zhihu-network` as classic IIFEs; the other small entrypoints retain their existing classic-script compilation. Nested modules add no browser requests. Each page loads `site.js` plus at most one page script chosen by its profile:

- `site.ts` — language and theme, mobile menu, page transitions (a curtain between sections, a fade within one), external-link marking, cursor image previews, copy buttons.
- `home.ts` — the Selected work stage and the topic filter over Newest.
- `articles.ts` — search, tag filter and excerpts on the list (a click anywhere on a row opens its excerpt); the month index (each month heading sticks under the header and opens a popover of every month, which follows the filter; `#2012-09` lands on a month); the series view. Addresses: `#series`, `#series-<id>`, `#topic-<slug>` where the slug is the tag's English label (`#topic-outdoors`, from `tag_slug` in `generate_blog_pages.py`).
- `article.ts` — reading progress, the contents list, footnote highlighting, back to top.
- `work.ts` — the wheel of work types; `#apps`, `#sharing` and so on open a type directly.
- `board.ts` — Board / Present modes on the Sleep Toolkit boards.
- `song.ts` — the player on a Music page: play and pause, and the waveform as the seek bar (mouse, arrow keys, or a tap or sideways drag on a touch screen; a vertical swipe over it scrolls the page). Without scripts the browser's own audio controls show.
- `favorites.ts` — index peeks; paging, filters and folds on category pages (`?filter=`, `?page=`).
- `theme-init.ts` — runs in the head before paint; sets the theme and adds the `js` class that CSS uses to gate no-JS fallbacks.

`src/ts/shell/` separates preferences, menus, navigation, link marking, previews and clipboard behavior. `src/ts/music-riddle/` separates typed data validation, saved progress, answer normalization, map rendering and optional sound controls. EchoPiano and EchoScore remain independent optional classic scripts. `src/ts/network/` separates validated network data/indexes from Canvas rendering. JSON and browser storage are read as `unknown` and checked before graph IDs or music routes are consumed; missing mandatory controls fail at named guards rather than through non-null assertions.

### CSS sources

Author shared CSS in `src/css/sections/*.css`. `src/css/styles.sources.json` lists their cascade order; `scripts/build_styles.py` joins their raw bytes into tracked `src/css/styles.css`. `make generate` runs this before asset hashing and `make check` rejects drift. The split preserves the stylesheet bytes and the single browser request; edit a section rather than the generated file.

The PKM talk keeps its canonical desktop `deck.css` from Obsidian. Site-only phone reading rules live in `gallery/sharing/pkm-2026-06-07/reader.css`; the site HTML loads this layer and the TypeScript navigation leaves native scrolling enabled below 901px. Preserve this web adaptation when syncing a canonical deck.

Other TypeScript bundles: `gallery/sharing/pkm-2026-06-07/deck.ts` / `deck.mts`, the Sleep runtime described below, and the Haba pretext runtime. `make check` compiles main-site entrypoints into a temporary directory and compares tracked output without rewriting the working tree; `make check-all` adds research, talk and Haba bundles, and CI runs it. Sleep chart modules, essay UI, pretext and loader also use strict typing. The talk and Haba compiler policies stay independent. The only unconverted `.js` file is `gallery/sharing/pkm-2026-06-07/assets/motion.min.js`, a third-party minified vendor asset.

### Sleep charts

Both hand-authored Sleep essays load `gallery/research/assets/sleep-chart-loader.js`, which downloads Plotly and the common `sleep-charts.js` when a chart approaches the viewport. The common entrypoint `sleep-charts.ts` imports the single published payload `sleep/data.json`, its typed contracts, bilingual localization and section renderers under `sleep/`. It is bundled as one minified classic script. Data values, rendering order and each language's labels/layout choices are preserved; this is source consolidation, not a statistical reanalysis.

The build also emits byte-identical compatibility copies at `sleep-2016-2026.js` and `sleep-2016-2026.en.js`. Keep these published URLs for essays/loaders cached before the shared-runtime migration; they require no separate source implementation or extra requests from current pages. The loader tracks the latest request per chart, including pending offscreen filters and retries, so an older rendering failure cannot clear the latest result.

`scripts/update_sleep_assets.py` fingerprints the common runtime, loader, UI and pretext references in both essays. `scripts/build_sleep_evidence.py` also reads the shared public JSON. The chart payload remains one download at the first chart; individual charts still draw on approach, and failed loads offer retry. `scripts/test_sleep_charts.cjs` compares ordered default/filter Plotly calls against hashes captured from the pre-refactor bilingual bundles. The fixture covers 36 initial plots and 22 filter redraws per language; update it only after reviewing an intentional output change.

The fingerprint updater parses real script attributes, accepts legal quoting, and fails for missing, unexpected or duplicate required entries before writing either page. `check_site.py` also checks the local target of `data-runtime`. Regression checks exercise the frozen old loader and both compatibility bundles, malformed references, and out-of-order drawing failures.

### AI / agent-readable

GEO improvements and remaining decisions are tracked in [GEO_IMPLEMENTATION.md](GEO_IMPLEMENTATION.md). Historical sleep, Field Notes, and old PKM talk URLs are listed in `data/redirects.json` with the later work-URL migrations; `scripts/page_redirects.py` writes the compatibility pages during `make generate`. These are HTML migrations on static hosting, not HTTP 301/308 responses. The old PKM talk path now points at the current `gallery/sharing/` canonical page.

`scripts/sync_discovery.py` runs last in `make generate`: it derives article sitemap dates from the generated index, and maintains identity/exception credits in `agent-index.json` plus the marked authorship block in `llms.txt`. Other curated entries and non-article sitemap dates remain hand-maintained. `make check` checks discovery drift. `tests/test_entity_contracts.py` compares all article JSON-LD with visible attribution, canonical URL, language, source dates and sitemap dates; it also prevents AI credits from becoming human author entities.

- `llms.txt` is the concise Markdown orientation file at the site root. It points agents to the highest-signal public surfaces rather than mirroring the sitemap.
- `agent-index.json` is the structured companion for machines that prefer stable fields over prose.
- These files describe public context only. They are not permission, training-control or licensing documents; `robots.txt` keeps that role.

### Public artifact metadata boundary

- Canonical sharing pages live under `gallery/sharing/`, and games under `gallery/games/`. `data/redirects.json` lists published URLs that moved; `scripts/page_redirects.py` builds their compatibility pages with canonical/social metadata from the destination. JavaScript preserves query strings and fragments, with a no-JavaScript refresh and link fallback. Keep old published static assets for cached pages and download links; maintain their sources only in the new directories.
- Work category links use `gallery.html#sharing`; the runtime also accepts the old `#talks` and `#talks/<work>` addresses. Other category IDs are `apps`, `research`, `games`, and `music`.

- Every local HTML URL in `sitemap.xml` is public and indexable. It must have a title, description, matching canonical and `og:url`, plus basic Open Graph title, description and image metadata.
- Share posters are rendered by `scripts/generate_og_images.py` at 1200×630. `site_shell.render_meta` selects dedicated cards by canonical URL for Work, Endless Echoes and Zhihu; explicit work images take precedence. Use versioned JPEG filenames when replacing artwork, and keep `og:image` and `twitter:image` identical. `tests/test_social_cards.py` checks every published local Work link so a new work cannot silently use the general site card.
- Embedded support pages under `blogs/assets/pages/` are implementation artifacts, not standalone publications, and must declare `noindex`.
- A new standalone artifact must be placed on one side of this boundary explicitly; being reachable in the repository is not enough to make it public.

### Drift guards

- Never hand-edit generated output; change the source or the generator and regenerate.
- After a shared CSS or JS change, run `make generate`; content hashes update only affected resource URLs. `scripts/check_site.py` verifies every shared resource key against its file bytes, and generated-output checks catch stale pages.
- `site_updated` must not be older than the newest work, project or article; `scripts/check_site.py` enforces it.
- Project skills exist twice, file for file: `.claude/skills/` for Claude Code and `.agents/skills/` for Codex, which alone also has `agents/openai.yaml`. After editing one copy, run `python3 scripts/sync_skills.py` (add `--from agents` when the Codex copy was edited). `make check` fails while the two differ.

Run `make check` before publishing structural changes.

### Performance baselines

`data/performance_budgets.json` records the 2026-10-04 static baseline for ten representative pages and four key assets (the two Sleep assets now share one runtime). `make check-performance` (also included in `make check-all`) rejects growth beyond explicit limits: approximately 10% above baseline, rounded to 512 bytes or 50 elements. A zero baseline keeps a zero limit. `python3 scripts/check_performance.py --measure` prints current weights without changing the approved baseline or limits.

The page measures are HTML gzip bytes, static HTML element count, local script/style gzip bytes and non-lazy image bytes. Gzip uses level 9 with a fixed timestamp; duplicate asset URLs count once. These are repeatable regression guards, not actual browser transfer sizes: responsive image selection, CSS images, dynamic requests, fonts and third-party resources are outside these totals. Measure browser loading, layout shifts and interactions separately before claiming a user-perceived speed improvement. Budget changes need an explicit rationale rather than automatic baseline renewal. The 2026-10-05 Sleep runtime retains the former Chinese runtime's gzip baseline and limit. Only the bilingual essays' element limits increased from 850 to 950 for separately authored evidence tables and a metric dictionary; original baseline counts and all byte limits remain recorded.

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

## Independent language documents and GEO sources

Core section authoring still uses bilingual helpers; `scripts/site_languages.py` selects one language at build time. Existing `index.html` (canonical `/`), `blogs.html`, `gallery.html` and `about.html` remain English; their `.zh.html` peers serve Chinese before any script runs. Each has real reciprocal alternates, a peer link and same-language core navigation. `?lang=zh/en`, saved preferences, filters and anchors are compatible through the shared head/toggle scripts. Without JavaScript, an old query URL returns the base English document and offers the real Chinese peer. Favorites retains Chinese reviews and bilingual controls; the Chinese talk has no fabricated full English alternate.

`data/site.json.page_revisions` explicitly records meaningful non-article revisions, then `scripts/sync_discovery.py` updates sitemap. Do not stamp it daily. Article dates retain the publication guide's meanings. The section locale date is 2026-10-05; it does not change all article revision dates.

`data/topic_readers.json` owns two reading companions, built by `scripts/build_topic_readers.py`, with language files under `topics/`. They explain relationships, versions and limits of existing sources, rather than duplicate tag filtering. Work related links, sitemap and discovery indexes link them.

`build_sleep_evidence.py` extracts only already public chart data (`assets/sleep/data.json`, with legacy TS fallback). It generates a static bilingual evidence block and `sleep-evidence.json`, including valid record counts, tag windows, metric-specific BD n and a canonicalized payload SHA-256. The fingerprint is not a claim about the private CSV or historical processing commit. There are 3,656 records on 2,963 distinct date values; no date deduplication or nightly reassignment occurs in this generator. Never include private raw/derived files from the owning research repo.

`agent-index.json.works` derives public entry/review/in-progress state from Work data; CollectionPage lists only linked public entries, without inventing software maturity. Owner decisions, consumer-answer measurement protocol and evidence are indexed in `docs/GEO_OWNER_REVIEW.md`.
