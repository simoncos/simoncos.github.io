---
name: simoncos-site-smoke-test
description: Verify the simoncos.github.io site after publishing, frontend edits, homepage/Gallery/Projects/About IA changes, AI-readable entrypoint changes, feed changes, or slide-deck updates. Use when an agent needs structured PASS/FAIL evidence for live URLs, browser behavior, assets, feeds, generated data, and deployment freshness in this repository. Project-previews index releases belong to that repo's project-previews-index-release skill.
---

# Simoncos Site Smoke Test

Prove the live site or preview still works after a change. Prefer programmatic checks for reachability and DOM state, then screenshots only when visual layout matters.

## Targets

- Main site: `https://simoncos.github.io`
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

## Scope Boundary

This skill verifies the main site and site-owned talk artifacts. For the
`project-previews` launchpad, use that repository's
`project-previews-index-release` skill. For a separately deployed product,
follow the owning project's release skill and verify its stable URL there.

Verification is read-only by default. Editing, committing, pushing, deploying,
tagging, or changing GitHub Pages configuration are separate operations and
require task authorization; a failed smoke test does not authorize remediation.

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
