**Source Visual Truth**
- Projects selected B: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0405b795e9ddb5f7016a4524df6be0819b87f98e9a666608d6.png`
- Essays selected B: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0405b795e9ddb5f7016a45259c5e10819bb3b16a0e09679ed0.png`
- Gallery selected option 2: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0ab759c9578b2840016a452c0539ac819ba03b3c33a3a616b7.png`
- About selected A: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0405b795e9ddb5f7016a4526ab0b48819bb6268ea1dfdda715.png`

**Implementation Evidence**
- local URL: `http://127.0.0.1:5199/`
- desktop Projects: `/private/tmp/simoncos-layout-fix/final-projects.png`
- desktop Essays: `/private/tmp/simoncos-layout-fix/final-blogs.png`
- desktop Gallery: `/private/tmp/simoncos-layout-fix/final-gallery.png`
- desktop About: `/private/tmp/simoncos-layout-fix/final-about.png`
- mobile Essays: `/private/tmp/simoncos-layout-fix/final-mobile-blogs.png`
- mobile Gallery: `/private/tmp/simoncos-layout-fix/final-mobile-gallery.png`
- mobile About: `/private/tmp/simoncos-layout-fix/final-mobile-about.png`
- dark Projects: `/private/tmp/simoncos-layout-fix/final-dark-projects.png`

**Full-View Comparison Evidence**
- Projects comparison: `/private/tmp/simoncos-layout-fix/comparison-projects.png`
- Essays comparison: `/private/tmp/simoncos-layout-fix/comparison-blogs.png`
- Gallery comparison: `/private/tmp/simoncos-layout-fix/comparison-gallery.png`
- About comparison: `/private/tmp/simoncos-layout-fix/comparison-about.png`

**Viewport**
- Desktop light comparison: 1440 x 1024.
- Mobile layout check: 390 x 844, Chinese UI state.
- Dark theme check: 1440 x 1024.

**State**
- Projects route: `body.projects-index-page`
- Essays route: `body.essays-index-page`
- Gallery route: `body.gallery-index-page`
- About route: `body.about-profile-page`
- CSS and JS cache key: `20260702b`

**Findings**
- P1 fixed: The previous Projects implementation used a large page title, right-side facts, and a separate project-index card pattern. It now follows the selected ledger mock: top metadata rail, project hero, wide report preview, horizontal fact rows, and project surface rows.
- P1 fixed: The previous Essays implementation inserted a featured-card board that made the archive feel scattered. It now uses the selected archive layout: large title, compact copy, article ledger rows, and a right filter/RSS rail. Runtime archive rendering and static fallback now share the same row structure.
- P1 fixed: The previous Gallery implementation read as two generic project cards plus a disconnected Personal Data Lab strip. It now uses a single image-led mosaic, tighter filter rail, and a data-lab strip in the same visual system.
- P1 fixed: The previous About implementation had nested cards and a fragmented work-mode grid. It now reads as a profile sheet with facts, row-based work modes, row-based contact links, and reduced explanatory heading weight.
- P2 fixed: Header/title collisions on Essays and Gallery were caused by title columns that were too narrow for the display serif. The title grid columns were widened and spacing tightened.
- P2 fixed: Projects had a cropped report preview and double divider before the fact rows. The image now uses contained rendering and the duplicate rule was removed.
- P2 fixed: Mobile layouts have no horizontal overflow; nav height is 82px on the 390px Chinese viewport and 83px on tablet; page rows collapse into single-column ledgers.

**Required Fidelity Surfaces**
- Fonts and typography: serif display hierarchy and sans uppercase labels now match the selected editorial direction more closely; large explanatory headings on About were removed.
- Spacing and layout rhythm: four pages now share one ledger/page-frame system with consistent 1240px desktop frame, section rules, row rhythm, and reduced card nesting.
- Colors and visual tokens: light and dark routes use existing editorial paper/ink/accent/rule tokens; dark Projects screenshot shows no light-background residue.
- Image quality and asset fidelity: implementation uses existing project/gallery SVG assets. Gallery remains constrained by the current two real gallery records rather than the six-item mock.
- Copy and content: page intros were removed or compressed; remaining text is aligned with existing site content and i18n keys.

