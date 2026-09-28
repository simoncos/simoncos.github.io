# Article publication

Owner policy, confirmed 2026-09-28: **all articles must have Chinese and English versions before going live**. Chinese-only work may be generated locally for review, but must not be pushed to the GitHub Pages branch.

1. Prepare `blogs/<slug>.md` and `blogs/<slug>.en.md`. Preserve the author's approved text. Translation should not silently revise the argument or invent dates.
2. Match `date`, `updated`, `tags`, `series` and `series_part` in both versions. Use the same canonical `series` key even when the display name is translated. Translate the H1, description, body, image alt text and any reader-facing notes. Keep images shared in `blogs/assets/images/<slug>/`.
3. Prefer matching-language internal article links (`other-slug.en.html` in English, `other-slug.html` in Chinese). Keep external citations and attribution. Check poetry and quoted work separately for a faithful translation and preserved credit.
4. `make generate` writes all article pages, indexes, RSS and derived section pages. Add both article URLs to `sitemap.xml`; keep `data/site_shell.json` `site_updated` current. Do not edit generated HTML by hand.
5. Run `make check-all` and `git diff --check`. `scripts/check_site.py` rejects an article group missing either language; its existing file checks also verify that the declared source and generated page exist. This is a structural gate, not evidence of translation quality.
6. Review both versions in a browser, including Chinese mobile layout, images, series order, internal links and translation toggles. Only then commit and publish within the authorized scope; verify the deployed revision and pages separately.

GitHub Pages currently deploys independently from the check workflow. A failed check does **not** itself prevent a direct push from being published. Treat the local check as a required release condition until deployment is made dependent on check success. See the [2026-09-28 QA report](qa/2026-09-28-redesign-and-article-publication.md).
