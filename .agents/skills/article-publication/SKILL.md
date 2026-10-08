---
name: article-publication
description: Publish or revise articles on simoncos.github.io. Covers new pieces, batches of older essays republished from Obsidian, Jianshu or Douban, English translations, and changes to a published article's title, date or text. Use when adding `blogs/<slug>.md`, dating an old essay, localizing article images, integrating essay batches prepared in parallel worktrees, or deploying article changes. The owner's rules live in docs/ARTICLE_PUBLICATION.md; this skill is the procedure and the traps.
---

# Article Publication

Every article goes live in Chinese and English, dated by when it was written. Che (the owner; use they/them) makes content decisions; the agent checks, lists and asks.

## Sources Of Truth

- **Policy**: `docs/ARTICLE_PUBLICATION.md`. It covers the bilingual gate, Dates, Editing the text, Privacy and Translation. Read it whole before each batch, and do not restate its rules in commits, records or skills; point at it.
- **Pages and generators**: `docs/ARCHITECTURE.md`.
- **Precedent**: the newest `qa/*-older-essays.md` or `*-old-memories.md` record in the owner's private notes repo. Mirror its structure (see `references/qa-record.md`). Since 2026-10-08 QA records are not kept in this public repo; if the notes repo is not available, ask for it.
- **Originals**: the Obsidian vault at `/Users/simoncbot/Documents/obsidian/simoncos/`, under `Write/Blog/{思-Meta,技-Hack,探-Explore,游-Wander,存档-Archive}/`.
  - Read only; never modify the originals.
  - Find a piece by title with `find` or `mdfind`. Reading files directly is fine when the Obsidian MCP times out.
- **Catalogue**, under `RedPiggy/Projects/Site/`:
  - `历史文章目录 - 2026-09-27.md` has a 简书首发 column matched against the Jianshu archive. A `—` there only means "not on Jianshu"; look on Douban or Zhihu, or ask.
  - `历史文章选稿建议 - 2026-09-27.md` holds editorial suggestions, none of them approved.
- **Date evidence**:
  - `scripts/jianshu_dates.py` reads the Jianshu archive and article pages.
  - The Douban notes feed is `https://www.douban.com/feed/people/simoncos/notes`; each item has a GMT `pubDate`.
  - Douban review pages redirect bots to `sec.douban.com`. Never try to get past that check.
  - Vault file dates come from the 2026 migration and are useless as evidence.

## One Batch, Step By Step

1. **Start clean.** Branch or worktree from `origin/master`. Run `git status --short` first, and leave other agents' uncommitted files alone.
2. **Create the Chinese file.** For each piece, write `blogs/<slug>.md`.
   - The slug is short English kebab-case. A collection shares a prefix (`old-memories-*`) and a series shares a stem (`problem-solving-and-design-1-situation`). The slug is the URL, so it never changes after launch.
   - Apply only typo fixes and mechanical cleanup (policy: Editing the text). Keep a list of every change for the record.
   - Frontmatter:

   ```yaml
   ---
   tags: life
   date: 2012-05-01
   updated: 2026-09-30
   description: One or two reader-facing sentences.
   ---
   ```

   - `tags` come from the existing set: life, thinking, design, hack, out, book, ai, km, movie, game, plus `music` for a Favorites album essay and `poetry` for Che's own verse (owner's call, 2026-10-01: 我的手 and 掩上的门 are 诗, not 生活). Any other new tag is the owner's call.
   - The tags decide the Index topic, through `article_topic` in `scripts/build_pages.py`:
     - any `out` → 身体与现场;
     - otherwise any `km`, `hack` or `design` → 造东西;
     - everything else → 思考.
   - A series adds `series` and `series_part`, using the same key in both languages. The display name lives in `data/site.json` `series`.
   - The H1 is the title everywhere: lists, feeds, prev/next, Favorites links. Put a platform line (`豆瓣：…`) last, so the list excerpt starts with the essay.
3. **Translate** into `blogs/<slug>.en.md`, with the same frontmatter plus `translation: Claude Opus 5.5`. Follow the policy's Translation section. Keep one glossary across the batch, and search before settling any name.
4. **Localize images** with `python3 scripts/localize_images.py <slug>` once both files exist; it rewrites both.
   - What it does:
     - resizes and compresses each image (`scripts/check_site.py` fails on any image over 1 MB);
     - strips EXIF;
     - turns GIFs into MP4 with a poster;
     - treats iPhone MPO files as stills.
   - Alt text in both languages: the original caption first, then `：` and a description. Replace file-name alts such as `IMG_…` and `WeChat Image…`.
   - A transparent PNG chart with dark lines disappears in dark mode. Flatten it onto white and keep the same file name.
   - Credit borrowed figures with their source and licence.
   - Pixelate contact details (policy: Privacy).
5. **Add both URLs to `sitemap.xml`**, with `lastmod` set to today. `make check` fails without them. Keep `data/site_shell.json` `site_updated` current.
6. **Regenerate and check**: run `make generate`, then `make check-all`, then `git diff --check`.
   - `make generate` also rewrites both feeds with a new `lastBuildDate`. Restore a feed only if the diff shows no other change.
   - Never `git checkout` generated files over someone else's work; regenerate instead.
