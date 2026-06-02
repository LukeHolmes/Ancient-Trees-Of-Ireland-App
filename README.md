# Ancient Trees of Ireland (Next.js)

Modernized web app for exploring heritage trees across Ireland using a Leaflet map, rich filtering, and a responsive sidebar.

## Stack

- Next.js (App Router)
- TypeScript
- React + React Leaflet
- Tailwind CSS

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

## Production

```bash
npm run build
npm run start
```

## Checks

```bash
npm run lint
npm run typecheck
```

## Data

The app reads `public/data/trees.json`.

Some records are retained with `coordinateStatus: "needs_site_coordinates"` and
`null` coordinates. These records need source-level site coordinates before they
can be shown as markers.

Audit marker coordinates against Irish county polygons and suspicious duplicate
marker clusters with:

```bash
npm run data:audit
```

The source CSV is optional and is not committed. If you have a source CSV named
`HeritageTreesOfIreland_corrected.csv` in the project root, regenerate JSON with:

```bash
npm run data:build
```

Or pass a custom CSV path:

```bash
python scripts/convert_csv_to_json.py /path/to/file.csv
```

To repair missing or invalid coordinates in the generated JSON, run:

```bash
npm run data:repair
```

`data:repair` calls the OpenStreetMap Nominatim API, writes progress files under
`tmp/`, and overwrites `public/data/trees.json`.

## Notes

- If your checkout does not include the source CSV, the app still runs using the committed `public/data/trees.json`.
- Filters currently include county, tree type, common name, age range, and condition.