**Patches Made Since Previous QA Pass**
- Replaced Projects page structure with `ledger-topline`, `project-ledger-hero`, `project-ledger-facts`, and `project-surfaces-ledger`.
- Replaced Essays listing template with archive top, archive layout, and right rail; updated `scripts/update_static_fallbacks.py` and `src/ts/load-blog-archive.ts` to output row-based article previews.
- Reworked Gallery into `gallery-archive-top` plus `gallery-showcase`, keeping generated gallery fallback intact.
- Reworked About into profile/facts/modes/contact/principles ledger sections, removing card-heavy nested panels.
- Added consolidation CSS for shared selected-page frame, desktop/mobile ledger rows, dark-state overrides, and tighter Gallery/About/Essays typography.
- Added i18n keys for new filter/preview/principle labels.
- Bumped shared shell cache key to `20260702b` and regenerated shell/blog/fallback outputs.

**Follow-Up Polish**
- P3: Gallery can better match the six-card source mock once more real image-led artifacts exist. Current implementation keeps the content honest and uses two real records.
- P3: Projects report preview uses the existing sleep-cover asset, so chart details differ from the mock. Replacing it with a dedicated report-chart asset would improve fidelity.

**Verification**
- `npm run build:ts`
- `npm run check:ts`
- `jq empty agent-index.json data/home_surface.json data/site_shell.json data/content_manifest.json data/gallery_data.json data/projects_data.json`
- `python3 scripts/check_site.py`
- `python3 scripts/update_site_shell.py --check`
- `python3 scripts/update_static_fallbacks.py --check`
- `python3 scripts/update_surface_data.py --check`
- `python3 scripts/check_blog_generation.py`
- `find src/js -name '*.js' -print0 | xargs -0 -n 1 node --check`
- `git diff --check`

**MoA Visual QA Follow-Up - 2026-07-02**

Scope:
- MoA review after the selected Projects B, Essays B, Gallery option 2, and About A implementation.
- Focused on layout coherence, responsive density, theme switching, navigation semantics, and static-vs-generated drift.

After-fix evidence:
- desktop Projects: `/private/tmp/simoncos-moa-visual-qa-after/desktop-projects.png`
- desktop Essays: `/private/tmp/simoncos-moa-visual-qa-after/desktop-blogs.png`
- desktop Gallery: `/private/tmp/simoncos-moa-visual-qa-after/desktop-gallery.png`
- desktop About: `/private/tmp/simoncos-moa-visual-qa-after/desktop-about.png`
- tablet Gallery: `/private/tmp/simoncos-moa-visual-qa-after/tablet-gallery.png`
- mobile Projects: `/private/tmp/simoncos-moa-visual-qa-after/mobile-zh-projects.png`
- mobile Essays: `/private/tmp/simoncos-moa-visual-qa-after/mobile-zh-blogs.png`
- mobile Gallery: `/private/tmp/simoncos-moa-visual-qa-after/mobile-zh-gallery.png`
- mobile About: `/private/tmp/simoncos-moa-visual-qa-after/mobile-zh-about.png`
- dark Gallery: `/private/tmp/simoncos-moa-visual-qa-after/dark-gallery.png`

Decision updates:
- Accepted: Projects no longer duplicates the top action, and connected-artifact count now matches the visible inventory.
- Accepted: Essays metadata now says Essays instead of Blog Posts; archive rows are denser with shorter excerpts.
- Accepted: Gallery filter labels are real section anchors, not static faux controls; desktop first viewport now exposes the Personal Data Lab strip.
- Accepted: About mobile facts collapse cleanly, and the name divider no longer creates a stray mobile line.
- Accepted: Primary nav active state now sets `aria-current="page"` and scrolls the active item into view on narrow viewports.
- Accepted: Navigation fetch is versioned with the asset key, preventing stale `navigation.html` from preserving old theme markup.
- Accepted: Theme toggle now self-heals its hidden label and renders icon-only system/light/dark states; dark mode background and text colors switch correctly.

