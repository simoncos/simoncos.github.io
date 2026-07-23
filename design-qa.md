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

**Sitewide Ledger Consistency Pass - 2026-07-14**

Scope:
- Full-site audit follow-up covering the two pages that had missed the redesign (article reading pages and 404) plus a batch of smaller inconsistencies found across About, Essays dark mode, Tags, Gallery, and Home.

Fixes:
- Article pages (`blogs/*.html`): post title and in-article h1-h4 now use the editorial serif with ink color and neutral letter-spacing; the language switch is a flat accent "中文/EN →" link instead of a rounded chip; the mobile table-of-contents summary and desktop TOC are flat with editorial rules; backlinks/tags/series blocks are flat rule-topped sections with uppercase accent labels; in-article tag chips are flat text links; the "Article" header kicker is hidden to match every other page.
- 404: rebuilt as a ledger page (`body.error-page`, `page-ledger-frame`) with an "Error 404" kicker, serif "Page not found" title, muted lede, and a flat "Back to home →" link; removed the tinted card, gradient pill button, house icon, and watermark 404 in both themes.
- About: identity scale raised (name to clamp 2.5-3.2rem, motto to 1.35rem), column ratios rebalanced toward profile and contact, section padding deepened, contact rows taller, and the CJK name parenthesis outdented so a wrapped "（趙澈）" no longer reads as indented.
- Essays: dark mode archive rows are now flat (the old elevated card background no longer bleeds through); the preview toggle is a flat uppercase control with the duplicated "Preview" label removed and editorial accent on the checkbox.
- Tags: removed the repeated zero-information "TAGS" pill from every section in the runtime renderer; the left meta now shows only the post count.
- Gallery: removed the stray filler rule after the section-index filter row (it doubled with the section border), and re-anchored the filter nav into the explicit grid column so it stays left-aligned.
- Home: restored the "Recently" legend under the hero actions as flat ledger rows (Building/Thinking/Field), filling the previously empty left column; data and i18n were already present.
- Bumped the shared shell cache key to `20260714b`, propagated to all pages, regenerated blog pages and RSS.

Runtime evidence:
- Article desktop/mobile/dark, 404 desktop/mobile/dark, About desktop/dark, Essays dark, Tags desktop, Gallery top, Home desktop/mobile: all render in the shared editorial system with `overflowX=0`.

Verification:
- Full suite green: `npm run build:ts`, `npm run check:ts`, `jq empty` on manifests, `scripts/check_site.py`, `scripts/update_site_shell.py --check`, `scripts/update_static_fallbacks.py --check`, `scripts/update_surface_data.py --check`, `scripts/check_blog_generation.py` (after `generate_blog_pages.py`), `node --check` on `src/js`, `git diff --check`.

**final result: passed**

**Home Recently Legend Removal - 2026-07-14**

- User feedback: the restored "Recently" legend (Building/Thinking/Field) read as filler — category labels with no real content, duplicating what Current Index already shows concretely.
- Reverted: the legend is hidden again (`.home-route-legend` back in the route-journal hide list) and its row styling removed; the hero left column returns to intentional editorial whitespace.
- Cache key bumped to `20260714c`; shell propagated, blog outputs regenerated; check suite green.

**final result: passed**

**Hollow Content Sweep - 2026-07-14**

Scope:
- After the Recently-legend removal, swept every page for the same class of problem: sections that look like content but carry no information, or purely repeat content shown elsewhere.

Findings and fixes:
- Article pages: posts without backlinks or a series rendered whole sections reading "Backlinks — No backlinks found." and "Series — No series." The renderers (`load-backlinks.ts`, `load-post-series.ts`) now hide the entire section when there is nothing to show, and show it only with real items (verified: haba post hides both; the abyss series post still shows its 2-part series and real backlinks).
- Projects: the bottom "Project ledger" listed exactly one row — the same Sleep Toolkit already presented as the featured hero above. Both the static generator (`update_static_fallbacks.py`) and the runtime renderer (`load-projects.ts`) now ship the section `hidden` when the only ledger entry is the featured project; it reappears automatically once a second project exists.
- Home hero action: "See what is active →" pointed at `#system-map`, the hero section itself — clicking scrolled nowhere. It now points at `#blog` (Latest activity), matching its label in both languages.
- Home Reading Paths: the Building/Thinking/Field cards were the same abstract triad as the removed legend, and their links duplicated Current Index items. Replaced with the three real site sections — Projects / Essays / Gallery — each reusing its page's existing description copy (en + zh) and linking to the index page. i18n keys renamed to `home_trail_projects|essays|gallery_*`; `data/home_surface.json` trails updated to match; the fourth (hidden) card removed.