7. **Load every new page in a browser**, both languages, at 390 and 1280 wide:

   ```bash
   python3 -m http.server 8048 --bind 127.0.0.1   # run in the background
   SLUGS=a,b DARK=1 perl -e 'alarm 150; exec @ARGV' node .claude/skills/article-publication/scripts/check_pages.cjs http://127.0.0.1:8048/
   ```

   - `DARK=1` adds a dark-mode pass for pages with charts.
   - Screenshot anything the checks cannot judge: tables, quote blocks, lyric line breaks, nested lists, charts in dark mode.
   - Stop the server afterwards.
8. **Check links** with `python3 .claude/skills/article-publication/scripts/check_links.py blogs/<slug>.md blogs/<slug>.en.md`. A 200 that lands on a home page or a login page is still dead.
9. **Record and commit.** Write the QA record (`references/qa-record.md`), then commit the sources, images, generated output, sitemap and record together.
10. **Report and ask.** Report in Chinese and ask the open decisions, each with a recommended option. Deploy only after the owner approves this change.

## Parallel Batches

- **One agent per batch**, each with `isolation: "worktree"`. Agents may commit on their own branch, but may not push, merge, touch the main checkout or write to the vault.
  - Give each agent its essay list, the policy doc, and the latest QA record to mirror.
  - Ask for a final report that names the decisions needed. Every number in it must also be in the committed record, because `/tmp` is wiped at reboot.
- **Preview.** `preview_start` from a worktree serves the main checkout. Serve the worktree itself with `python3 -m http.server <port> --bind 127.0.0.1 --directory <worktree>`.
- **Integrate on a fresh branch** from `origin/master`:
  1. Take the batch's sources with `git checkout <commit> -- blogs/<slug>*.md blogs/assets/images/<slug>/`. The batch's QA record goes to the private notes repo, not here.
  2. Bring in script changes with `git diff <base> <commit> -- <file> | git apply -3`.
  3. Rebuild `sitemap.xml` entries by script rather than merging conflicting hunks.
  4. Run `make generate` on the result. Generated HTML, JSON and feeds are never merged by hand.
  5. If master changed a template or generator meanwhile, every page a batch generated is stale until you regenerate. `git merge-tree` can trial a merge without touching any working tree.

## Changing A Published Article

- **Title**:
  1. Edit the H1 in both files and keep the slug.
  2. Search for the old title in other articles' link text (`blogs/*.md`), in `docs/` (examples in the policy doc), in the QA records in the private notes repo, `data/site.json`, `llms.txt` and `agent-index.json`.
  3. Regenerate, then search the generated HTML, feeds and `data/*.json` for leftovers.
  4. Rewrite any record sentence the change made false, and add a 用户决定 item.
  5. Feed GUIDs are URLs, so readers see a rename, not a new post.
- **Date**: change `date` only. It moves the article in every list, and changes its RSS `pubDate`, its Created row and its neighbours' prev/next links, so regenerate.
- **Text fix after launch**: change both languages in the same commit, and set `updated` to the day of the revision (policy: Dates).

## Generator Traps

These were found in the 2026-09 batches. Most are fixed, but they come back with new content.

- **Joined lines.** Markdown joins single line breaks, so verse, lyrics, datelines and tables of contents run together. Add `<br>`.
- **Accidental lists.** A paragraph starting `1.` becomes an ordered list that renumbers. Escape it as `1\.`, which happens mostly in English.
- **Doubled excerpts.** Loose lists wrap each item in `<p>`, and the list excerpt used to read each item twice. `build_post_excerpt` now skips `<li><p>` (c57c019).
- **Tables.** Pipe tables need the `tables` Markdown extension, which is enabled.
- **Contents list.** The contents list takes h2–h4, so an original's `####` headings appear in it.
- **Search.** Characters copied from a PDF may be CJK compatibility forms (U+F900–FAFF), which search cannot match. NFC-normalize them.
- **Dates.** `i18n.ts` rewrites the text of any element that has `data-date`.

## Deploy

- **A push to master publishes.**
  1. Check that the branch fast-forwards with `git merge-base --is-ancestor origin/master <branch>`.
  2. Push with `git push origin <branch>:master`, and only with the owner's approval for this change.
- **Watch the run.** `.github/workflows/site-check.yml` runs `check`, then `deploy`, and a failed check leaves the last good version live. Find the run with `gh run list --workflow site-check.yml --limit 1`, then run `gh run watch <id> --exit-status` in the background.
- **Verify live.** Point `check_pages.cjs` at `https://simoncos.github.io/`; it adds a cache-busting query, since Pages caches pages for up to 600 s. Report what was checked and the pass count.

## Shell Traps (zsh)

- `$c:a` is a zsh modifier, so `git show $c:about.html` breaks. Write `"${c}":about.html`.
- Quote globs in options: `--include='*.py'`, not `--include=*.py`.
- `echo =====` fails, because `=word` is expanded. Quote it.

## Related Skills

- `favorites-column`: essays linked from Favorites items (the `ESSAYS` map, link text from the H1, tags by work type).
- `site-surface-editing`: shell, CSS/JS versions and section pages.
- `simoncos-site-smoke-test`: a wider site check after a deploy.
