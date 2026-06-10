# Site Modernization Plan

Last updated: 2026-06-10

## Goal

Make the site more reliable, easier to evolve, and faster on first load while preserving the current static-site deployment model. The target architecture is not a heavy SPA; it is a modern static publishing pipeline where generated HTML and lightweight JSON do most of the work, and client-side JavaScript only enhances already-useful pages.

## Current Baseline

- `python3 scripts/check_site.py` passes.
- The site is a static GitHub Pages/Vercel-compatible repo with hand-authored root pages, generated blog pages, JSON indexes, and a few standalone artifacts.
- Main public data files measured during review:
  - `data/article_groups.json`: about 422 KB
  - `data/blog_data.json`: about 424 KB
  - `src/css/styles.css`: 2,121 lines / about 44 KB
  - `projects/sleep-2016-2026*.html`: about 2.28 MB each
- No blocker-level issue was found, but several release and performance risks are not yet enforced by automation.

## Principles

1. Keep the public site static and inspectable.
2. Move derived structure to build time when it improves reliability or performance.
3. Keep authored content separate from generated indexes and runtime UI state.
4. Prefer small guardrails before large refactors.
5. Avoid framework migration unless the current generator and static HTML model becomes the bottleneck.

## Phase 1: Guardrails And Release Confidence

### 1.1 Add one command entry point

Add a repo-level command such as `make check` that runs:

- `python3 scripts/check_site.py`
- future smoke tests
- future generated-output drift checks

Acceptance:

- A contributor can run one command before publishing.
- CI and local checks use the same command.

### 1.2 Add CI

Add GitHub Actions to run checks on push and pull request.

Acceptance:

- Invalid local references, sitemap drift, navigation fallback drift, JSON path issues, and future checks block merges/deploys.

### 1.3 Make generation fail fast

`generate_blog_pages.py` currently logs per-post collect/render failures and continues. Change it so any failed markdown collection or page render causes the generation command to exit non-zero after reporting all failures.

Acceptance:

- A broken article cannot silently leave stale HTML or stale JSON behind.
- The error message lists every failed post.

### 1.4 Extend static checks

Near-term additions:

- Every `blogs/*.md` must have generated HTML.
- Every markdown file must appear in `data/article_groups.json`.
- `gallery_data.json` and `projects_data.json` `last_updated` must not predate their latest item date.
- Inline event handlers such as `onclick` should be disallowed in normal site HTML.

Later additions:

- Version drift check between generated site version and `git describe`.
- Orphan asset report.
- Optional external link check behind a separate network-enabled command.

## Phase 2: Data Shape And Performance

### 2.1 Split article index from full content

Current problem:

- `article_groups.json` and `blog_data.json` both include full `html_content` and `rendered_content`.
- Archive, tags, series, and homepage mostly need title, date, tags, excerpt, and language mapping.
- Backlinks are the main runtime consumer of full article HTML.

Target:

- `data/article_index.json`: lightweight public index.
- `data/backlinks_data.json`: build-time backlink graph.
- Full article HTML remains in generated pages and RSS generation internals, not in every list-page payload.

Acceptance:

- Homepage/blogs/tags/series no longer fetch full article HTML.
- Backlinks render from a precomputed graph.
- Existing bilingual behavior remains intact.

### 2.2 Pre-render core lists

Current problem:

- `index.html`, `blogs.html`, `projects.html`, and `gallery.html` have empty containers that rely on JS/fetch.

Target:

- Build-time render useful initial HTML for core lists.
- JS rehydrates/enhances language switching, filtering, and preview behavior.

Acceptance:

- Pages remain useful with JavaScript disabled.
- Search engines and link previews see real content.

### 2.3 Improve image output

Target generator behavior:

- Add `decoding="async"` to article images.
- Add `loading="lazy"` except for likely first/hero image.
- Add `width`/`height` when a local or known metadata source is available.
- Keep decorative images `alt=""`; require meaningful alt for content images where possible.

Acceptance:

- Less layout shift.
- Better browser scheduling.
- Accessibility issues become visible during generation/checking.

