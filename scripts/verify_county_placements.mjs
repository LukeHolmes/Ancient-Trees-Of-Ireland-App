import fs from 'node:fs/promises'
import path from 'node:path'
import proj4 from 'proj4'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const GIST_COUNTIES_PATH = path.join(ROOT, 'tmp', 'ireland_counties.geojson')
const TAILTE_COUNTIES_PATH = path.join(ROOT, 'tmp', 'ireland_counties_tailte.geojson')
const OUT_PATH = path.join(ROOT, 'tmp', 'county_placement_verification.json')

const TAILTE_URL =
  'https://data-osi.opendata.arcgis.com/api/download/v1/items/a2dd7924915e4c74ad6a417e33c394eb/geojson?layers=1'

proj4.defs(
  'EPSG:2157',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
)

function normalizeCounty(name) {
  if (!name) return ''
  return name
    .replace(/^County\s+/i, '')
    .replace(/^Co\.?\s+/i, '')
    .replace(/\s+County$/i, '')
    .trim()
    .toLowerCase()
    .replace('laoighis', 'laois')
}

function pointInRing(pointX, pointY, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > pointY !== yj > pointY &&
      pointX < ((xj - xi) * (pointY - yi)) / ((yj - yi) || 1e-12) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function pointInGeometry(x, y, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    if (!pointInRing(x, y, outer)) return false
    return !holes.some((hole) => pointInRing(x, y, hole))
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some(([outer, ...holes]) => {
      if (!pointInRing(x, y, outer)) return false
      return !holes.some((hole) => pointInRing(x, y, hole))
    })
  }
  return false
}

function wgs84ToItm(lat, lng) {
  const [x, y] = proj4('EPSG:4326', 'EPSG:2157', [lng, lat])
  return { x, y }
}

function getGistCountyFeatures(featureCollection, county) {
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

function countyFromTailte(featureCollection, lat, lng) {
  const { x, y } = wgs84ToItm(lat, lng)
  for (const feature of featureCollection.features) {
    const name = feature.properties.ENG_NAME_VALUE
    if (!name) continue
    if (pointInGeometry(x, y, feature.geometry)) {
      return normalizeCounty(name)
    }
  }
  return null
}

function claimedMatchesDetected(claimed, detected) {
  if (!detected) return false
  return normalizeCounty(claimed) === normalizeCounty(detected)
}

async function ensureTailteGeojson() {
  try {
    await fs.access(TAILTE_COUNTIES_PATH)
    return
  } catch {
    const response = await fetch(TAILTE_URL)
    if (!response.ok) throw new Error(`Tailte download failed: ${response.status}`)
    await fs.mkdir(path.dirname(TAILTE_COUNTIES_PATH), { recursive: true })
    await fs.writeFile(TAILTE_COUNTIES_PATH, await response.text(), 'utf8')
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function reverseCounty(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '10')
  url.searchParams.set('addressdetails', '1')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AncientTreesOfIreland-CountyVerify/1.0' },
  })
  if (!res.ok) throw new Error(`Nominatim ${res.status}`)
  const data = await res.json()
  const addr = data.address || {}
  const county =
    addr.county || addr.state_district || addr.region || addr.state || null
  return { county: county ? normalizeCounty(county) : null, display: data.display_name }
}

async function forwardGeocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'ie')
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AncientTreesOfIreland-CountyVerify/1.0' },
  })
  if (!res.ok) throw new Error(`Nominatim search ${res.status}`)
  const data = await res.json()
  if (!data[0]) return null
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    display: data[0].display_name,
  }
}

function pickSample(trees, n) {
  const copy = [...trees]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

async function main() {
  await ensureTailteGeojson()
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const gist = JSON.parse(await fs.readFile(GIST_COUNTIES_PATH, 'utf8'))
  const tailte = JSON.parse(await fs.readFile(TAILTE_COUNTIES_PATH, 'utf8'))

  const renderable = trees.filter(
    (t) => typeof t.lat === 'number' && typeof t.lng === 'number'
  )

  const tailteMismatches = []
  const gistMismatches = []

  for (const tree of renderable) {
    const tailteCounty = countyFromTailte(tailte, tree.lat, tree.lng)
    if (!claimedMatchesDetected(tree.county, tailteCounty)) {
      tailteMismatches.push({
        id: tree.id,
        siteName: tree.siteName,
        claimedCounty: tree.county,
        tailteCounty,
        lat: tree.lat,
        lng: tree.lng,
      })
    }

    const gistFeatures = getGistCountyFeatures(gist, tree.county)
    const inGistClaimed = gistFeatures.some((f) =>
      pointInGeometry(tree.lng, tree.lat, f.geometry)
    )
    if (!inGistClaimed) {
      gistMismatches.push({
        id: tree.id,
        siteName: tree.siteName,
        claimedCounty: tree.county,
        lat: tree.lat,
        lng: tree.lng,
      })
    }
  }

  const sample = pickSample(renderable, 25)
  const nominatimSample = []
  for (const tree of sample) {
    await sleep(1100)
    const rev = await reverseCounty(tree.lat, tree.lng)
    nominatimSample.push({
      id: tree.id,
      siteName: tree.siteName,
      claimedCounty: tree.county,
      nominatimCounty: rev.county,
      matches: claimedMatchesDetected(tree.county, rev.county),
      lat: tree.lat,
      lng: tree.lng,
    })
  }

  await sleep(1100)
  const ashfordForward = await forwardGeocode('Ashford Castle, Cong, Ireland')
  await sleep(1100)
  const birrForward = await forwardGeocode('Birr Castle, County Offaly, Ireland')

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      tailte: 'Tailte Éireann Counties National Statutory Boundaries 2026 (data.gov.ie, EPSG:2157)',
      gist: 'ireland.geojson (vool gist, WGS84)',
      nominatim: 'OpenStreetMap Nominatim reverse/forward geocoding',
    },
    totals: {
      records: trees.length,
      renderableMarkers: renderable.length,
      unresolvedNoCoordinates: trees.length - renderable.length,
    },
    tailteStatutoryBoundaryCheck: {
      matchesClaimedCounty: renderable.length - tailteMismatches.length,
      mismatchCount: tailteMismatches.length,
      mismatchRatePercent: Number(
        ((tailteMismatches.length / renderable.length) * 100).toFixed(2)
      ),
      mismatchRecords: tailteMismatches,
    },
    gistBoundaryCheck: {
      matchesClaimedCounty: renderable.length - gistMismatches.length,
      mismatches: gistMismatches.length,
    },
    nominatimRandomSample: {
      sampleSize: nominatimSample.length,
      matches: nominatimSample.filter((r) => r.matches).length,
      mismatches: nominatimSample.filter((r) => !r.matches),
    },
    landmarkForwardGeocodeChecks: {
      ashfordCastle: ashfordForward,
      birrCastle: birrForward,
      ashfordStoredCoords: renderable
        .filter((t) => t.siteName.includes('Ashford Castle'))
        .map((t) => ({ id: t.id, lat: t.lat, lng: t.lng, county: t.county })),
    },
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
