---
name: site-surface-editing
description: Edit the `simoncos.github.io` public site pages safely. Use when changing the Index, Articles, Work, Projects, Favorites or About pages, navigation labels, bilingual copy, CSS, `data/site.json`, `data/site_shell.json`, `scripts/site_shell.py`, `llms.txt`, or `agent-index.json`. Also use when fixing drift between site data, generators, generated HTML, TypeScript source and compiled JS.
---

# Site Surface Editing

Use this skill for source-of-truth and verification discipline on the main personal site. Pair with `frontend-design` for visual design work and `site-copy-and-ia` for public copy/IA judgment. `docs/ARCHITECTURE.md` has the full page-to-generator table.

## Source Map

- Every section page is generated; do not hand-edit it.
  - `index.html`, `gallery.html`, `projects.html`, `projects/sleep-toolkit*.html`, `about.html`, `404.html`: `scripts/build_pages.py` from `data/site.json` and `data/article_index.json`.
  - `blogs.html` and `blogs/*.html`: `generate_blog_pages.py` from `blogs/*.md` and `templates/`.
  - `favorites.html`, `favorites/*.html`: `scripts/update_favorites_pages.py` from `data/favorites.json`.
- The shared head, header and footer come from `scripts/site_shell.py` (nav, toggles, footer, meta, script tags) and `data/site_shell.json` (page list, script profiles, cache keys, `site_updated`), applied by `scripts/update_site_shell.py`.
- TypeScript source lives in `src/ts/*.ts`; compiled browser JS in `src/js/*.js` is tracked. Run `npm run build:ts` after TS edits. Each page loads `site.js` plus one page script from its profile.
- `series.html` and `tags.html` are hand-authored redirects into the Articles page.
- AI/agent-readable entrypoints are root `llms.txt` and `agent-index.json`; update them when navigation, public sections, or curated paths change.

## Workflow

1. Run `git status --short --branch` and inspect only relevant dirty files. Do not revert unrelated work.
2. Identify the owning source:
   - navigation label: `NAV` in `scripts/site_shell.py`
   - bilingual text on a section page: `data/site.json` or the generator that writes it (`bi()` pairs)
   - Work types, featured work, projects, changelog, About: `data/site.json`
   - AI-readable map: `llms.txt` and `agent-index.json`
3. Keep pages complete without JavaScript. CSS gates no-JS fallbacks with `:root.js` / `:root:not(.js)`; scripts only add interaction.
4. Prefer small schema additions in `data/site.json` over DOM-only hacks when content needs controlled layout.
5. When adding a curated item, decide whether it is a Work entry, a project, a related link, or a machine-readable entry. Do not duplicate the same object across sections unless the IA requires it.
6. If a public label changes, search for it across `data/site.json`, generators, generated HTML, TS, `llms.txt`, `agent-index.json`, and docs.
7. If `src/css/styles.css` or any page script changes, bump `css_version` / `js_version` in `data/site_shell.json`, then run `make generate`. Confirm the pages reference the new `?v=` key so local and deployed browsers do not keep stale files.
8. When a work, project or article is added, keep `site_updated` in `data/site_shell.json` at or after its date; `scripts/check_site.py` fails otherwise.

## Checks

`make generate` rebuilds everything in order; `make check` verifies without rewriting; CI runs `make check-all`. Before handing back broad edits:

```bash
make generate
make check-all
git diff --check
```

If `scripts/check_blog_generation.py` fails, isolate whether generated blog drift predates the current change before treating it as a regression.

## Local Preview

Use a local static server for visual checks:

```bash
python3 -m http.server 5199
```

If port `5199` is busy, choose another free port. Quote URLs with query strings in shell commands.

For visual changes, verify at least one desktop and one mobile viewport. If Browser tooling is unavailable, system Chrome headless can capture screenshots with a temporary profile:

```bash
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --disable-gpu --user-data-dir=/tmp/simoncos-site-qa --window-size=390,844 --screenshot=/tmp/site-mobile.png 'http://localhost:5199/?lang=zh'
```

If sandboxing blocks Chrome, request escalation and explain it is for local preview rendering only.