## Phase 3: Architecture Modernization

### 3.1 Unify layout generation

Current problem:

- Root pages and templates repeat script/style/footer shell.
- Cache keys and visible versions can drift.

Target:

- One layout source for head, nav, footer, RSS links, CSS/JS includes, and version fields.
- Hand-authored pages become page-body templates plus metadata.

Acceptance:

- New shell-level change is made once.
- `scripts/check_site.py` can verify generated shell consistency.

### 3.2 Move to explicit content manifest

Current problem:

- `Projects` and `Gallery` taxonomy is split.
- A page can live under `projects/` but only be indexed by Gallery.

Target:

- One content manifest with fields such as `type`, `surfaces`, `paths`, `cover`, `date`, and localized text.
- `projects_data.json` and `gallery_data.json` become generated views or thin projections.

Acceptance:

- One item can appear in multiple surfaces without duplicated hand-maintained metadata.
- Homepage Latest can include blog, project, gallery, and talk items intentionally.

### 3.3 Modularize CSS and JS

CSS target:

- Split or clearly layer `styles.css` into tokens, base, layout, components, and page-specific sections.
- Keep generated decks and standalone artifacts marked as frozen/generated.

JS target:

- Move repeated helpers into shared modules or a small global utility.
- Avoid inline event handlers.
- Prefer `textContent`/DOM APIs for untrusted content over string-built `innerHTML`.

Acceptance:

- New UI code has a clear place to live.
- Checks prevent reintroducing avoidable global/inline coupling.

## Phase 4: Heavy Artifact Refactors

### 4.1 Sleep visual essay

Current problem:

- Two large duplicated HTML pages, each around 2.28 MB.
- Plotly loads eagerly.
- Data and rendering code are embedded.

Target:

- `projects/sleep-2016-2026/`
  - `index.html`
  - `index.en.html`
  - shared CSS
  - shared chart runtime
  - JSON data
  - locale strings
- IntersectionObserver-based chart rendering.
- Static summary fallback.

Acceptance:

- Initial HTML is much smaller.
- Charts render only near viewport.
- Chinese and English share one runtime and data source.

### 4.2 Talk deck assets

Target:

- Treat published talk decks as generated/frozen artifacts.
- Optimize large PNG/PDF assets when revisiting the deck.
- Consider a reusable deck runtime only if more talks will use the same format.

Acceptance:

- Main site architecture does not inherit one-off deck assumptions.

## MoA Usage Plan

Use MoA for parallel work only when file ownership can be cleanly separated.

Good candidates:

- One agent reviews generated data shape while another reviews frontend consumers.
- One agent audits image/assets while another audits CI/check scripts.
- Sleep visual essay split can be divided into data extraction, chart runtime, and visual QA after a concrete target structure exists.

Avoid MoA when:

- Multiple changes touch the same generator or shared validation script.
- The next step is a small sequential patch with high merge-conflict risk.

## First Execution Batch

Start with Phase 1 because it reduces risk for every later change:

1. Add this plan document.
2. Add `make check`.
3. Add GitHub Actions for site checks.
4. Make `generate_blog_pages.py` fail if any post fails collection or rendering.
5. Remove inline theme toggle handler and bind it in JavaScript.
6. Extend `scripts/check_site.py` for markdown coverage, data `last_updated`, and inline event handlers.

After this batch, run:

```sh
make check
python3 -m py_compile generate_blog_pages.py scripts/check_site.py
```

## Execution Log

### 2026-06-10

Completed:

