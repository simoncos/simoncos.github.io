Scope:
Homepage route-journal layout on the local static site at `http://127.0.0.1:5199/index.html`.

Baseline:
The accepted concept was the Editorial Route Journal homepage direction, but the runtime implementation felt visually chaotic in review. The current QA baseline is therefore the pre-fix runtime capture plus the user feedback that the layout reads as too messy.

Evidence:
Pre-fix screenshots:
- `docs/product-design-audit-2026-06-25/visual-qa-2026-06-26/01-before-desktop.png`
- `docs/product-design-audit-2026-06-25/visual-qa-2026-06-26/01-before-tablet.png`
- `docs/product-design-audit-2026-06-25/visual-qa-2026-06-26/01-before-mobile.png`

Checks completed after the CSS tuning:
- `npm run check:ts`
- `git diff --check`
- `curl -I http://127.0.0.1:5199/index.html`

Decision updates:
- Targeted retry completed for layout order and density.
- Full visual acceptance is pending because after-fix Chrome screenshots were blocked by the current escalation usage limit.

Accepted:
- The pre-fix diagnosis is clear: the desktop hero mixed absolute-positioned feature cards, a heavy decorative route line, visible image cards, and a status card in the same first viewport.
- The mobile pre-fix screenshot showed title and featured-path text pressure near the viewport edge.
- The CSS now uses a bounded two-column feature grid on desktop and a single-column feature stack on mobile.
- Decorative route geometry has been reduced to a quieter background line instead of a foreground path.
- Card widths, image apertures, heading wrapping, and mobile grid reset rules have been tightened.

Needs runtime tuning:
- After-fix desktop, tablet, and mobile screenshots still need to be captured when Chrome rendering is available again.
- Manual review should check the first 1200px of the page at 1440px, 768px, and 390px viewport widths.

Targeted retry:
- Replaced the absolute-positioned route-node map with a stable grid.
- Standardized feature card media aspect ratio to 16:9.
- Reduced route texture opacity and clipped the hero to prevent background overflow.
- Reduced card shadow intensity and border radius so the route area reads as one system.
- Added mobile-only width, wrapping, and grid-column resets to prevent inherited desktop placement.

Rejected/superseded:
- The scattered desktop route-node placement is superseded.
- The heavy foreground curved path is superseded.

Next smallest useful step:
Re-capture after-fix desktop, tablet, and mobile screenshots once Chrome screenshot execution is available, then mark this QA round accepted or continue one more targeted CSS pass.
