---
name: evidence-led-tree-import
description: Review FOI/AIE, heritage-register and geocoding data for the Ancient Trees map with evidence and coordinate-quality checks. Use for new CSV or register imports and map accuracy investigations.
---

# Evidence-led tree import

1. Identify the source register/FOI response, scope, recording date, licence or reuse constraints and original raw file. Never interpret a missing response as proof that no trees exist.
2. Compare imported identifiers, species, townland, county, site and coordinates with current public/data/trees.json. Deduplicate carefully and preserve original provenance for discrepancies.
3. Keep separate fields for source claims, coordinates and confidence. Site/estate/tree points should be distinguished from approximate town or county centroids. Never invent coordinates or official protected status.
4. Use existing source-to-JSON scripts rather than hand-editing large data arrays. After coordinate changes apply placement classification and run npm run data:audit. Add typecheck, lint, build or Playwright when the code/UI changes require them.
5. Report counts for accepted, duplicate, changed, unplaced and manual-review rows. Log blocking county mismatches and geocoding uncertainty.
6. Prepare a branch/PR with before/after data counts and links to evidence. Do not bulk overwrite validated rows, publish private correspondence or deploy without explicit approval.