Reviewed and left alone:
- Gallery's Personal Data Lab strip (part of the approved option-2 mock, presented as a curated path), About's Location/Open-here facts (short but factual), Essays filters/RSS rail (functional).

Verification:
- Full suite green; article/projects/home re-verified in the browser: hidden-when-empty behavior confirmed on both empty and non-empty posts, projects ledger hidden statically and at runtime, home trails render the three real sections in en and zh data paths.

**final result: passed**

**Mobile Gallery Deduplication - 2026-07-15**

Scope:
- User feedback: on the 390px Gallery, sections had no visible separation, so "Personal Information Systems" and the sleep essay appeared to show up twice.

Root causes:
- The Personal Data Lab strip collapses on mobile into three bare text rows ("Ten years of sleep records / Sleep Toolkit / Haba Snow Mountain") that literally repeat cards directly above in the single-column board.
- The "AI personal information system" card artwork (a light network map) letterboxed via `object-fit: contain` into a short mobile frame rendered as near-blank, making the card read as a broken duplicate of the similarly named talk card.
- Card type labels were too quiet to distinguish sections in a single column.

Fixes (all scoped to the ≤640px gallery block):
- Hide the Personal Data Lab strip and its section-index anchor on mobile (desktop keeps both; a same-specificity later rule required a higher-specificity hide selector).
- Render the system-map card image with `object-fit: cover` so the artwork fills the frame and reads clearly.
- Uppercase, letter-spaced type labels (VISUAL ESSAY / ARTIFACT / FIELD NOTE / TOOL) so single-column cards self-identify; board gap widened to 1.15rem.

Verified:
- Mobile 390px full page: no duplicate rows, system-map artwork visible, all six card images load, `overflowX=0`.
- Desktop 1440px: Personal Data Lab strip and its filter anchor unchanged.
- Cache key bumped to `20260715a`; shell propagated, blog outputs regenerated; check suite green.

Known content-level note (left for owner decision):
- The "AI personal information system" visual-essay card links to the same destination as the talk card (`gallery/talks/pkm-2026-06-07/index.html`). Visually they are now clearly distinct, but they remain two entries pointing at one artifact.

**final result: passed**

**Small-Frame and Breakpoint Sweep - 2026-07-15**

Scope:
- Follow-up sweep after the mobile-gallery fix, looking for the same failure classes on every page at 390px, 768px, and dark mobile: duplicated content, sections collapsing without separation, and light artwork vanishing in small frames.

Findings and fixes:
- Projects (all widths): the previous Project-ledger fix set the `hidden` attribute, but the author rule `.projects-ledger-list { display: grid }` overrides the UA default for `[hidden]`, so the duplicate section was still visible everywhere — the earlier verification checked the DOM property instead of computed display. Added `.projects-ledger-list[hidden] { display: none; }`; verified `display: none` at 1440/768/390.
- Gallery tablet (641-1040px): the Personal Data Lab strip rendered as a broken half-collapsed grid ("Haba Snow Mountain" orphaned on its own row) while still duplicating the cards above. The hide (strip + section-index anchor) now applies at ≤1040px instead of ≤640px; the wide-board desktop treatment is unchanged at ≥1041px (boundary verified). Removed the now-dead ≤600px strip-collapse rules.
- Home mobile: the Current Index thumbnail for "Personal Information Systems in the AI Era" used the light architecture diagram, which washes out to a near-white block at 5.8rem — same class as the gallery system-map issue. Swapped to the talk's existing dark network artwork (`gallery-hero-network-v2.webp`, already the gallery hero for the same item) in `data/home_surface.json` and the static markup, with updated alt text.

Checked clean:
- Home/Projects/Essays/Series/Tags/About/article pages at 390px, Home/Projects at 768px, Home/Gallery dark mobile: no duplication, no overflow, all images legible.

Verification:
- Full suite green; breakpoint boundaries and ledger visibility verified in the browser at 1440/1041/1040/768/390.

**final result: passed**

**Gallery Duplicate-Entry Removal - 2026-07-15**

Scope:
- Owner decision: entries already shown at the top of a page must not repeat below. Applied to the two remaining Gallery duplications.

Changes:
- Removed the `ai-personal-information-system` manifest item (gallery-only): its card linked to the same destination as the hero talk card (`gallery/talks/pkm-2026-06-07/index.html`) under a near-identical name. The board is now five cards, all distinct artifacts with distinct destinations.
- Removed the Personal Data Lab strip entirely (markup, section-index anchor, i18n keys, and its CSS blocks): on every width it only repeated cards shown directly above. This supersedes the earlier mobile/tablet hide.
- Rebalanced the desktop mosaic for five cards: the Sleep Toolkit tool card now spans the full second row beside the hero.
- Cleaned the orphaned `gallery-card--system-map` CSS. One cleanup regression was caught and fixed during verification: removing a selector that terminated shared multi-selector rules left dangling selector lists that swallowed the following rule (card titles disappeared); the shared rules were restored with the dead selector stripped.

