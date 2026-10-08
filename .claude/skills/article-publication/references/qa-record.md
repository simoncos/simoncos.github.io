# QA record for an article batch

Every batch leaves `qa/<YYYY-MM-DD>-<batch>.md` in the owner's private notes repo, in Chinese. Records hold privacy findings and unpublished decisions, so they never go into this public repo. It is the one place for the batch's numbers and the owner's decisions. Commit messages, chat reports and later docs point at it rather than repeating it. `/tmp` is wiped at every reboot, so write each number into the record while its source still exists.

Model a new record on the latest one. `qa/2026-09-30-seven-older-essays.md` is the fullest example. Leave out a section only when the batch has nothing for it.

## Sections, in order

1. **Title line and opening**: `# <N>篇旧文收录 · <date>`. State who asked for the batch, where the originals live, and that they were left unchanged. Name the translating model. Say when the batch went live, or that it has not yet.
2. **Articles and dates**: one table with the title, site path, `date` and its evidence. Evidence means the dateline in the text, or the platform, the post ID and the Beijing time. Put tags on one line below the table. Explain every date that needed judgement, such as a bulk move or a repost.
3. **用户决定**: numbered and dated. Record what the owner chose and what was adopted as recommended without asking, and say which is which. When the owner later reverses a decision, rewrite the item and every sentence that depended on it; do not add a note.
4. **Changes to the original**:
   - typos fixed, each quoted before and after;
   - mechanical cleanup (text unchanged);
   - credits added;
   - image treatment, such as a white background under a transparent chart.
5. **Left as written**: factual, argumentative, dated and mathematical problems, per article, with what was checked and against what source. The same text stands in both languages.
6. **Privacy and copyright**: a table of image, issue and severity (high = handle before going live, medium = owner should look, low = on record). Also:
   - public originals on R2 that still carry GPS;
   - image count, total bytes and the largest file.
7. **Quotation share**, only when a piece quotes heavily. Give the character count and method, and name each source.
8. **Translation**:
   - English titles;
   - how long quotes, lyrics and poems were handled;
   - notes added for English readers;
   - the glossary of terms kept consistent across the batch;
   - choices the owner may want to review.
9. **Links**: every distinct external link, with its status and whether the page title matches the link text. For each dead link, say whether a Wayback copy exists and whether its content could be seen.
10. **Tooling changes**: any generator or script fix the batch needed, with its test, and whether existing pages changed.
11. **Verification**:
    - the `make check-all` result and test count;
    - `git diff --check`;
    - sitemap URLs added and the new total;
    - the pages and widths loaded, with the pass count;
    - which screenshots were looked at;
    - for a batch built on an older master, the merge trial and the need to regenerate.
12. **Editorial suggestions not adopted**: suggestions from the vault notes, with nothing applied without approval.
13. **Found in passing**: problems outside the batch, and what was done about them.

## Report to the owner

The chat report is short and in Chinese. It covers:
- what went live, or what is waiting;
- the decisions needed, each with a recommended option first;
- anything published that the owner might object to, such as a date chosen by rule or a title rendering.

It links to the record for everything else. Ask the decisions with AskUserQuestion when there are several. Record the answers in 用户决定 before acting on them.
