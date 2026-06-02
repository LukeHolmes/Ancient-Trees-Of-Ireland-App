# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Single Next.js 14 app (**Ancient Trees of Ireland**): interactive Leaflet map + filterable sidebar over static `public/data/trees.json`. No database, Docker, or separate API service.

### Services

| Service | Required | How to run |
|---------|----------|------------|
| Next.js dev server | Yes | `npm run dev` → http://localhost:3000 |
| CARTO basemap (CDN) | For full map UX | External HTTPS; not started by the repo |

### Standard commands

See `README.md` and `package.json`:

- **Install:** `npm install` (uses `package-lock.json`)
- **Dev:** `npm run dev`
- **Lint:** `npm run lint`
- **Build:** `npm run build` then `npm run start` for production mode
- **Tests:** No automated test suite is configured in this repo

### Gotchas

- **Filtered tree count vs raw JSON:** `app/page.tsx` normalizes coordinates and filters to points inside an Ireland polygon, so the UI shows fewer trees than the raw `trees.json` row count (e.g. ~210 in UI vs 322 in file).
- **Map tiles need network:** Leaflet tiles load from CARTO over the public internet; offline VMs show the app UI but blank map tiles.
- **Optional data scripts:** `npm run data:build` needs Python 3 and a source CSV; `npm run data:repair` is maintenance-only. Neither is required to run the app because `public/data/trees.json` is committed.
- **Long-running dev server:** Use a tmux session (e.g. `next-dev-server`) for `npm run dev` so the process survives backgrounding.

### Hello-world verification

1. Open http://localhost:3000
2. Confirm map markers and sidebar stats load
3. Apply a filter (e.g. County → Cavan) and confirm the list/count updates
4. Click a map marker and confirm the popup shows tree details
