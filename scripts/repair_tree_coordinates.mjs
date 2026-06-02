import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const TMP_DIR = path.join(ROOT, 'tmp')
const COUNTIES_PATH = path.join(TMP_DIR, 'ireland_counties.geojson')
const REPORT_PATH = path.join(TMP_DIR, 'coordinate_repair_report.json')
const COUNTIES_GEOJSON_URL =
  'https://gist.githubusercontent.com/vool/969e3be0cfac519560755cce0b91e097/raw/ireland.geojson'

const IRELAND_BOUNDS = {
  minLat: 51.3,
  maxLat: 55.8,
  minLng: -10.9,
  maxLng: -5.0,
}

const GEOCODER_DELAY_MS = 1200

function maybeSwapCoordinates(lat, lng) {
  if (lat > -11 && lat < -5 && lng > 51 && lng < 56) {
    return { lat: lng, lng: lat }
  }
  return { lat, lng }
}

function pointInRing(pointLng, pointLat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect =
      yi > pointLat !== yj > pointLat &&
      pointLng < ((xj - xi) * (pointLat - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInGeometry(pointLng, pointLat, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    if (!pointInRing(pointLng, pointLat, outer)) return false
    for (const hole of holes) if (pointInRing(pointLng, pointLat, hole)) return false
    return true
  }
  if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      const [outer, ...holes] = polygon
      if (!pointInRing(pointLng, pointLat, outer)) continue
      let inHole = false
      for (const hole of holes) {
        if (pointInRing(pointLng, pointLat, hole)) {
          inHole = true
          break
        }
      }
      if (!inHole) return true
    }
  }
  return false
}

function getCountyFeatures(featureCollection, county) {
  if (county === 'Laois') {
    return featureCollection.features.filter((f) => f.properties.NAME_1 === 'Laoighis')
  }
  if (county === 'Fermanagh') {
    return featureCollection.features.filter(
      (f) =>
        f.properties.NAME_1 === 'Northern Ireland' &&
        typeof f.properties.NAME_2 === 'string' &&
        f.properties.NAME_2.includes('Fermanagh')
    )
  }
  return featureCollection.features.filter((f) => f.properties.NAME_1 === county)
}

function isInsideClaimedCounty(featureCollection, county, lat, lng) {
  const countyFeatures = getCountyFeatures(featureCollection, county)
  if (!countyFeatures.length) return false
  return countyFeatures.some((feature) => pointInGeometry(lng, lat, feature.geometry))
}

function inIrelandBounds(lat, lng) {
  return (
    lat >= IRELAND_BOUNDS.minLat &&
    lat <= IRELAND_BOUNDS.maxLat &&
    lng >= IRELAND_BOUNDS.minLng &&
    lng <= IRELAND_BOUNDS.maxLng
  )
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const text = await response.text()
  await fs.writeFile(COUNTIES_PATH, text, 'utf8')
}

function buildQueries(tree) {
  const countyPart = tree.county ? `County ${tree.county}` : ''
  const q1 = [tree.siteName, countyPart, 'Ireland'].filter(Boolean).join(', ')
  const q2 = [tree.siteName, tree.county, 'Ireland'].filter(Boolean).join(', ')
  const q3 = [tree.commonName, tree.siteName, tree.county, 'Ireland']
    .filter(Boolean)
    .join(', ')
  return [q1, q2, q3].filter(Boolean)
}

async function geocodeCandidate(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('countrycodes', 'ie,gb')
  url.searchParams.set('viewbox', '-11,55.8,-5,51.2')
  url.searchParams.set('bounded', '1')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AncientTreesOfIrelandApp/1.0 (data-repair-script)',
      Accept: 'application/json',
    },
  })
  if (!response.ok) return []
  const rows = await response.json()
  return Array.isArray(rows)
    ? rows
        .map((row) => ({ lat: Number(row.lat), lng: Number(row.lon), display: row.display_name }))
        .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng))
    : []
}

function buildAuditRow(featureCollection, tree) {
  if (typeof tree.lat !== 'number' || typeof tree.lng !== 'number') {
    return { ...tree, lat: null, lng: null, inBounds: false, inCounty: false }
  }
  const normalized = maybeSwapCoordinates(tree.lat, tree.lng)
  const lat = normalized.lat
  const lng = normalized.lng
  const inBounds = inIrelandBounds(lat, lng)
  const inCounty = inBounds && isInsideClaimedCounty(featureCollection, tree.county, lat, lng)
  return { ...tree, lat, lng, inBounds, inCounty }
}

async function main() {
  await ensureCountyGeojson()
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const featureCollection = JSON.parse(await fs.readFile(COUNTIES_PATH, 'utf8'))

  const audited = trees.map((tree) => buildAuditRow(featureCollection, tree))
  const needsRepair = audited.filter((row) => !row.inCounty)

  const repairedIds = new Set()
  const unresolved = []
  const updated = [...audited]

  for (const row of needsRepair) {
    const queries = buildQueries(row)
    let fixed = false

    for (const query of queries) {
      const candidates = await geocodeCandidate(query)
      for (const candidate of candidates) {
        if (!inIrelandBounds(candidate.lat, candidate.lng)) continue
        if (!isInsideClaimedCounty(featureCollection, row.county, candidate.lat, candidate.lng))
          continue

        const idx = updated.findIndex((t) => t.id === row.id)
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            lat: candidate.lat,
            lng: candidate.lng,
            coordinateStatus: 'site_geocoded',
          }
          repairedIds.add(row.id)
          fixed = true
        }
        break
      }
      if (fixed) break
      await wait(GEOCODER_DELAY_MS)
    }

    if (!fixed) {
      const idx = updated.findIndex((t) => t.id === row.id)
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          lat: null,
          lng: null,
          coordinateStatus: 'needs_site_coordinates',
        }
      }
      unresolved.push({
        id: row.id,
        county: row.county,
        siteName: row.siteName,
        lat: row.lat,
        lng: row.lng,
      })
    }
    await wait(GEOCODER_DELAY_MS)
  }

  const finalAudited = updated.map((tree) => buildAuditRow(featureCollection, tree))
  const finalMismatches = finalAudited.filter((row) => !row.inCounty)

  const cleanedTrees = finalAudited.map(
    ({ inBounds, inCounty, repairedBy, ...tree }) => ({
      ...tree,
    })
  )

  await fs.writeFile(TREES_PATH, JSON.stringify(cleanedTrees, null, 2), 'utf8')
  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        totalTrees: trees.length,
        initiallyInvalid: needsRepair.length,
        repaired: repairedIds.size,
        unresolved: unresolved.length,
        finalInvalid: finalMismatches.length,
        unresolvedExamples: unresolved.slice(0, 40),
      },
      null,
      2
    ),
    'utf8'
  )

  console.log(
    JSON.stringify(
      {
        totalTrees: trees.length,
        initiallyInvalid: needsRepair.length,
        repaired: repairedIds.size,
        unresolved: unresolved.length,
        finalInvalid: finalMismatches.length,
        report: REPORT_PATH,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
