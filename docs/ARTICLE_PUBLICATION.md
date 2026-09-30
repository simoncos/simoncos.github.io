# Article publication

Owner policy, confirmed 2026-09-28: **all articles must have Chinese and English versions before going live**. Chinese-only work may be generated locally for review, but must not be pushed to the GitHub Pages branch.

1. Prepare `blogs/<slug>.md` and `blogs/<slug>.en.md`. Preserve the author's approved text ([Editing the text](#editing-the-text)). Translation should not silently revise the argument or invent dates.
2. Set `date` as described under [Dates](#dates), then match `date`, `updated`, `tags`, `series` and `series_part` in both versions. Use the same canonical `series` key even when the display name is translated. Translate the H1, description, body, image alt text and any reader-facing notes. Keep images shared in `blogs/assets/images/<slug>/`.
3. Prefer matching-language internal article links (`other-slug.en.html` in English, `other-slug.html` in Chinese). Keep external citations and attribution. Check poetry and quoted work separately for a faithful translation and preserved credit; see [Translation](#translation).
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

## Editing the text

These are the owner's standing decisions for republished essays, held since the 2026-09-30 batches. The Obsidian original is never modified; changes are made in the site copy only.

- **Typos only.** Fix clear typos in the Chinese: a wrong character, a misspelled name or term, a doubled word. List each fix in the batch's QA record.
- **Everything else stays as written, in both languages.** This covers factual, argumentative, dated and mathematical claims. Check them anyway and list the problems for the owner. A factual fix happens only when the owner approves that item. Once approved, change both versions together; 十年如雨's 三月的雪灾 became 年初的雪灾 this way (2026-09-29).
- **Mechanical cleanup is allowed.** It leaves the words unchanged:
  - add a missing H1, and turn setext headings into `#`;
  - drop duplicated date or title lines, platform hashtags such as `#explore`, and trailing spaces;
  - add `<br>` where Markdown would run the author's separate lines together;
  - NFC-normalize CJK compatibility characters copied from PDFs, which site search cannot find.
- **Links.** An existing link to a piece that is now on the site points to the site copy (十年如雨's appendix → 四年了). Adding a link the author did not write is a change to the text (2026-09-30).
- **Dead links** stay as written. Replace one with a Wayback copy only after seeing that the copy has the content.
- **Editorial suggestions** in the vault's selection notes (trim, cut quotations, add warnings) are not approved. List them; do not apply them.
- **Titles** are the author's own. A collection name is not part of each title: the 旧忆 prefix was dropped from all seventeen (2026-09-30).

## Privacy

- **Pixelate** personal contact details visible in photos: phone numbers, emails, street addresses, ID numbers and personal financial documents. The precedent is the business card in `blogs/assets/images/my-2022-in-pictures/`.
- **Flag, but do not alter:**
  - identifiable faces;
  - relatives;
  - places that reveal where the owner lives or works;
  - employer details;
  - private names in the text.

  The owner decides each one. On 2026-09-30 every such item was kept as written.
- **Strip metadata.** Site copies carry no EXIF; `scripts/localize_images.py` strips it. The public R2 originals still carry GPS; list them in the QA record.

## Translation

- The English page is a faithful translation in the author's register. Its frontmatter names the model: `translation: Claude Opus 5.5`.
- **Search to confirm terms before using them.** This covers every uncertain term, place, person, work and official localized name. Where the original is descriptive, stay descriptive.
- **Errors in the source are translated as written**, so the two versions never drift. Flag them. A typo whose literal translation is nonsense is translated as meant, and flagged.
- **Song lyrics are never reproduced or translated.** Name the song where a search confirms it, and describe what the line does.
- **In-copyright poems are not translated.** Keep the credit and link to the Chinese page. Public-domain classical poetry is fine to translate, and so is the author's own verse.
- **Long in-copyright quotations**: give at most a sentence or two in English, from the published English original or as a marked translation of our own. Paraphrase the rest in brackets. A book quote the Chinese essay cites in translation is translated back from the Chinese, not restored to the original wording; say so in the QA record.
- **Links in the English version**:
  - mark a Chinese-only external page "(in Chinese)";
  - point concept links at English Wikipedia;
  - link sibling articles as `<slug>.en.html`.

Pages publishes through `.github/workflows/site-check.yml` (since 2026-09-29): on a push to `master`, the `deploy` job runs only after `make check-all` passes, so a failed check leaves the last good version live. Run the checks locally anyway, since a failed push holds back everything behind it. See the [2026-09-28 QA report](qa/2026-09-28-redesign-and-article-publication.md).
