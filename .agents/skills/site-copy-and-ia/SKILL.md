---
name: site-copy-and-ia
description: Review and edit public copy, bilingual labels, navigation IA, page framing, and curated paths on `simoncos.github.io`. Use when changing Index/Articles/Work/Favorites/About wording, nav labels, reader-facing section titles, Chinese typography-sensitive headlines, or the semantic split between Work, Projects, Articles, Series, Favorites, About, and AI-readable entrypoints.
---

# Site Copy And IA

Use this skill to keep the personal site reader-facing, broad enough, and semantically coherent.

## Core Rules

- Keep the motto `Connecting the dots.` on About and in AI-readable orientation files. Do not remove it.
- The nav is Index, Articles, Work, Favorites, About (首页、文章、作品、收藏、关于), from the 2026-09 v3 redesign. The URLs stay `index.html`, `blogs.html`, `gallery.html`, `favorites.html`, `about.html`; do not rename files to match labels.
- Keep the person broader than a KM or AI-agent identity. The site can include software, AI, data, research, systems, essays, health/body data, field notes, and tools.
- Write public page copy for readers, not for designers or site maintainers.
- Avoid meta framing such as `surface`, `operator`, `fixed identity`, `portfolio category`, `public edge`, or explaining that a page is dynamic unless the reader benefits directly.
- Prefer concrete reader value: what can be opened, read, used, compared, or followed.

## IA Semantics

- Index: Selected work, the newest articles with a topic filter, and a short changelog. It should help readers choose a path, not explain implementation.
- Articles: long-form writing, with a list view (search, topics) and a series view (structured reading arcs).
- Work: one view per type — Projects, Talks, Research, Visual essays (`work_topics` in `data/site.json`).
- Projects: maintained tools and deployed systems; each opens as its own board or site. `projects.html` lists them all.
- Favorites: every five-star Douban mark in four categories; see the `favorites-column` skill.
- About: a short profile, the motto, and contacts.

When a new idea is a theme or route through existing work, prefer a related link inside a Work type before creating a new page. When it becomes a maintained tool or deployed system, consider Projects.

## Bilingual Copy

- Section pages carry both languages in the HTML (`<span data-l="en">` / `<span data-l="zh" lang="zh-Hans">`). Edit the source — `data/site.json`, `scripts/site_shell.py` or the generator — never the generated page.
- Keep Chinese lines natural. Avoid long colon titles in hero-scale text.
- For large Chinese hero headings, control line breaks explicitly when needed. Do not rely on browser auto-wrapping if it creates orphan characters or ugly breaks.
- Check Chinese mobile rendering after edits. A copy change can be a layout change.
- Keep English concise and concrete. Avoid generic phrases that could describe any personal site.

## Page-Specific Notes

- About should preserve breadth: builder across software, AI, data, research, systems, and lived field notes.
- A theme across work types (Sleep Toolkit, the sleep visual essay, field notes, future body-data work) belongs in a Work type's related links, not in duplicate Projects entries.
- AI-readable files should be orientation aids, not authorization, licensing, or training-control statements.

## Review Checklist

Before finalizing copy/IA edits:

- Search for stale labels or old framing across `data/site.json`, generators, generated HTML, TS, `llms.txt`, and `agent-index.json`.
- Verify navigation labels match user preference.
- Verify public copy avoids maintainer-only language.
- Verify Chinese mobile screenshots for large headings and buttons.
- State any remaining copy that is deliberately provisional.
