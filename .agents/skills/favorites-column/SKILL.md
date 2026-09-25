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

- Chinese only, and the English nav gets no entry.
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

## Essays Linked From Items

- An item links to an essay only after the essay is published on the site as an article. The proposal's data findings table lists the qualifying essays and their original dates.
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
