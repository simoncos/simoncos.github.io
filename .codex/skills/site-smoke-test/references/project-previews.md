# Project previews / Vercel static preview layer

Use this when deploying or verifying pages in Che's `project-previews` repo rather than the main `simoncos.github.io` site.

## Repo and URL

- Local repo: `~/Documents/project-previews`
- Public alias: `https://simoncos-project-previews.vercel.app/`
- Source remote: `origin` = `simoncos/project-previews`
- Deploy/fork remote: `fork` = `redpiggy-cyber/project-previews`

This layer is public staging for static artifacts. It is useful for reviewing HTML decks, visual essays, or one-off project pages before moving them into the main site.

## Deploy workflow

```bash
cd ~/Documents/project-previews
git status --short
git pull --ff-only origin main
vercel deploy --prod --yes
```

**⚠️ CRITICAL: Always deploy from the repo root.** Running `vercel --prod` from a subdirectory (e.g. `cd us-watchdog-dashboard && vercel --prod`) uploads **only that subdirectory** to the root path `/`, overwriting `index.html` and breaking all other previews. If this happens, redeploy immediately from the repo root to restore the landing page.

### Adding a new preview (correct workflow)

Never create a temporary directory and deploy it directly to Vercel — this overwrites the root `/` and bypasses the index. Always add the preview as a subdirectory inside `~/Documents/project-previews`, update `index.html` and `README.md`, then commit/push/deploy from the repo.

Correct pattern:
```bash
cd ~/Documents/project-previews

# 1. Copy the static artifact into a subdirectory
mkdir -p <preview-name>
cp -r /path/to/artifact/* <preview-name>/

# 2. Update root index.html: add a link card/entry for the new preview
# 3. Update README.md: add to the current previews list

# 4. Commit, push both remotes, deploy
git add index.html README.md <preview-name>/
git commit -m "preview: add <preview-name>"
git push origin main && git push fork main
vercel deploy --prod --yes
```

If you accidentally deployed a temp directory directly and it became the root page, just redeploy from the repo — the repo deploy will overwrite the rogue root.

## Replacing the active preview

When Che asks to "拉起来 X preview" and "把其他 preview 都去掉", scope removal strictly to this preview repo (`~/Documents/project-previews`). Do not touch the canonical source repo, Obsidian folder, or main site repo.

Safe replacement pattern:

```bash
cd ~/Documents/project-previews
git status --short
git pull --ff-only origin main

# Remove stale preview roots only inside this repo. Use --ignore-unmatch so a
# missing directory (e.g. no existing talks/) does not leave a half-staged index.
git rm -r --ignore-unmatch sleep home talks

# Copy the new static artifact from canonical source.
mkdir -p talks/pkm-YYYY-MM-DD
rsync -a "$HOME/Documents/obsidian/simoncos/Write/Talk-YYYY-MM-DD/Talk-YYYY-MM-DD-assets/web-swiss-merged/" \
  talks/pkm-YYYY-MM-DD/

# Update root index.html and README so only the active preview is linked.
git add index.html README.md talks/pkm-YYYY-MM-DD
git commit -m "preview: stage YYYY-MM-DD pkm talk deck"
git push origin main
git push fork main
vercel deploy --prod --yes
```

Verification for replacement deploys:
- Public active path returns 200: `https://simoncos-project-previews.vercel.app/talks/pkm-YYYY-MM-DD/`.
- Root index links only the active preview; no stale `/sleep/` or `/home/` links.
- Removed preview roots return 404 (expected): `/sleep/`, `/home/`, old `/talks/...` if applicable.
- Deck-specific checks: slide count, key changed strings, and representative local assets/images return 200.
- Repo is clean after commit/push/deploy.

## Verification checklist

1. `curl` the public alias/path and require HTTP 200.
2. Grep the downloaded HTML for an expected page marker.
3. Check key assets directly if the page depends on local images/videos.
4. Use Playwright screenshot for visual pages or decks after animations settle.
5. Commit and push both remotes when the preview repo changes intentionally:

```bash
git push origin main
git push fork main
```

## Cleanup / single-active-preview workflow

When Che asks to "remove other previews" or keep only one active preview, scope deletion strictly to the preview repo:

- Confirm and report absolute paths before destructive removal, e.g. `~/Documents/project-previews/sleep`, `~/Documents/project-previews/home`, `~/Documents/project-previews/talks/<old-talk>`.
- Do **not** touch Obsidian canonical sources or the public `simoncos.github.io` repo during preview cleanup.
- Use `git rm -r -- <preview-dir>` for tracked preview directories, then physically remove any untracked leftovers in that repo only.
- Update root `index.html` and `README.md` so they list only the active preview.
- Commit, push both remotes, deploy with `vercel deploy --prod --yes`, and verify:
  - active preview path returns HTTP 200
  - removed preview paths return HTTP 404
  - root page links only to the active preview
  - key assets on the active preview return HTTP 200

Example verification paths after keeping only a talk deck:

```bash
BASE='https://simoncos-project-previews.vercel.app'
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/talks/pkm-YYYY-MM-DD/"   # expect 200
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/sleep/"                  # expect 404 if removed
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/home/"                   # expect 404 if removed
```

## Safety

Anything in `project-previews` is publicly accessible. Before deploy, check for private filenames, notes, account identifiers, holdings, tokens, and private screenshots. QR codes should be treated as public once deployed. For destructive cleanup, say the absolute repo path out loud before removal; Che may approve only after seeing the scope.
