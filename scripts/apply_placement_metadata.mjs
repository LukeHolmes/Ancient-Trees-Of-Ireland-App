import fs from 'node:fs/promises'
import path from 'node:path'
import {
  PLACEMENT_OVERRIDES,
  claimedMatchesTailteCounty,
  ensureTailteGeojson,
} from './lib/tailteCounties.mjs'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const TMP_DIR = path.join(ROOT, 'tmp')

async function main() {
  const tailte = await ensureTailteGeojson(TMP_DIR)
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const verifiedAt = new Date().toISOString().slice(0, 10)

  const updated = trees.map((tree) => {
    const override = PLACEMENT_OVERRIDES[tree.id]
    if (override) {
      return {
        ...tree,
        placementConfidence: override,
        verifiedAt,
        geocodeSource: tree.geocodeSource ?? 'heritage_register',
      }
    }

    const hasCoords = typeof tree.lat === 'number' && typeof tree.lng === 'number'
    if (!hasCoords) {
      return {
        ...tree,
        coordinateStatus: tree.coordinateStatus ?? 'needs_site_coordinates',
        placementConfidence: tree.placementConfidence ?? 'needs_review',
        verifiedAt,
      }
    }

    const inCounty = claimedMatchesTailteCounty(tailte, tree)
    const placementConfidence = inCounty ? 'verified' : 'needs_review'
    return {
      ...tree,
      coordinateStatus: tree.coordinateStatus ?? 'site_geocoded',
      placementConfidence,
      geocodeSource: tree.geocodeSource ?? 'heritage_register',
      verifiedAt,
    }
  })

  await fs.writeFile(TREES_PATH, JSON.stringify(updated, null, 2), 'utf8')
  const summary = {
    total: updated.length,
    verified: updated.filter((t) => t.placementConfidence === 'verified').length,
    border: updated.filter((t) => t.placementConfidence === 'border').length,
    needs_review: updated.filter((t) => t.placementConfidence === 'needs_review').length,
  }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
