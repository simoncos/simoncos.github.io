# Zhihu 2015 interactive research page and RSS alignment

## Scope

- Added a bilingual Research item under Work, with five selectable profile
  metrics, real aggregate distributions, a two-cohort network comparison,
  an explicitly illustrative directed-path example, coordinated Top 5 lists,
  and a sortable comparison of the published topics.
- Added one research-page link to each of the two articles in both languages.
  Kept the original dates, titles, arguments and URLs; updated revision dates.
- Fixed shared footer RSS alignment: a normal line box containing CJK text
  displaced its Latin text by 2 px. Explicit line height and baseline alignment
  make the two text bounds identical in the desktop browser measurement.

## Data verification

- Recovered archive SHA-256:
  `f8775f75b1e3a2f3c96dd876ac0717573fcc0622c7acdc6780f6c41a1a9e711c`.
- SQLite SHA-256:
  `1ea3f6f2a3ecc8f220a36e9c9b8463501af5b62eb1cb7ec3674bf0e7105c903d`.
- SQLite quick_check: ok. Counts: User 26,161; Following 4,612,110;
  Question 2,245,143; UserQuestion 1,655,414; UserTopic 5,414,129.
- All five profile means (at the original precision) and medians match the
  original published table. Eight disjoint bins per metric account for every
  user once. The export contains no user identifiers or individual edges.
- Rankings match the published lists; topic counts match all 30/20 entries.
  Unlisted names/topics are not given zero values. The newer inferential
  experiments were not rerun or promoted as confirmed findings.

## Verification

- `make check-all`: PASS, 54 tests; generated pages and TypeScript current.
- Data checks: PASS, published ranking entries and topic lists match sources.
- Desktop: inspected Chinese light and English dark research layouts.
- Mobile: inspected 390 px Chinese and 320 px English/dark layouts, with no
  document overflow. Also checked the narrow no-script fallback.
- Controls: metric, cohort, person, topic ordering and directed-path selection
  update the visible evidence; refresh and browser Back restore URL state.
- Keyboard: Enter activates a metric button and retains focus.
- Invalid parameters: fall back to a valid default without errors.
- No JavaScript: all five profiles, both ranking groups, 36 topic rows and
  sources remain readable; inert enhancement controls stay hidden.
- Work → Research reaches the new item. Original essays link back to it.
- Browser screenshots are kept in the task's local visualization folder.

## Evidence boundary

The new charts recount descriptive profile distributions. They do not establish
power-law fits, platform representativeness, elite homophily or removal
resilience. The network drawing is a labelled schematic, not reconstructed
real follow edges. Desktop browser emulation is not physical-device testing.