Runtime metrics:
- Desktop viewport: 1440 x 1024; tablet viewport: 768 x 1024; mobile viewport: 390 x 844.
- All checked pages report `overflowX=0`.
- Active nav links are visible in every checked viewport and report `aria-current=page`.
- Light theme uses `rgb(251, 247, 238)` page background; dark Gallery uses `rgb(16, 23, 36)` background and `rgb(237, 243, 255)` body text.
- Gallery desktop: first card bottom `891`, Personal Data Lab top `905` in a 1024px viewport, so the next section is visibly present.

Verification delta:
- `npm run build:ts`
- `npm run check:ts`
- `jq empty agent-index.json data/home_surface.json data/site_shell.json data/content_manifest.json`
- `python3 scripts/check_site.py`
- `python3 scripts/update_site_shell.py --check`
- `python3 scripts/update_static_fallbacks.py --check`
- `python3 scripts/update_surface_data.py --check`
- `python3 scripts/check_blog_generation.py`
- `find src/js -name '*.js' -exec node --check {} \;`
- `git diff --check`

**final result: passed**

**MoA Visual QA Follow-Up - 2026-07-02 Gallery second pass**

Scope:
- Second MoA review after Gallery was still visually far from the selected option 2 direction.
- Focused on Gallery asset fidelity, board density, Personal Data Lab treatment, mobile filter behavior, About mobile title, and theme stability.

Agent findings:
- P1: Gallery card imagery still read as generic implementation assets rather than the visual-board reference.
- P1: Personal Data Lab was too sparse and disconnected from the board.
- P2: Desktop Gallery let the footer/version area intrude too early and weakened the mock's full-board impression.
- P2: Mobile Gallery filters wrapped awkwardly; About mobile title needed tighter handling.
- P2: Dark mode needed another media/marker check after Gallery asset changes.

Fixes:
- Replaced the Gallery board imagery with cropped mock-aligned runtime assets for the talk, sleep records, Hermes/HV, Haba, toolkit, and system-map cards.
- Added versioned Gallery data fetching so `data/gallery_data.json` cannot preserve stale cover art.
- Widened the Gallery frame to `1340px`, tightened the board, moved the footer below the first desktop viewport, and hid the build hash from the page footer.
- Converted the mobile Gallery filter into a single-line horizontal scroller with no page-level overflow.
- Reworked Personal Data Lab into denser metric cells with pure-CSS markers that render correctly in light and dark modes.
- Kept the compact About mobile title treatment from the first MoA fix.

Final evidence:
- desktop Gallery light: `/private/tmp/simoncos-moa-visual-qa-20260702-final/desktop-gallery-headless-v2.png`
- mobile Gallery light: `/private/tmp/simoncos-moa-visual-qa-20260702-final/mobile-gallery-headless-v2.png`
- desktop Gallery dark: `/private/tmp/simoncos-moa-visual-qa-20260702-final/dark-gallery-headless-v2.png`
- mobile About: `/private/tmp/simoncos-moa-visual-qa-20260702-final/mobile-about-headless.png`

Runtime metrics:
- Desktop Gallery 1440 x 1024: `cardCount=6`, `overflowX=0`, hero `217/505`, Personal Data Lab `804/882`, footer starts at `1010`, `siteVersionDisplay=none`.
- Mobile Gallery 390 x 844: `cardCount=6`, `overflowX=0`, filter is a deliberate horizontal scroller (`331px` viewport, `422px` content), hero `330/626`.
- Mobile About 390 x 844: `overflowX=0`, overflowing element list empty.
- Dark Gallery 1440 x 1024: `overflowX=0`, body background `rgb(16, 23, 36)`, body text `rgb(237, 243, 255)`, `darkClass=true`.

Remaining P3:
- The mobile filter rail is intentionally horizontally scrollable because all Gallery sections remain exposed as real anchors.
- The Haba card is now image-led and closer to the mock, but still uses an available generated route/field composite rather than a fully bespoke map interaction.

**final result: passed**

**Gallery Fidelity Follow-Up - 2026-07-02**