- Added this plan document.
- Added `Makefile` with `check`, `generate`, and `serve` commands.
- Added GitHub Actions site checks.
- Made blog generation fail if any article collection or render step fails.
- Removed inline theme-toggle `onclick` and bound the event in `dark-mode.js`.
- Extended `scripts/check_site.py` to check markdown coverage, stale `last_updated`, inline event handlers, and precomputed backlinks data.
- Added `data/backlinks_data.json` as the first build-time derived relationship file.
- Updated `load-backlinks.js` to prefer `backlinks_data.json` and fall back to legacy article-group parsing if needed.
- Added `data/article_index.json` as the lightweight public article index.
- Updated `article-groups.js` to prefer `article_index.json` and fall back to legacy `article_groups.json` if needed.
- Expanded `make check` to run JavaScript syntax checks for `src/js/*.js`.
- Added static fallback content to the home, blogs, projects, and gallery entry pages.
- Updated the homepage recent feed to include gallery items, not only blogs and projects.
- Added JS cache keys to main-site `src/js/*.js` script tags and a check to keep them consistent.
- Added `scripts/update_static_fallbacks.py` so entry-page fallback HTML is generated from data.
- Added fallback drift checking to `make check` and fallback generation to `make generate`.
- Added generated article image scheduling hints: `decoding="async"` on article images and `loading="lazy"` after the first article image.
- Added local-image dimension inference for generated article images when dimensions can be read from local PNG, JPEG, GIF, or SVG files.
- Added static checks so generated blog pages keep image scheduling hints and local image dimensions.
- Added lazy/async image attributes to Projects and Gallery card covers in both static fallbacks and dynamic JS renderers.
- Added `data/content_manifest.json` as the single maintenance source for Projects/Gallery/Home surface membership.
- Added `scripts/update_surface_data.py` to generate `data/projects_data.json` and `data/gallery_data.json` as thin projections from the manifest.
- Added surface data drift checking to `make check` and surface data generation to `make generate`.
- Added `data/site_shell.json` as the shared source for common head resources, script profiles, cache keys, RSS/icon links, and footer version markup.
- Added `scripts/update_site_shell.py` to synchronize root pages and templates without introducing a framework or bundler.
- Added shared shell drift checking to `make check` and shell synchronization to `make generate`.
- Ran a five-agent MoA test pass covering build/CI gates, generated data integrity, frontend runtime smoke, SEO/static publishing, and performance/accessibility risk.
- Added `scripts/check_blog_generation.py` so `make check` verifies generated blog HTML, article data, backlinks data, and RSS outputs are current without mutating the working tree.
- Updated CI to install Python dependencies from `requirements.txt` and pin Node with `actions/setup-node`.
- Fixed direct Chinese article URLs so dynamic UI, backlinks, and series text initialize from the article language when no explicit `?lang=` is present.
- Replaced the current-article series `innerHTML` path with DOM/textContent rendering.
- Fixed RSS Atom namespace output to use `atom:link` instead of `ns0:link`.
- Bumped the shared JS cache key to `20260610b` after runtime JS changes.

Verified:

- `make check`
- `python3 -m py_compile generate_blog_pages.py scripts/check_site.py`
- Local browser smoke test for navigation loading and theme toggle behavior.
- `python3 generate_blog_pages.py`
- `python3 scripts/update_static_fallbacks.py`
- `python3 scripts/check_site.py`
- Browser smoke on local static server: homepage recent list, Projects/Gallery cards, article image lazy/async attributes, and console errors.
- `python3 scripts/update_surface_data.py --check`
- `python3 -m py_compile scripts/update_surface_data.py`
- `python3 scripts/update_site_shell.py --check`
- `python3 -m py_compile scripts/update_site_shell.py`
- Browser smoke on local static server: shared resource markers, footer markers, script cache keys, navigation, key list rendering, article rendering, and console errors.
- `python3 scripts/check_blog_generation.py`
- `node --check src/js/i18n.js`
- `node --check src/js/load-post-series.js`
- Browser regression smoke: direct Chinese article URL renders Chinese nav/backlinks/series text without `?lang=zh`; English article remains English.

Next:

- Phase 1 and Phase 2 acceptance are now covered by local checks.
- Remove full HTML payloads from public hot-path data after legacy compatibility is no longer needed.
- Continue Phase 3 without a framework migration: reduce remaining CSS/JS duplication and keep generated/standalone artifacts clearly separated.
- Decide metadata policy for standalone artifacts: sleep visual essay pages, talk deck, embedded dashboards, and research exports should either receive shared icon/RSS/meta coverage or explicit noindex/frozen-artifact treatment.
