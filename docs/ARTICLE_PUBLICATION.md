# Article publication

Owner policy, confirmed 2026-09-28: **all articles must have Chinese and English versions before going live**. Chinese-only work may be generated locally for review, but must not be pushed to the GitHub Pages branch.

1. Prepare `blogs/<slug>.md` and `blogs/<slug>.en.md`. Preserve the author's approved text. Translation should not silently revise the argument or invent dates.
2. Set `date` as described under [Dates](#dates), then match `date`, `updated`, `tags`, `series` and `series_part` in both versions. Use the same canonical `series` key even when the display name is translated. Translate the H1, description, body, image alt text and any reader-facing notes. Keep images shared in `blogs/assets/images/<slug>/`.
3. Prefer matching-language internal article links (`other-slug.en.html` in English, `other-slug.html` in Chinese). Keep external citations and attribution. Check poetry and quoted work separately for a faithful translation and preserved credit.
4. `make generate` writes all article pages, indexes, RSS and derived section pages. Add both article URLs to `sitemap.xml`; keep `data/site_shell.json` `site_updated` current. Do not edit generated HTML by hand.
5. Run `make check-all` and `git diff --check`. `scripts/check_site.py` rejects an article group missing either language; its existing file checks also verify that the declared source and generated page exist. This is a structural gate, not evidence of translation quality.
6. Review both versions in a browser, including Chinese mobile layout, images, series order, internal links and translation toggles. Only then commit and publish within the authorized scope; verify the deployed revision and pages separately.

## Dates

Owner policy, confirmed 2026-09-28 and simplified 2026-09-30: **an article has one date, `date`, and it is when the piece was written.** An older piece republished on this site keeps its historical date, never the day it was added here. `date` sets the article's place in every list, the RSS `pubDate` and the page's "Created" row.

- A piece written over several sittings takes the day it was finished. 我的哈巴雪山之旅 was mostly written on 2025-10-02 and finished on 2026-01-20, the dateline at its end, so its `date` is 2026-01-20.
- For an older piece, use the author's full dateline in the text. Without one, use the first-publication date on the original platform as the closest record of when it was written, as a China-time calendar day. Jianshu's page data has `first_shared_at`, and its author archive at `https://www.jianshu.com/u/fryvGp` lists every post with its share time. Douban and Zhihu show dates on the page.
- A repost that adds a new introduction to an old text takes the old text's date. The introduction already carries its own dateline in the body (the 旧忆 collection, owner's call 2026-09-30).
- If the dateline gives only a month, use the first-publication day when it falls in that month (回溯: 2017.02, first published 2017-02-27), or a day the text itself implies (又一天凉好个秋 says the Mid-Autumn Festival is tomorrow: 2012-09-29). Otherwise use the 1st of that month (owner's call, 2026-09-30); 我的手 (2012.12) is dated 2012-12-01.
- If only a year is known, or nothing at all, ask the author. Do not substitute the day the article was added.
- There is no second date field. `written` was retired on 2026-09-30: its "Written 2025-10-02" row on 我的哈巴雪山之旅 misled readers about when the piece was done, and one date is simpler to read. A dateline the reader should see stays in the body as the author wrote it, such as the "2012.12" under 我的手.
- `updated` is the day of the site revision (link fixes, localized images, a new translation). Its "Updated" row already tells readers the page changed recently, so do not add a "收录于" or "added to this site" footer.
- Obsidian vault files carry no dates. Their mtimes and commits date from the 2026 migration, so do not use them.
- RSS readers may still show a republished piece as new. The owner accepts that.

`scripts/check_site.py` rejects a missing or malformed `date`, and any `written` field. It cannot tell whether a well-formed date is the historical one, so check the source.

Pages publishes through `.github/workflows/site-check.yml` (since 2026-09-29): on a push to `master`, the `deploy` job runs only after `make check-all` passes, so a failed check leaves the last good version live. Run the checks locally anyway, since a failed push holds back everything behind it. See the [2026-09-28 QA report](qa/2026-09-28-redesign-and-article-publication.md).
