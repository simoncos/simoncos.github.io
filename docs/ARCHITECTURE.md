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
- `data/blog_data.json`
- `data/article_groups.json`
- `data/tags_data.json`
- `data/series_data.json`
- `data/projects_data.json`
- `data/gallery_data.json`

Python generator still owns metadata extraction, markdown conversion, and the stable data indexes needed by the UI.

`article_groups.json` is now the primary public article index. It groups bilingual article variants and carries the fields needed by the Essays archive, topic filters, reading paths, homepage, backlinks, and language switching. `tags_data.json` and `series_data.json` are still generated for compatibility.

`projects_data.json` and `gallery_data.json` are hand-maintained lightweight indexes for non-blog public surfaces. They should contain only stable presentation metadata and paths, not duplicate full page content.

### AI / agent-readable
- `llms.txt` is the concise Markdown orientation file at the site root. It should point agents to the highest-signal public surfaces rather than trying to mirror the full sitemap.
- `agent-index.json` is the structured companion index for machines that prefer stable fields over prose.
- These files describe public context only. They are not permission, training-control, or licensing documents; `robots.txt` keeps that separate crawl-surface role.

### Dynamic / client-rendered
- **home** page merges article groups and projects into a recent list
- **blogs** page renders the archive, reading paths, and topic index from `article_groups.json`
- **tags** and **series** preserve old links by redirecting into the corresponding Essays sections
- **backlinks** are inferred client-side from generated article HTML content
- **blog previews** use generated excerpts/content rather than reparsing markdown in the browser

### Hand-authored shell

Root pages share the same shell pattern: favicon/RSS links, `site-config.js`, `i18n.js`, `load-nav.js`, `dark-mode.js`, and `src/css/styles.css`.

Client-side site code is authored in TypeScript and compiled to browser JavaScript:
- `src/ts/*.ts` compiles to tracked `src/js/*.js` for the main shared site scripts.
- `gallery/talks/pkm-2026-06-07/deck.ts` and `deck.mts` compile to the talk deck's `deck.js` and `deck.mjs`.
- `projects/assets/sleep-2016-2026*.ts` compiles to the Sleep essay chart bundles loaded by the two Sleep project pages.

The compiled JavaScript remains tracked because GitHub Pages serves this repo directly. Run `npm run build:ts` before publishing script changes; `make check` runs the TypeScript build first. The only remaining unconverted `.js` file is `gallery/talks/pkm-2026-06-07/assets/motion.min.js`, a third-party minified ESM vendor asset.

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

2. **For inferred UI, prefer dynamic rendering over duplicated generator logic**
   - especially for backlinks and previews.

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
