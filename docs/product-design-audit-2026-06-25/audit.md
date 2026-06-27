# Product Design Audit - Site Redesign

Date: 2026-06-25
Target: local `simoncos.github.io` branch at `http://127.0.0.1:8000/`
Capture tool: Codex in-app Browser
Destination: local folder

## Audit Scope

This audit covers the current personal-site redesign surfaces that matter most for first-time orientation and content discovery:

- Home desktop, English
- Home mobile, Chinese
- Gallery desktop, English
- Gallery mobile, Chinese
- Projects desktop, English
- About desktop, English

The audit is based only on screenshots and browser signals captured in this run. It does not claim full accessibility compliance.

## Captured Steps

1. Home desktop, English
   - Screenshot: `screenshots/01-home-desktop-en.png`
   - Health: strong visual identity and clear major sections; accessibility naming issue in the hero heading needs attention.

2. Home mobile, Chinese
   - Screenshot: `screenshots/02-home-mobile-zh.png`
   - Health: functional and no horizontal overflow, but the featured-path cards collapse into unreadably narrow columns.

3. Gallery desktop, English
   - Screenshot: `screenshots/03-gallery-desktop-en.png`
   - Health: strongest current surface; hierarchy, imagery, and Personal Data Lab framing work well.

4. Gallery mobile, Chinese
   - Screenshot: `screenshots/04-gallery-mobile-zh.png`
   - Health: good responsive behavior; mixed English taxonomy labels should be treated as a deliberate product-language decision.

5. Projects desktop, English
   - Screenshot: `screenshots/05-projects-desktop-en.png`
   - Health: clear and coherent, but the primary action to open the live tool is too quiet for a one-project page.

6. About desktop, English
   - Screenshot: `screenshots/06-about-desktop-en.png`
   - Health: clear profile/contact surface; strong supporting page for the site identity.

## Strengths

- The dark visual language is coherent across Home, Gallery, Projects, and About.
- Gallery has the clearest content model. It uses images, cards, metrics, and the Personal Data Lab section to explain why artifacts belong together.
- Projects explains the project as a system, not only as a link dump. Input, output, connected artifacts, and next question all support the site's "inspectable work" position.
- About does its job quickly: identity, location, work modes, contact, and operating principles are all present without requiring extra navigation.
- Browser capture found no horizontal overflow in the tested desktop and 390px mobile states.
- Browser logs returned no captured warnings or errors during the tested page loads.

## UX Risks

1. Home mobile featured-path cards are not readable.
   - Evidence: Step 2, `02-home-mobile-zh.png`
   - The four featured cards stay in four columns at 390px, so titles and body copy break into tiny vertical fragments.
   - This is the highest-priority redesign fix because it affects the main "four ways into the work" entry point.

2. Home mobile spends too much first-screen space on repeated site chrome.
   - Evidence: Step 2, `02-home-mobile-zh.png`
   - The large `simonc site` header plus nav appears before the actual start-here hero. On a phone, the useful site explanation arrives late.
   - The page still works, but the first impression is heavier than the content requires.

3. Home desktop hero heading has a likely accessible-name join.
   - Evidence: Step 1 metadata recorded the H2 text as `Tools and researchEssays and field notes`.
   - Visually the two-line composition reads well, but assistive tech and text extraction may read the two spans without a pause.

4. Projects underplays the live project action.
   - Evidence: Step 5, `05-projects-desktop-en.png`
   - The page says there is one maintained public project, but the app link appears as a secondary card rather than the main action.
   - For a single-project page, users should be able to identify "open the tool" immediately.

5. The site risks becoming visually uniform.
   - Evidence: Steps 1, 3, 5, and 6
   - The dark navy/cyan system is consistent, but repeated cards and panels can make different content types feel more similar than they are.
   - Gallery avoids this best because real images interrupt the panel rhythm.

## Accessibility Risks

1. Mobile card text reflow likely fails practical readability even without horizontal overflow.
   - Evidence: Step 2
   - The layout technically fits the viewport, but the reading experience is poor and tap targets are narrow.

2. Hero heading text may be read without a separator.
   - Evidence: Step 1 metadata
   - The fix can be small: add a real whitespace separator, an `aria-label`, or markup that preserves an accessible pause while keeping the visual line break.

3. English taxonomy labels in Chinese mode need a clear policy.
   - Evidence: Step 4
   - Labels such as `Personal Data Lab`, `VISUAL ESSAY`, `TOOL`, and `FIELD NOTE` remain English. This may be intentional brand vocabulary, but it should be consistent and not accidental.

4. Screenshot-only audit cannot confirm keyboard focus order, focus visibility during interaction, screen-reader output, or zoom behavior.
   - Evidence limit: these require interaction testing beyond static screenshot review.

## Opportunity Areas

1. Make Home mobile the first implementation target.
   - Convert featured-path cards to a single-column or two-up mobile layout.
   - Preserve the desktop four-card rhythm.
   - Keep card labels, title, and description readable at 390px.

2. Compact the Home mobile header.
   - Reduce vertical brand chrome on mobile Home.
   - Consider keeping the site title, nav, language, and theme controls tighter before the hero.

3. Give Projects one clear primary action.
   - Add a stronger "Open Sleep Toolkit" action near the project title or overview.
   - Keep the visual essay link as a secondary companion artifact.

4. Use more artifact-specific media outside Gallery.
   - Home and Projects could borrow small real previews from Gallery or project assets to reduce panel sameness.
   - This should be done selectively so the site remains quiet and content-led.

5. Treat Chinese/English taxonomy as a design system decision.
   - Decide which labels are product names, which are taxonomy terms, and which should localize.
   - Apply that rule consistently across Home, Gallery, Projects, and About.

## Recommended Next Changes

1. Fix Home mobile featured-path layout.
2. Fix the Home hero heading accessible text join.
3. Strengthen the Projects primary action.
4. Run a focused keyboard/focus smoke test for nav, language switch, theme toggle, and primary content links.
5. Use Product Design ideation only after these structural issues are addressed, so visual exploration starts from a healthier baseline.

## Evidence Limits

- Tested local branch only, not the deployed public URL.
- Tested screenshots at 1280x720 desktop and 390x844 mobile only.
- Did not test keyboard-only navigation, screen-reader output, reduced motion, browser zoom, or live link targets.
- Did not inspect every article/project detail page.
