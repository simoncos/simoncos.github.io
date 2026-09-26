# Site Architecture Notes

A short note on how this site currently separates **authored content** from **inferred structure**.

## Core principle

- **Authored content** should stay as static, human-readable source and generated article HTML.
- **Inferred data** should be computed once when useful, or rendered dynamically when that keeps the system simpler and less coupled.

This distinction matters more than a blanket rule like “everything should be static” or “everything should be dynamic.”

## Current split

### Static / generated
- blog post markdown in `blogs/*.md`
- generated article pages in `blogs/*.html`
- root pages like `index.html`, `about.html`, and `blogs.html`; `tags.html` and `series.html` remain lightweight compatibility redirects
- site assets, icons, and CSS/JS
- `sitemap.xml` and `robots.txt` for the public crawl surface
- `llms.txt` and `agent-index.json` as curated AI/agent-readable orientation files

### Generated JSON
- `data/article_index.json`
- `data/backlinks_data.json`
- `data/projects_data.json`
- `data/gallery_data.json`
- `data/favorites.json`

Python generator still owns metadata extraction, markdown conversion, and the stable data indexes needed by the UI.

`article_index.json` is the primary public article index. It groups bilingual article variants and carries only the lightweight fields needed by the Essays archive, topic filters, reading paths, homepage, and language switching. `backlinks_data.json` contains the separately generated relationship graph; full article HTML stays in generated article pages and generator memory rather than public JSON indexes.

`favorites.json` holds the Favorites (收藏) column: every five-star book, film, album and game from a one-off Douban export. `scripts/extract_favorites.py` writes it from the local Obsidian vault and is run by hand, never in `make check`. `scripts/update_favorites_pages.py` renders `favorites.html` and `favorites/*.html` from it; the category pages carry every work, and `load-favorites.ts` pages and filters them in the browser. The pages are Chinese only, but the nav lists the column in both languages; the English entry opens the Chinese pages.

`projects_data.json` and `gallery_data.json` are generated lightweight projections of the hand-maintained `content_manifest.json`. They contain stable presentation metadata and paths, not duplicate full page content.

### AI / agent-readable
- `llms.txt` is the concise Markdown orientation file at the site root. It should point agents to the highest-signal public surfaces rather than trying to mirror the full sitemap.
- `agent-index.json` is the structured companion index for machines that prefer stable fields over prose.
- These files describe public context only. They are not permission, training-control, or licensing documents; `robots.txt` keeps that separate crawl-surface role.

### Static-first / progressively enhanced
- **home** ships generated English recent items without replacing them on first load; the separately authored Current Index and reading paths still render from `home_surface.json` because they do not yet have full generator drift ownership
- **blogs** ships generated English archive, reading-path, and topic markup; JSON is loaded for language switching or topic filtering
- **projects** and **gallery** keep their generated page markup untouched when it already matches the requested language
- **tags** and **series** preserve old links by redirecting into the corresponding Essays sections
- **backlinks** render from the build-time `backlinks_data.json` graph
- **blog previews** use generated excerpts/content rather than reparsing markdown in the browser

The generated markup is the initial rendering authority. Client renderers are progressive enhancement for language and interaction, and keep the static fallback in place when data is unavailable.

### Hand-authored shell

Root pages share the same shell pattern: favicon/RSS links, `site-config.js`, `i18n.js`, `load-nav.js`, `dark-mode.js`, and `src/css/styles.css`.

Client-side site code is authored in TypeScript and compiled to browser JavaScript:
- `src/ts/*.ts` compiles to tracked `src/js/*.js` for the main shared site scripts.
- `gallery/talks/pkm-2026-06-07/deck.ts` and `deck.mts` compile to the talk deck's `deck.js` and `deck.mjs`.
- `projects/assets/sleep-2016-2026*.ts` compiles to the Sleep essay chart bundles loaded by the two Sleep project pages.

The compiled JavaScript remains tracked because GitHub Pages serves this repo directly. Run `npm run build:ts` after TypeScript changes. `make check` compiles the shared site bundle into a temporary directory and compares tracked output without rewriting the working tree. `make check-all` adds the frozen talk, Sleep essay, and Haba artifact bundles; CI runs this full gate. The only remaining unconverted `.js` file is `gallery/talks/pkm-2026-06-07/assets/motion.min.js`, a third-party minified ESM vendor asset.

### Projection boundary

`content_manifest.json` remains useful while one authored record feeds Projects, Gallery, and Home. Do not add another projection layer, generic schema mechanism, or override family pre-emptively. Revisit the design only when a real new output schema appears or repeated hand-maintained duplication can be demonstrated.

### Public artifact metadata boundary

- Every local HTML URL in `sitemap.xml` is public and indexable. It must have a title, description, matching canonical and `og:url`, plus basic Open Graph title, description, and image metadata.
- Embedded support pages under `blogs/assets/pages/` are implementation artifacts, not standalone publications, and must declare `noindex`.
- A new standalone artifact must be placed on one side of this boundary explicitly; being reachable in the repository is not enough to make it public.

Because these pages are still hand-authored, drift is easy:
- nav fallback must stay aligned with `navigation.html`
- CSS cache keys must stay aligned across pages and templates
- generated pages get their footer version from `generate_blog_pages.py`
- hand-authored pages get their visible footer version from `site-config.js`

Run `python3 scripts/check_site.py` before publishing structural changes.

## Why backlinks and previews are dynamic

Backlinks and previews are both **inferred presentation data**, not authored text.

### Backlinks
Backlinks are relationship data between posts. They are better treated as a derived graph than as per-page injected HTML payload.

### Previews
Previews should use generated HTML as the source, then prune unsuitable elements (footnotes, images, code blocks, embeds, etc.) rather than inventing a second parser from markdown or plain text.

In short:
- html -> prune -> render
- not markdown -> parse again -> approximate preview

## Practical lessons from this round

1. **Transcript/data first, thesis/UI second**
   - Do not overfit implementation before the actual data flow is clear.

2. **For inferred UI, separate initial content from enhancement**
   - generated static markup owns entry-page content; client rendering is reserved for language switching and filtering
   - backlinks and previews remain dynamic because they are contextual inferred views, not duplicate authored page lists

3. **For tiny cross-platform icons, inline SVG is safer than relying on glyph rendering**
   - browser/font differences are real.

4. **Avoid fake precision**
   - if post times are not meaningful to the second, show date only.

5. **After CSS changes, expect mobile cache issues**
   - cache-busting can be part of the workflow, not an afterthought.

## Default direction for future changes

When adding a feature, ask first:

1. Is this **authored content** or **inferred structure**?
2. If inferred, should it live in:
   - generator-produced JSON, or
   - client-side rendering logic?
3. Are we preserving the real source faithfully, or inventing another interpretation layer?

That question usually gives the right design answer faster than arguing “static vs dynamic” in the abstract.