Scope:
- Targeted Gallery page image-to-code pass after user reported that Gallery still differed materially from the selected visual direction.
- Baseline visual source: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0ab759c9578b2840016a452c0539ac819ba03b3c33a3a616b7.png`.

Evidence:
- final desktop Gallery: `/private/tmp/simoncos-gallery-fidelity/gallery-desktop-1440x1024-final.png`
- final mobile Gallery: `/private/tmp/simoncos-gallery-fidelity/gallery-mobile-390x844-final.png`
- final side-by-side comparison: `/private/tmp/simoncos-gallery-fidelity/gallery-reference-vs-implementation-final.png`
- generated runtime asset: `gallery/assets/gallery-hero-network.png`

Decision updates:
- Accepted: Gallery now renders as a six-card visual board with a full-width Personal Data Lab strip, instead of two dynamic cards plus disconnected secondary content.
- Accepted: Desktop header/nav rhythm is compact enough for the selected Gallery mock; Gallery title, lede, and filters sit in one horizontal band.
- Accepted: Runtime data and static fallback both use the same talk cover asset, avoiding old dynamic-data drift.
- Accepted: Haba field note now uses a mountain/field image instead of the previous shoe close-up.
- Accepted: Mobile Gallery collapses to a single column without horizontal overflow; top filter and active nav are visible without clipped labels.
- Accepted: Hero image no longer contains visible text residue behind the editable card title.

Runtime metrics:
- Desktop 1440 x 1024: `cardCount=6`, `overflowX=0`, hero top/bottom `217/505`, Personal Data Lab top/bottom `804/882`.
- Mobile 390 x 844: `cardCount=6`, `overflowX=0`, card width `351`, active Gallery nav visible, first Home nav label visible.

Remaining P3:
- The selected mock's Haba card includes a route-map composite; the runtime uses an available real field image instead of inventing a map asset.
- The runtime page footer appears in the bottom of the 1024px viewport because the implemented content is real and slightly denser than the mock.

**final result: passed**

**Image Gen Gallery Refinement - 2026-07-02**

Scope:
- Implemented the latest Image Gen Gallery direction as the runtime target.
- Baseline visual source: `/Users/simoncbot/.codex/generated_images/019efd42-6abb-7432-a493-3a070cd32a54/ig_0e2921ad63fa0b41016a466df970dc8193a55dc4c453692146.png`.

Fixes:
- Rebuilt the Gallery desktop board around a tall left hero, compact filter rail, editorial card grid, and integrated Personal Data Lab strip.
- Shortened Gallery and Personal Data Lab copy so the page reads as a visual archive rather than a text-heavy intro.
- Cropped transformed media inside card frames to prevent Haba and hero asset text residue from bleeding into card body text.
- Changed mobile Gallery filters from a clipped horizontal rail to a compact two-line wrap.
- Tightened Gallery mobile nav so all labels are visible at 390px.
- Preserved existing language/theme controls instead of adding the mock's nonfunctional search icon.

Final evidence:
- desktop Gallery light: `/private/tmp/simoncos-gallery-imagegen-refinement/gallery-light-desktop-1440x1024-final.png`
- mobile Gallery light: `/private/tmp/simoncos-gallery-imagegen-refinement/gallery-light-mobile-390x844-final.png`
- desktop Gallery dark: `/private/tmp/simoncos-gallery-imagegen-refinement/gallery-dark-desktop-1440x1024-final.png`

Runtime metrics:
- Desktop Gallery 1440 x 1024: `cardCount=6`, `overflowX=0`, theme `light`, hero `325/866`, Personal Data Lab `881/1030`.
- Mobile Gallery 390 x 844: `cardCount=6`, `overflowX=0`, filters wrap to `331px` without scroll, theme `light`, hero `382/678`.
- Dark Gallery 1440 x 1024: `overflowX=0`, theme `dark`, body background `rgb(16, 23, 36)`, body text `rgb(237, 243, 255)`.

Remaining P3:
- Desktop Personal Data Lab intentionally starts inside the first 1024px viewport and extends a few pixels below the fold because the implemented page keeps real nav and footer spacing.
- Some card imagery remains generated/static rather than bespoke per-card illustrations; all visible text duplication and clipping issues from the latest pass were removed.

**final result: passed**

**Projects Report Preview Asset - 2026-07-14**

Scope:
- Closed the remaining P3 from Follow-Up Polish: the Projects report preview reused `projects/assets/sleep-2016-2026-cover.svg` (the data-essay cover), so the chart read as essay art rather than a Sleep Toolkit report.

Fixes:
- Added a dedicated hand-authored asset `projects/assets/sleep-report-preview.svg`: a dark report panel with a monthly-report metadata rail, "Average nightly sleep" hero stat, a 12-month nightly-average line chart with a dashed 7 h reference, an emphasized latest-month point, and a footer facts row consistent with the page metrics (3,656 nights · 2016–2026 · JSON / HTML / PDF).
- Panel background matches the report-card image plate (`#111a28`) so `object-fit: contain` letterboxing is seamless in both themes; line hue follows the editorial accent family and passes >=3:1 contrast against the panel.
- Pointed `data/content_manifest.json` projects `featuredDetail.media.src` at the new asset and regenerated `data/projects_data.json` and the `projects.html` static fallback. The data-essay cover and its og:image usage are unchanged.

