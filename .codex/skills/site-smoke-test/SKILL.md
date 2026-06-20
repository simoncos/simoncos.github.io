---
name: site-smoke-test
description: Verify `simoncos.github.io` and related project-preview deployments after publishing, frontend edits, homepage/Gallery/Projects/About IA changes, AI-readable entrypoint changes, or slide-deck updates. Use when Codex needs a structured PASS/FAIL smoke test with live URL evidence, browser checks, asset checks, RSS checks, generated-data checks, and deploy-freshness diagnostics. Not for designing the UI; use `frontend-design` first when the task is visual design.
---

# Site Smoke Test

Prove the live site or preview still works after a change. Prefer programmatic checks for reachability and DOM state, then screenshots only when visual layout matters.

## Targets

- Main site: `https://simoncos.github.io`
- Project previews: `https://simoncos-project-previews.vercel.app/<slug>/`
- Feeds: `/feed.zh.xml` and `/feed.en.xml`

## Main Site Checklist

Run relevant checks and report PASS/FAIL with evidence:

- Home loads and main navigation renders.
- About page is reachable.
- Blog archive loads.
- Latest post opens and renders.
- Gallery and Projects pages are checked when either IA or JSON changed.
- Homepage live surface renders when `data/home_surface.json` or homepage copy changed.
- `llms.txt` and `agent-index.json` return HTTP 200 when AI/agent-readable orientation changed.
- Dark mode and language toggles work.
- Both RSS feeds return HTTP 200.
- Key assets referenced by changed pages return HTTP 200.

For Gallery/Projects changes, also verify backing JSON files:

- `/data/gallery_data.json`
- `/data/projects_data.json`
- `/data/home_surface.json` when homepage live surface changed

Confirm the semantic split when relevant: Gallery is for talks, demos, visual essays, research artifacts, and curated paths; Projects is for maintained tools and deployed systems.

For copy or IA changes, check at least one Chinese mobile viewport. Large Chinese headings and navigation labels can pass source checks while wrapping poorly.

## Slide Deck Checks

For HTML deck visual edits, grep checks are not enough. Render or capture touched slides at presentation resolution and inspect:

- no clipped text
- no overlapping controls or footer notes
- QR codes and contact elements are readable
- card grids preserve one visual per card
- live deck and canonical source have intended slide count and asset references
- appendix/contact order is correct when changed

Use `references/slide-deck-verification.md` for the detailed screenshot workflow.

## Project Preview Checks

For `project-previews`:

- Verify the live subpath returns the expected page, not just the Vercel root.
- Check key JS/CSS/JSON assets return 200.
- Check live HTML contains expected markers from the current source.
- For data-backed dashboards, verify primary JSON freshness metadata.
- If the live page is stale after push, run the deploy path from `frontend-preview-dev`.

Use `references/project-previews.md` and `references/dashboard-data-loading.md` when those surfaces are involved.

## Reporting Format

Use this shape:

```text
- PASS | Home | evidence: main nav and title rendered
- FAIL | RSS zh | evidence: /feed.zh.xml returned 404

Overall: pass/fail
Root cause guess:
Residual risk:
```

State whether each failure looks like deploy drift, content issue, asset issue, or frontend regression.

## References

- `references/slide-deck-verification.md`: deck screenshot and layout checks.
- `references/project-previews.md`: Vercel preview verification.
- `references/dashboard-data-loading.md`: data-heavy dashboard checks.
