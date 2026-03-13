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
- root pages like `index.html`, `about.html`, `tags.html`, `series.html`, `blogs.html`
- site assets, icons, and CSS/JS

### Generated JSON
- `data/blog_data.json`
- `data/tags_data.json`
- `data/series_data.json`

Python generator still owns metadata extraction, markdown conversion, and the stable data indexes needed by the UI.

### Dynamic / client-rendered
- **tags** page renders from `tags_data.json`
- **series** page renders from `series_data.json`
- **backlinks** are inferred client-side from `blog_data.json` (`html_content`)
- **blog previews** on `blogs.html` are rendered client-side from generated `html_content`

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
