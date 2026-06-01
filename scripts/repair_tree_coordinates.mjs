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

function polygonArea(ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return Math.abs(area / 2)
}

function polygonCentroid(ring) {
  let twiceArea = 0
  let x = 0
  let y = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    twiceArea += f
    x += (ring[j][0] + ring[i][0]) * f
    y += (ring[j][1] + ring[i][1]) * f
  }
  if (Math.abs(twiceArea) < 1e-12) return null
  const factor = 1 / (3 * twiceArea)
  return { lng: x * factor, lat: y * factor }
}

function getFeatureRepresentativePoint(feature) {
  const geom = feature.geometry
  const candidatePolygons = []
  if (geom.type === 'Polygon') {
    candidatePolygons.push(geom.coordinates)
  } else if (geom.type === 'MultiPolygon') {
    candidatePolygons.push(...geom.coordinates)
  }
  if (!candidatePolygons.length) return null

  let best = null
  for (const poly of candidatePolygons) {
    const outer = poly[0]
    const area = polygonArea(outer)
    if (!best || area > best.area) {
      best = { outer, area, geom: { type: 'Polygon', coordinates: poly } }
    }
  }
  if (!best) return null

  const centroid = polygonCentroid(best.outer)
  if (
    centroid &&
    pointInGeometry(centroid.lng, centroid.lat, best.geom) &&
    Number.isFinite(centroid.lat) &&
    Number.isFinite(centroid.lng)
  ) {
    return centroid
  }
  // Fall back to first outer-ring point on boundary.
  return { lng: best.outer[0][0], lat: best.outer[0][1] }
}

function getCountyFallbackPoint(featureCollection, county) {
  const countyFeatures = getCountyFeatures(featureCollection, county)
  if (!countyFeatures.length) return null
  let winner = null
  for (const feature of countyFeatures) {
    const point = getFeatureRepresentativePoint(feature)
    if (!point) continue
    if (!winner) {
      winner = point
      break
    }
  }
  return winner
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
  const normalized = maybeSwapCoordinates(Number(tree.lat), Number(tree.lng))
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
  const fallbackIds = new Set()
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
            repairedBy: 'nominatim',
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
      const fallback = getCountyFallbackPoint(featureCollection, row.county)
      if (fallback && inIrelandBounds(fallback.lat, fallback.lng)) {
        const idx = updated.findIndex((t) => t.id === row.id)
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            lat: fallback.lat,
            lng: fallback.lng,
            repairedBy: 'county-fallback',
          }
          fallbackIds.add(row.id)
          fixed = true
        }
      }
    }

    if (!fixed) {
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
        fallbackRepaired: fallbackIds.size,
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
        fallbackRepaired: fallbackIds.size,
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
