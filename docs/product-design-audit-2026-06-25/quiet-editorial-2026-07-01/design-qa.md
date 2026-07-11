# Quiet Editorial QA - 2026-07-01

## Source

- Selected design direction: Quiet Editorial Index.
- Reference image: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0b79c616105ceb15016a400a58dae0819bb286c386071d9869.png`
- Local preview: `http://127.0.0.1:5199/index.html`

## Screenshot Matrix

- `01-home-desktop.png` - `1440x1200`, English homepage.
- `02-home-mobile.png` - `390x1100`, Chinese homepage.
- `03-gallery-desktop.png` - `1440x1100`, English Gallery.
- `04-projects-desktop.png` - `1440x1100`, English Projects.
- `05-about-desktop.png` - `1440x1100`, English About.
- `06-blogs-desktop.png` - `1440x1100`, English Blog listing.
- `07-gallery-mobile.png` - `390x1100`, Chinese Gallery.
- `08-projects-mobile.png` - `390x1100`, Chinese Projects.
- `09-about-mobile.png` - `390x1100`, Chinese About.
- `10-blogs-mobile.png` - `390x1100`, Chinese Blog listing.

## Findings

- P0 fixed: homepage featured-path rows were overlapping because older `route-node-*` grid placement rules were still creating an implicit two-column grid. Final CSS resets `grid-column` and `grid-row` for the quiet editorial list.
- P0 fixed after user feedback: route-journal homepage dark mode had a higher-specificity light background rule on `body.home-page[data-home-layout="route-journal"]`, so system/dark mode produced light backgrounds with dark-mode text variables. Final CSS adds homepage-specific dark-mode background and variable-color overrides.
- P1 fixed after user feedback: homepage first screen was too visually busy at runtime. The hero is now a compact intro block, with Featured paths beginning below the intro as a full-width editorial index instead of competing with the large title in the same grid.
- P1 fixed: shared navigation is now compact and consistent across homepage, Gallery, Projects, Blogs, About, Series, Tags, and generated article pages through the site shell CSS version update.
- P1 fixed: bulky `page-intro` treatments are flattened into editorial title rows with thin rules and no card background, shadow, or heavy rounded framing.
- P1 fixed: cross-page card surfaces now use low-shadow, thin-border editorial styling instead of the prior large card/hero feel.
- P2 checked: desktop and mobile screenshot metrics reported no horizontal overflow for all captured pages.

## Verification

- `npm run build:ts`
- `npm run check:ts`
- `jq empty agent-index.json data/home_surface.json data/site_shell.json data/content_manifest.json`
- `python3 scripts/update_site_shell.py --check`
- `python3 scripts/update_static_fallbacks.py --check`
- `python3 scripts/update_surface_data.py --check`
- `python3 scripts/check_blog_generation.py`
- `python3 scripts/check_site.py`
- `find src/js -name '*.js' -print0 | xargs -0 -n 1 node --check`
- `git diff --check`

## Result

Targeted fix passed after user feedback. Verified in the in-app browser at desktop `1280x720` for light and system/dark mode, and at mobile `390x844` for system/dark mode. Remaining product/design question is subjective: the Gallery and Projects content sections are still information-dense, but they now share the selected quiet editorial shell instead of competing with separate page-intro hero blocks.
