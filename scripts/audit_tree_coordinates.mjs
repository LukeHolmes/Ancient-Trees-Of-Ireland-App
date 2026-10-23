import fs from 'node:fs/promises'
import path from 'node:path'
import {
  claimedMatchesTailteCounty,
  ensureTailteGeojson,
} from './lib/tailteCounties.mjs'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const TMP_DIR = path.join(ROOT, 'tmp')
const REPORT_PATH = path.join(TMP_DIR, 'tree_coordinate_audit.json')

function hasNumericCoordinates(tree) {
  return typeof tree.lat === 'number' && typeof tree.lng === 'number'
}

function findSuspiciousClusters(trees) {
  const groups = new Map()
  for (const tree of trees) {
    const key = `${tree.lat.toFixed(8)},${tree.lng.toFixed(8)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(tree)
  }
  return [...groups.entries()]
    .map(([coordinates, records]) => ({
      coordinates,
      recordCount: records.length,
      siteCount: new Set(records.map((record) => record.siteName)).size,
      ids: records.map((record) => record.id),
      sites: [...new Set(records.map((record) => record.siteName))],
      county: records[0]?.county ?? '',
    }))
    .filter((cluster) => cluster.recordCount > 1 && cluster.siteCount > 1)
    .sort((a, b) => b.recordCount - a.recordCount)
}

function isBlockingCountyMismatch(tree, tailte) {
  const confidence = tree.placementConfidence
  if (confidence === 'border' || confidence === 'needs_review') return false
  return !claimedMatchesTailteCounty(tailte, tree)
}

async function main() {
  const tailte = await ensureTailteGeojson(TMP_DIR)
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))

  const renderable = trees.filter(hasNumericCoordinates)
  const unresolved = trees.filter((tree) => !hasNumericCoordinates(tree))
  const countyPolygonWarnings = renderable.filter((tree) => !claimedMatchesTailteCounty(tailte, tree))
  const blockingCountyMismatches = renderable.filter((tree) => isBlockingCountyMismatch(tree, tailte))
  const suspiciousClusters = findSuspiciousClusters(renderable)
  const blockingSuspiciousClusters = suspiciousClusters.filter((cluster) => cluster.recordCount >= 3)

  const report = {
    totalRecords: trees.length,
    renderableMarkers: renderable.length,
    unresolvedRecords: unresolved.length,
    countyPolygonWarnings: countyPolygonWarnings.map(({ id, siteName, county, lat, lng, placementConfidence }) => ({
      id,
      siteName,
      county,
      lat,
      lng,
      placementConfidence,
    })),
    blockingCountyMismatches: blockingCountyMismatches.map(({ id, siteName, county, placementConfidence }) => ({
      id,
      siteName,
      county,
      placementConfidence,
    })),
    suspiciousClusters,
    blockingSuspiciousClusters,
    boundarySource: 'Tailte Éireann Counties National Statutory Boundaries 2026',
  }

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify({ ...report, report: REPORT_PATH }, null, 2))

  if (blockingSuspiciousClusters.length > 0 || blockingCountyMismatches.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
