import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const TMP_DIR = path.join(ROOT, 'tmp')
const COUNTIES_PATH = path.join(TMP_DIR, 'ireland_counties.geojson')
const REPORT_PATH = path.join(TMP_DIR, 'tree_coordinate_audit.json')
const COUNTIES_GEOJSON_URL =
  'https://gist.githubusercontent.com/vool/969e3be0cfac519560755cce0b91e097/raw/ireland.geojson'

function pointInRing(pointLng, pointLat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > pointLat !== yj > pointLat &&
      pointLng < ((xj - xi) * (pointLat - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInGeometry(pointLng, pointLat, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    if (!pointInRing(pointLng, pointLat, outer)) return false
    return !holes.some((hole) => pointInRing(pointLng, pointLat, hole))
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(([outer, ...holes]) => {
      if (!pointInRing(pointLng, pointLat, outer)) return false
      return !holes.some((hole) => pointInRing(pointLng, pointLat, hole))
    })
  }
  return false
}

function getCountyFeatures(featureCollection, county) {
  if (county === 'Laois') {
    return featureCollection.features.filter((feature) => feature.properties.NAME_1 === 'Laoighis')
  }
  if (county === 'Fermanagh') {
    return featureCollection.features.filter(
      (feature) =>
        feature.properties.NAME_1 === 'Northern Ireland' &&
        typeof feature.properties.NAME_2 === 'string' &&
        feature.properties.NAME_2.includes('Fermanagh')
    )
  }
  return featureCollection.features.filter((feature) => feature.properties.NAME_1 === county)
}

async function ensureCountyGeojson() {
  await fs.mkdir(TMP_DIR, { recursive: true })
  try {
    await fs.access(COUNTIES_PATH)
    return
  } catch {}
  const response = await fetch(COUNTIES_GEOJSON_URL)
  if (!response.ok) {
    throw new Error(`Failed to download counties GeoJSON: ${response.status}`)
  }
  await fs.writeFile(COUNTIES_PATH, await response.text(), 'utf8')
}

function hasNumericCoordinates(tree) {
  return typeof tree.lat === 'number' && typeof tree.lng === 'number'
}

function isInsideClaimedCounty(featureCollection, tree) {
  const countyFeatures = getCountyFeatures(featureCollection, tree.county)
  if (!countyFeatures.length) return false
  return countyFeatures.some((feature) => pointInGeometry(tree.lng, tree.lat, feature.geometry))
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

async function main() {
  await ensureCountyGeojson()
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const featureCollection = JSON.parse(await fs.readFile(COUNTIES_PATH, 'utf8'))

  const renderable = trees.filter(hasNumericCoordinates)
  const unresolved = trees.filter((tree) => tree.coordinateStatus === 'needs_site_coordinates')
  const countyMismatches = renderable.filter((tree) => !isInsideClaimedCounty(featureCollection, tree))
  const suspiciousClusters = findSuspiciousClusters(renderable)

  const report = {
    totalRecords: trees.length,
    renderableMarkers: renderable.length,
    unresolvedRecords: unresolved.length,
    countyMismatches: countyMismatches.map(({ id, siteName, county, lat, lng }) => ({
      id,
      siteName,
      county,
      lat,
      lng,
    })),
    suspiciousClusters,
  }

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify({ ...report, report: REPORT_PATH }, null, 2))

  if (countyMismatches.length > 0 || suspiciousClusters.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
