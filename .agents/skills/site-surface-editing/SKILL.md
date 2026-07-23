---
name: site-surface-editing
description: Edit the `simoncos.github.io` public site surfaces safely. Use when changing homepage live surface data, Gallery, Projects, About, navigation labels, i18n copy, CSS for root pages, `data/home_surface.json`, `data/content_manifest.json`, `llms.txt`, or `agent-index.json`. Also use when fixing drift between hand-authored HTML, TypeScript source, compiled JS, generated surface JSON, and static fallback HTML.
---

# Site Surface Editing

Use this skill for source-of-truth and verification discipline on the main personal site. Pair with `frontend-design` for visual design work and `site-copy-and-ia` for public copy/IA judgment.

## Source Map

- Root pages are hand-authored HTML: `index.html`, `about.html`, `gallery.html`, `projects.html`, `navigation.html`.
- TypeScript source lives in `src/ts/*.ts`; compiled browser JS in `src/js/*.js` is tracked. Run `npm run build:ts` after TS edits.
- Shared shell resources come from `data/site_shell.json` via `scripts/update_site_shell.py`.
- Home live editorial state is `data/home_surface.json`; keep `index.html` fallback meaningful if JS fails.
- Gallery/Projects generated JSON comes from `data/content_manifest.json` via `scripts/update_surface_data.py`.
- Static fallback cards/lists come from `scripts/update_static_fallbacks.py`; do not hand-edit generated fallback blocks unless also changing the generator/data.
- AI/agent-readable entrypoints are root `llms.txt` and `agent-index.json`; update them when navigation, public surfaces, or curated paths change.

## Workflow

1. Run `git status --short --branch` and inspect only relevant dirty files. Do not revert unrelated work.
2. Identify the owning source:
   - navigation label: `navigation.html`, fallback nav in `src/ts/load-nav.ts`, and `src/ts/i18n.ts`
   - bilingual text: `src/ts/i18n.ts` plus visible HTML fallback text
   - Gallery/Projects membership: `data/content_manifest.json`, then generate surface data
   - homepage editorial state: `data/home_surface.json`, `index.html`, and `src/ts/load-home-surface.ts` if schema changes
   - AI-readable map: `llms.txt` and `agent-index.json`
3. Keep data-driven and fallback surfaces aligned. A page should remain understandable with JS disabled.
4. Prefer small schema additions over ad hoc DOM-only hacks when homepage content needs controlled layout, for example `title_lines` for stable bilingual hero breaks.
5. When adding a curated surface such as Personal Data Lab, decide whether it is a page section, a Gallery item, a Projects item, or a machine-readable entry. Do not duplicate the same object across sections unless the IA requires it.
6. If a public label changes, search for it across HTML, TS, compiled JS after build, `llms.txt`, `agent-index.json`, and docs.
7. If `src/css/styles.css` changes, bump `data/site_shell.json` `css_version`, then regenerate shared shells and generated blog pages. Confirm the served HTML references the new `styles.css?v=` key so local and deployed browsers do not keep stale CSS.

## Checks

Run the relevant subset, and run the full set before handing back broad surface edits:

```bash
npm run build:ts
npm run check:ts
jq empty agent-index.json data/home_surface.json data/site_shell.json data/content_manifest.json
python3 scripts/update_site_shell.py
python3 generate_blog_pages.py
python3 scripts/check_site.py
python3 scripts/update_site_shell.py --check
python3 scripts/update_static_fallbacks.py --check
python3 scripts/update_surface_data.py --check
python3 scripts/check_blog_generation.py
find src/js -name '*.js' -print0 | xargs -0 -n 1 node --check
rg -n "styles.css\\?v=" --glob "*.html" .
git diff --check
```

`make check` also runs `scripts/check_blog_generation.py`. If it fails, isolate whether generated blog drift predates the current surface change before treating it as a regression.

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
