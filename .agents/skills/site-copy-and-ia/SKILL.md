---
name: site-copy-and-ia
description: Review and edit public copy, bilingual labels, navigation IA, page framing, and curated paths on `simoncos.github.io`. Use when changing homepage/About/Gallery/Projects wording, nav labels, reader-facing section titles, Chinese typography-sensitive headlines, or the semantic split between Gallery, Projects, Essays, Series, Index, About, and AI-readable entrypoints.
---

# Site Copy And IA

Use this skill to keep the personal site reader-facing, broad enough, and semantically coherent.

## Core Rules

- Keep the motto `Connecting the dots.` on About and in AI-readable orientation files. Do not remove it.
- Prefer `Gallery` as the public navigation label. Do not rename it back to `Artifacts` unless the user explicitly asks.
- Keep the person broader than a KM or AI-agent identity. The site can include software, AI, data, research, systems, essays, health/body data, field notes, and tools.
- Write public page copy for readers, not for designers or site maintainers.
- Avoid meta framing such as `surface`, `operator`, `fixed identity`, `portfolio category`, `public edge`, or explaining that a page is dynamic unless the reader benefits directly.
- Prefer concrete reader value: what can be opened, read, used, compared, or followed.

## IA Semantics

- Home: current entry point and connective map. It should help readers choose a path, not explain implementation.
- Gallery: talks, demos, visual essays, research artifacts, and curated paths such as Personal Data Lab.
- Projects: maintained tools, deployed systems, inputs, outputs, related artifacts, and next questions.
- Essays: long-form writing archive.
- Series: structured reading arcs.
- Index: topic lookup.
- About: profile, motto, working modes, contact, operating principles.

When a new idea is a theme or route through existing work, prefer a Gallery curation section before creating a new page. When it becomes a maintained tool or deployed system, consider Projects.

## Bilingual Copy

- Update both English and Chinese in `src/ts/i18n.ts`, plus visible HTML fallback text.
- Keep Chinese lines natural. Avoid long colon titles in hero-scale text.
- For large Chinese hero headings, control line breaks explicitly when needed. Do not rely on browser auto-wrapping if it creates orphan characters or ugly breaks.
- Check Chinese mobile rendering after edits. A copy change can be a layout change.
- Keep English concise and concrete. Avoid generic phrases that could describe any personal site.

## Page-Specific Notes

- About should preserve breadth: builder across software, AI, data, research, systems, and lived field notes.
- The four modes can remain Build, Research, Systems, Field unless the user changes the frame.
- Personal Data Lab is a good Gallery curation idea. It can connect Sleep Toolkit, sleep visual essay, field notes, and future body-data work without making those items duplicate Projects cards.
- AI-readable files should be orientation aids, not authorization, licensing, or training-control statements.

## Review Checklist

Before finalizing copy/IA edits:

- Search for stale labels or old framing across HTML, TS, compiled JS after build, `llms.txt`, and `agent-index.json`.
- Verify navigation labels match user preference.
- Verify public copy avoids maintainer-only language.
- Verify Chinese mobile screenshots for large headings and buttons.
- State any remaining copy that is deliberately provisional.