Runtime evidence:
- Desktop Projects 1440 x 1024, light and dark: report card renders the new chart with seamless panel edges.
- Mobile Projects 390 x 844: single-column card keeps the chart legible with no horizontal overflow.

Verification:
- Full suite re-run and green: `npm run build:ts`, `npm run check:ts`, `jq empty` on manifests, `scripts/check_site.py`, `scripts/update_site_shell.py --check`, `scripts/update_static_fallbacks.py --check`, `scripts/update_surface_data.py --check`, `scripts/check_blog_generation.py`, `node --check` on `src/js`, `git diff --check`.

**final result: passed**

**Home Ledger Alignment - 2026-07-14**

Scope:
- Brought the homepage into the same ledger/page-frame system as Projects, Essays, Gallery, and About. Home previously kept the old card-heavy layout: the hero and Current Index sat inside a tinted gradient-edged card, Reading Paths had a broken grid with large phantom gaps, Recent Updates rendered as a floating card with misaligned dates, and action arrows used ASCII "->".

Fixes:
- Added the shared `ledger-topline` rail to the homepage (Home / kicker / updated date, with an "Index & archive →" action) with new `home_topline_*` i18n keys in English and Chinese; the duplicated hero kicker is now hidden.
- Flattened the hero: removed the card border, gradient background, shadow, and rainbow bottom bar in light and dark modes; the hero now closes with a single editorial rule like other pages.
- Flattened Recent Updates: removed the `content-section` card border/background/shadow (light and dark) so it reads as a right rail behind a vertical rule; pinned title and date to one row on desktop and stacked them title-first on mobile.
- Fixed Reading Paths: hidden fourth card rule and mobile single-column rules were being overridden by higher-specificity base rules (`.home-page-content` prefix added); removed the 3.15rem phantom margin above titles; added `align-content: start` so the stretched grid no longer inflates the heading and card rows.
- Replaced the CSS-generated ASCII " ->" arrow suffix with a real " →" to match the arrows used on other pages.
- Fixed mobile `home-system-node` sizing rules (899px and 520px blocks) that lost the same specificity fight.
- Bumped the shared shell cache key to `20260714a`, propagated to all pages, and regenerated blog pages and RSS feeds.

Runtime evidence:
- Desktop Home 1440 x 1024, light and dark: flat ledger frame, topline rail, aligned Reading Paths / Recent Updates kickers, `overflowX=0`.
- Mobile Home 390 x 844, English and Chinese: single-column ledger rows, stacked recent rows (title above date), topline localizes via `home_topline_*` keys, `overflowX=0`.
- Regression pass at 1440 x 1024 on blogs, projects, gallery, about, series, and tags: all `overflowX=0`, no visual drift from the shared cache-key bump.

Verification:
- Full suite green: `npm run build:ts`, `npm run check:ts`, `jq empty` on manifests, `scripts/check_site.py`, `scripts/update_site_shell.py --check`, `scripts/update_static_fallbacks.py --check`, `scripts/update_surface_data.py --check`, `scripts/check_blog_generation.py` (after `generate_blog_pages.py`), `node --check` on `src/js`, `git diff --check`.

**final result: passed**
