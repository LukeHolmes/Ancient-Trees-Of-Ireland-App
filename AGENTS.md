# AGENTS.md — Ancient Trees of Ireland

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Checks

```bash
npm run lint
npm run typecheck
npm run build
npm run data:audit
npm run test:e2e   # Playwright (starts dev server)
```

## Data pipeline

Source of truth: `public/data/trees.json` (optional CSV → JSON via `npm run data:build`).

| Script | Purpose |
|--------|---------|
| `npm run data:apply-placement` | Set `placementConfidence`, `geocodeSource`, `verifiedAt` using Tailte 2026 boundaries |
| `npm run data:backfill-coords` | Nominatim backfill for records missing lat/lng (rate-limited) |
| `npm run data:audit` | Fail if blocking county mismatches or bad clusters |
| `npm run data:verify-counties` | Deep Tailte + Nominatim sample report |
| `npm run data:simplify-counties` | Shrink `public/data/counties-roi.geojson` for map outlines |

### When new coordinates arrive (CSV, Grokbot, manual)

1. Update `public/data/trees.json` — set `lat`, `lng`, and `coordinateStatus: "site_geocoded"`.
2. Prefer **site-level** coordinates (tree or estate pin), not vague town centroids.
3. For Northern Ireland (e.g. Fermanagh), coords are still required for map display; RoI Tailte checks do not apply.
4. Run `npm run data:apply-placement` to refresh confidence flags.
5. Run `npm run data:audit` before committing.
6. Shared sites (multiple record IDs, one location) may reuse the same coordinates.

Fields:

- `placementConfidence`: `verified` | `border` | `needs_review`
- `geocodeSource`: `heritage_register` | `nominatim` | `manual`

## Deploy (Vercel)

- Project: `ancient-trees-of-ireland-app`
- Optional: `NEXT_PUBLIC_CARTO_API_KEY` — free key from [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey/) for dark CARTO tiles. Without it, the app uses OpenStreetMap with a dark CSS filter.

Add the env var in Vercel → Project → Settings → Environment Variables (Production + Preview).

## URL sharing

Query params: `tree`, `county`, `type`, `species`, `age`, `condition`, `q`, `all=1` (include non-mappable), `boundaries=1`.

Example: `/?tree=132&county=Mayo&q=ballina`

## Cursor Cloud

- Dev server: `npm run dev` (port 3000)
- No secrets required for OSM fallback basemap
