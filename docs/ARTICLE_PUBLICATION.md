# Article publication

Owner policy, confirmed 2026-09-28: **all articles must have Chinese and English versions before going live**. Chinese-only work may be generated locally for review, but must not be pushed to the GitHub Pages branch.

1. Prepare `blogs/<slug>.md` and `blogs/<slug>.en.md`. Preserve the author's approved text. Translation should not silently revise the argument or invent dates.
2. Set `date` as described under [Dates](#dates), then match `date`, `updated`, `written`, `tags`, `series` and `series_part` in both versions. Use the same canonical `series` key even when the display name is translated. Translate the H1, description, body, image alt text and any reader-facing notes. Keep images shared in `blogs/assets/images/<slug>/`.
3. Prefer matching-language internal article links (`other-slug.en.html` in English, `other-slug.html` in Chinese). Keep external citations and attribution. Check poetry and quoted work separately for a faithful translation and preserved credit.
4. `make generate` writes all article pages, indexes, RSS and derived section pages. Add both article URLs to `sitemap.xml`; keep `data/site_shell.json` `site_updated` current. Do not edit generated HTML by hand.
5. Run `make check-all` and `git diff --check`. `scripts/check_site.py` rejects an article group missing either language; its existing file checks also verify that the declared source and generated page exist. This is a structural gate, not evidence of translation quality.
6. Review both versions in a browser, including Chinese mobile layout, images, series order, internal links and translation toggles. Only then commit and publish within the authorized scope; verify the deployed revision and pages separately.

## Dates

Owner policy, confirmed 2026-09-28: **an older piece republished on this site keeps its historical date.** `date` is the day it was first published, not the day it was added here. `date` sets the article's place in every list, the RSS `pubDate` and the page's "Created" row.

- Where the text has a full dateline written by the author, use it. Otherwise use the first-publication date on the original platform, as a China-time calendar day. Jianshu's page data has `first_shared_at`, and its author archive at `https://www.jianshu.com/u/fryvGp` lists every post with its share time. Douban and Zhihu show dates on the page.
- If only a month or a year is known, or nothing at all, ask the author. Do not substitute the day the article was added, and do not invent a day.
- `written` is only for a composition date earlier than `date`, as `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. For example, 我的手 was written in 2012-12 and first published on 2014-01-04. Leave it out when the two are the same, or when the date is unknown.
- `updated` is the day of the site revision (link fixes, localized images, a new translation). Its "Updated" row already tells readers the page changed recently, so do not add a "收录于" or "added to this site" footer.
- Obsidian vault files carry no dates. Their mtimes and commits date from the 2026 migration, so do not use them.
- RSS readers may still show a republished piece as new. The owner accepts that.

`scripts/check_site.py` rejects a missing or malformed `date`, and a `written` value that is a placeholder or later than `date`. It cannot tell whether a well-formed date is the historical one, so check the source.

Pages publishes through `.github/workflows/site-check.yml` (since 2026-09-29): on a push to `master`, the `deploy` job runs only after `make check-all` passes, so a failed check leaves the last good version live. Run the checks locally anyway, since a failed push holds back everything behind it. See the [2026-09-28 QA report](qa/2026-09-28-redesign-and-article-publication.md).
