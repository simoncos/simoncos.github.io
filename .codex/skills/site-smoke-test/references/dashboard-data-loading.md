# Static Dashboard Data-Loading Patterns

Three-tier pattern for data-heavy static dashboards (HTML/CSS/JS deployed as static files).

## Tier 1: Inline DATA (< 50KB total)

Embed directly in the HTML `<script>` tag:

```html
<script>
const DATA = {"stock": [...], "holder": [...]};
// render immediately
</script>
```

**When to use**: prototype, tiny datasets, zero-latency first render.
**Limit**: Browser parses + renders all DOM nodes synchronously. >200-400 rows starts to jank.

## Tier 2: Single JSON fetch (< 500KB)

Load one data file after DOM ready:

```html
<script>
fetch('./data.json').then(r=>r.json()).then(DATA=>{
  // render
});
</script>
```

**When to use**: moderate datasets, need to regenerate data without touching HTML.
**Limit**: Still loads everything upfront. >1MB JSON blocks the main thread during `JSON.parse()` and initial render.

## Tier 3: Split + lazy load (> 500KB or > 200 rows)

Separate concerns into multiple files:

| File | Contents | Size | Load timing |
|------|----------|------|-------------|
| `anomalies.json` | Stock + holder signals, aggregates | ~200-400KB | Page init |
| `members.json` | Member list (name, slug, trade_count, last_trade_date only) | ~20KB | Page init |
| `members/{slug}.json` | Per-member full trade history | 5-120KB each | On member click |

**Benefits**:
- Initial load drops from 2MB+ to ~350KB
- Member list renders instantly (only 211 lightweight summaries)
- Full trade histories load on demand, keeping DOM node count low
- Each member file is independently cacheable

**Implementation sketch**:

```js
Promise.all([
  fetch('./anomalies.json').then(r=>r.json()),
  fetch('./members.json').then(r=>r.json())
]).then(([ANOM, MEM])=>{
  // render stock tab from ANOM
  // render member list from MEM.members
});

function selectMember(slug) {
  fetch(`./members/${slug}.json`).then(r=>r.json()).then(data=>{
    // render trade timeline
  });
}
```

## When to escalate tiers

- DOM starts to feel sluggish → measure with `performance.now()` around render
- `data.json` exceeds 1MB → definitely split
- >500 rows in a single list → paginate or virtualize, even with lazy loading
- Static file host (Vercel/GitHub Pages) has no server-side rendering → all splitting must be client-side

## Generation pipeline

The Python generator script should mirror the frontend's data split:

```python
# anomalies.json
anomalies = {"stock": [...], "holder": [...], "topTickers": [...]}
json.dump(anomalies, open("anomalies.json", "w"), separators=(",", ":"))

# members.json (summary only)
members_summary = [{"name": ..., "slug": ..., "trade_count": ..., "last_trade_date": ...}]
json.dump({"members": members_summary}, open("members.json", "w"), separators=(",", ":"))

# members/*.json (detail per member)
for m in members:
    json.dump({"name": m.name, "trades": m.trades}, open(f"members/{m.slug}.json", "w"))
```

Use `separators=(",", ":")` to minify JSON (no pretty-print whitespace) — static hosts gzip well, but every byte still costs parse time.