Verified:
- Desktop 1440 light/dark: five-card board with no hole, all titles present, research artwork panel intact in dark mode.
- Mobile 390: five distinct cards, uppercase type labels, no duplicates, no overflow.
- Full check suite green; manifest and gallery data validated.

**final result: passed**

**Essays / Series / Index Consolidation - 2026-07-24**

**Comparison target**
- Source visual truth: `/Users/simoncbot/.codex/generated_images/019f8fd3-2bf6-7472-9b4c-b1369e38f92e/call_GMQ6Fbqq7yaBbEcbopM0dfpx.png`
- Browser-rendered implementation: `/private/tmp/simoncos-essays-hub-implementation-pass4-viewport.png`
- Full-view comparison: `/private/tmp/simoncos-essays-hub-comparison-pass4.png`
- Route and state: `http://127.0.0.1:5204/blogs.html?lang=en`, dark theme, English, previews off.
- CSS viewport: 1440 x 1024 at device density 1.
- Source pixels: 1487 x 1058. Implementation pixels: 1440 x 1024.
- Density normalization: source and implementation were both normalized to 1440 x 1024 before horizontal side-by-side comparison.

**Findings**
- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the existing site serif/sans pairing, weights, hierarchy, line lengths, and title wrapping follow the source. The implementation uses production text rather than rasterized mock text; the remaining antialiasing difference is expected.
- Spacing and layout rhythm: the hero, three-view index, 70/30 archive-discovery split, month ledger, and right-rail rules align with the source proportions. The final desktop frame keeps all primary content readable without horizontal overflow.
- Colors and visual tokens: the existing dark editorial background, cream display text, muted copy, cyan accent, and fine rules match the selected design and retain the site's established tokens.
- Image quality and asset fidelity: the selected design contains no raster imagery, illustration, logo treatment, or non-standard icon asset that required generation or replacement.
- Copy and content: the archive, one reading path, six topic rows, counts, RSS action, and bilingual labels use real project data and match the design's information architecture.
- Focused-region review: separate inspection of the hero/view index and the reading-path/topic rail was sufficient because the full-view comparison preserves readable text at 1440 x 1024. No additional crop exposed a new mismatch.

**Comparison history**
- Pass 1 evidence: `/private/tmp/simoncos-essays-hub-comparison-pass3.png`.
  - [P2] The view index and archive began about 25-30 px lower than the source.
  - [P2] Full-height tab dividers read as boxed cells instead of short ledger separators.
  - [P2] The reading-path title wrapped, increasing rail height and pushing Topics below the source rhythm.
- Fixes:
  - Tightened the view-index and desktop archive offsets.
  - Replaced full-height tab borders with centered 1.25rem separators.
  - Adjusted the reading-path display size so the real series title stays on one line at the reference viewport.
  - Allowed preview-off article titles to use the fourth grid track vacated by the hidden read-more action.
- Post-fix evidence: `/private/tmp/simoncos-essays-hub-comparison-pass4.png`; all three P2 findings are resolved.

**Responsive and interaction evidence**
- Mobile Chinese viewport: 390 x 844, no horizontal overflow (`scrollWidth = 390`).
- Mobile overview screenshot: `/private/tmp/simoncos-essays-hub-mobile-zh-viewport.png`.
- Mobile discovery screenshot: `/private/tmp/simoncos-essays-hub-mobile-zh-rail2.png`.
- Topic filter: AI shows 3 posts in March; All topics restores 4 posts across 2 months and exposes the active `aria-current` state.
- Preview control: on shows 4 excerpts and 4 read-more actions; off hides all excerpts and restores the compact ledger.
- Language control: English-to-Chinese rerender localizes the hero, tabs, archive labels, reading path, topics, and RSS without overflow.
- Compatibility redirects: `series.html?lang=zh` resolves to `blogs.html?lang=zh#reading-paths`; `tags.html?lang=en#ai` resolves to `blogs.html?lang=en#topic-ai`.
- Browser console: no errors.

**Verification**
- `make check`: passed.
- `node --test tests/*.test.js`: 14 passed.
- Consolidation-specific Python tests: 12 passed.
- Full Python discovery still reports 6 pre-existing failures in unrelated Projects, Gallery, and Home contracts; this change introduces no additional failure.

**Follow-up Polish**
- None required for handoff.

**final result: passed**
