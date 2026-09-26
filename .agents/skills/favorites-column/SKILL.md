---
name: favorites-column
description: Build or change the Favorites column (中文名「收藏」): every five-star book, film, album and game from Che's Douban marks, with the Douban date and the short review verbatim. Use when working on its pages, data extraction, grouping or display rules, its design canvas and generator, or the essays it links to. Also use before reading anything from douban.com.
---

# Favorites Column

The column lists every work Che rated five stars on Douban in four categories (书、影、音、游), newest mark first. Product rules are Che's. This skill records how to apply them and what went wrong while designing the column.

## Sources Of Truth

- Rules, decisions, counts and data findings live in the proposal in the Obsidian vault: `RedPiggy/Projects/Site/个人网站 Favorites 栏目 Proposal - 2026-09-22.md`. Read its numbered decisions and its 「设计阶段的数据发现」 before changing anything. Keep numbers there. Do not copy them into site files or this skill.
- Marks and reviews come from `Knowledge/Douban-Wiki/_dashboard/data/douban_latest.json` in the vault. It is a one-off export, and there is no sync pipeline.
- Book metadata comes from `RedPiggy/Projects/Reading/wiki/books/`, not Douban-Wiki, which retired its book pages.
- The mockups are on the Design canvas linked from the proposal. Its generator is `~/.claude-scratch/favorites-design/`: `gen.py` execs `rowc.py`. Row C is the current direction; row A is superseded.
- Nothing goes to the site until Che confirms the design.

## First Release Scope

- Chinese only. The English nav still lists it as Favorites and opens the Chinese pages (Che's call, 2026-09-26: the site defaults to English, so hiding it there hid the column).
- No handwritten "why" line.
- No covers: text-only layout.
- The proposal's decisions list is the record; this list only summarizes it.

## Data Rules That Are Easy To Get Wrong

- Count and list works, not marks.
  - Merge TV seasons by title (`第N季`, `最终季`, `Season N`).
  - Merge repeat marks of one title as 版本一 / 版本二.
  - Title merging misfires, so keep an exception table. `攻壳机动队` is the 1995 film, not season one of SAC.
  - A work sorts on its most recent mark.
- Include only 我的评分 = 5 in book, movie, music and game. Theater stays out. No manual additions or removals, and no review-length threshold.
- Order is marking time only.
  - The 全部 / 有短评 / 没有短评 filter never reorders.
  - Page counts are recomputed per filter, at 20 per page.
- Marking time is when Che marked the work on Douban, not when they read, watched or played it. Backfill days fill whole pages with one date, so show a date only when it changes.
- Reviews are verbatim. Some stop mid-sentence at Douban's 140 or 350 character cap. Show them as they are, and never add an ellipsis.
- Games show the year only, with no developer.
- Music artists go through the cleanup table in the proposal; `ARTIST_FIX` in `rowc.py` mirrors it.
  - One spelling per artist.
  - Chinese artists in simplified Chinese, Japanese artists in Japanese.
  - Role words are dropped, and several artists are split by " / ".
- Expanded seasons or versions read in season order, not marking order.
- The years in books' `简介` are edition years, not first publication.

## Build Pipeline

- `scripts/extract_favorites.py --vault <vault root>` (or `OBSIDIAN_VAULT`) reads the vault and writes `data/favorites.json`. It needs the local vault, so it is run by hand after a new export and never in `make check`.
- `scripts/update_favorites_pages.py` renders `favorites.html` and `favorites/{books,film,music,games}.html` from that file. `make check` runs it with `--check`. It borrows the head and footer blocks from `update_site_shell.py`, and the pages are also listed in `data/site_shell.json`, so the two scripts must keep emitting the same blocks.
- `src/ts/load-favorites.ts` pages, filters and folds in the browser. Every work is in the HTML; without JavaScript a noscript style shows them all, with every season open.
- Game titles are "中文名 原名". An original with no CJK is split at the first space that allows it; a Japanese or traditional-Chinese original is split where the halves share the most characters. Book authors lose nationality markers and bracketed original names; `AUTHOR_FIX` holds the cases the rule gets wrong.

## Traps Found While Building

- `i18n.ts` overwrites the text of every element with a `data-date` attribute with a formatted date. Rows carry `data-marked`, and a test guards it.
- The noscript rule that reveals rows 21 onward must be at least as specific as the rule that hides them, or pages without JavaScript silently stop at 20.
- From a worktree, `preview_start` serves the main checkout's launch config, not the worktree. Serve the worktree with its own static server and open that URL.
- The essay link shares the index CTA style, which tracks letters apart and uppercases. An essay title needs both turned off, or "——" splits and "Exformation" becomes "EXFORMATION".
- The first single-language article exposed a duplicated title on the home page: `update_static_fallbacks.py` listed the article's own title again as its "other language" title. It now drops a repeated title, as `load-recent-posts.ts` already did.

## Essays Linked From Items

- An item links to an essay only after the essay is published on the site as an article. The proposal's data findings table lists the qualifying essays and their original dates.
- To link one, map the work's Douban link to the article's path in `ESSAYS` in `scripts/update_favorites_pages.py` and regenerate. The link text is the article's H1, read from its Markdown, so the title lives in one place. Title marks inside it are nested as 〈〉 within the link's 《》.
- The link shows only on rows with a short review. A work without one renders as a compact row, which has no room for it.
- Essays are Chinese first, with an English translation beside each (`<slug>.en.md`, `translation:` names the model; Che asked for them 2026-09-26). Tags follow the work's type: `book`, `movie`, `music`, `game` (Che's choice). The work's Douban link goes on the last line (`豆瓣：[作品](链接)`), so the Essays list excerpt starts with the essay itself.
- Each new article also needs a `sitemap.xml` entry; `make check` fails without one.
- Set frontmatter `date` to the original Douban publication date. Without `date`, `generate_blog_pages.py` falls back to the file's mtime, and an old essay looks as if it was published today.
- Do not take dates from the vault files. They have no frontmatter, and their creation and commit times date from the 2026 migration.
- RSS readers may still show a newly uploaded old essay as new. Che accepts that.

## Reading douban.com

- Review pages send non-browser requests to `sec.douban.com`. Do not try to get past that check.
- What works without it:
  - list pages such as `book.douban.com/people/simoncos/reviews?start=N`, 5 per page;
  - the reviews RSS feed, `www.douban.com/feed/people/simoncos/reviews`: the latest 10 reviews, with pubDate;
  - some review pages, which do load directly.
- The in-app browser pane was refused for douban.com.
- No local data holds covers. A later Douban crawl would conflict with the proposal's non-goal of building no crawler, and with the check above. Raise both with Che before starting one.

## Checking Mockups Locally

- Board heights come from measurement, not estimates.
  1. `measure/make.py` strips `support.js` and adds a height probe.
  2. Run headless Chrome with `--dump-dom`, wrapped in `perl -e 'alarm 55; exec @ARGV'`, and pass `--use-mock-keychain --password-store=basic`.
  3. Read the natural height and set the board to that plus about 20px.
- Before publishing to the canvas, re-read the live index and merge only the keys you changed.
