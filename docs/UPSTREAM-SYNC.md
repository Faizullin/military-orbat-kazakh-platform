# Upstream Sync Workflow

This project tracks [orbat-mapper](https://github.com/orbat-mapper/orbat-mapper) as a git submodule at `apps/web-source`. The sync script copies upstream source files into the working app (`apps/web`) while protecting our custom files.

## Project layout

```
apps/
  web-source/    <-- git submodule (orbat-mapper upstream, read-only)
  web/           <-- working app (upstream code + our customizations)
  server/        <-- API backend (Hono + better-auth + Prisma) [planned]
```

## Setup (first time)

```bash
# Clone this repo with submodules
git clone --recurse-submodules <this-repo-url>

# Or if already cloned, init the submodule
git submodule update --init
```

## Pulling latest upstream

```bash
# Option 1: pull manually
git -C apps/web-source pull

# Option 2: let the script do it
python scripts/sync-upstream.py --pull
```

## Sync Commands

All commands run from the project root.

### Preview changes (dry run)

```bash
python scripts/sync-upstream.py --dry-run
```

### Interactive sync (recommended)

```bash
python scripts/sync-upstream.py
```

Keys during interactive mode:
- `y` -- accept this file
- `n` -- skip this file
- `d` -- show diff before deciding
- `a` -- accept all remaining
- `s` -- skip all remaining

### Auto-accept all safe changes

```bash
python scripts/sync-upstream.py --accept-safe
```

### Pull + sync in one command

```bash
python scripts/sync-upstream.py --pull --accept-safe
```

### View diff for a specific file

```bash
python scripts/sync-upstream.py --diff src/components/MapContainer.vue
```

### Show new upstream commits since last sync

```bash
python scripts/sync-upstream.py --log
```

### Use a different source or target

```bash
# Sync from a fork instead of the submodule
python scripts/sync-upstream.py --upstream ~/my-fork --target apps/web
```

## SYNC-VERSION.txt

After each sync, the script generates `apps/web/SYNC-VERSION.txt` with:

- Upstream commit SHA and date
- Commit message
- Number of files synced vs protected
- Recent upstream commit log (last 10)

This file tells you at a glance what upstream version your working app is based on. Example:

```
SYNC VERSION INFO
=================
Synced at:          2026-04-15 16:30:18
Upstream commit:    c3d3d84bbe5d
Upstream date:      2026-04-15
Upstream message:   Show move cursor for movable MapLibre units
Files synced:       18
Files protected:    4

Recent upstream commits:
c3d3d84b Show move cursor for movable MapLibre units
949fe67d Force full style reload on MapLibre basemap changes
019445a9 Improve MapLibre unit label contrast
...
```

## Protected Files

Files in `scripts/custom-files.txt` are NEVER overwritten. These are our custom additions:

| Pattern | What |
|---|---|
| `src/modules/auth/*` | Auth module (login, register) |
| `src/modules/symboleditor/*` | Konva symbol editor |
| `src/lib/api-client.ts` | REST API fetch wrapper |
| `src/lib/auth-client.ts` | better-auth client |
| `src/scenariostore/localdb.ts` | Persistence (IndexedDB replaced with API) |
| `src/router/index.ts` | Auth routes + guards |
| `src/router/names.ts` | Auth route names |
| `src/stores/authStore.ts` | Pinia auth store |
| `src/views/LoginView.vue` | Login page |
| `src/views/RegisterView.vue` | Register page |
| `vite.config.ts` | API proxy config |
| `CLAUDE.md` | Project docs |

### Adding new protected files

When you create a custom file, add it to `scripts/custom-files.txt`:

```
src/modules/mynewfeature/*
src/composables/useMyCustomThing.ts
```

## Skipped upstream meta files

These upstream-only files are always excluded (not source code):

- `.github/`, `.agent/`, `.codex` -- their CI/AI config
- `docs/`, `functions/`, `images/` -- their docs, CF functions, screenshots
- `CHANGELOG.md`, `LICENSE`, `README.md`
- `pnpm-workspace.yaml`, `pnpm-lock.yaml` -- nested workspace config

## Handling protected file conflicts

When upstream modifies a file you've customized:

1. Script shows it as `PROTECTED -- skipped`
2. Review the upstream change:
   ```bash
   python scripts/sync-upstream.py --diff src/router/index.ts
   ```
3. Manually port relevant changes into your custom version

## Git submodule commands reference

```bash
# Check submodule status
git submodule status

# Pull latest upstream
git -C apps/web-source pull

# Pin submodule to a specific commit
git -C apps/web-source checkout <sha>
git add apps/web-source
git commit -m "pin upstream to <sha>"

# Update submodule after someone else pinned it
git submodule update
```
