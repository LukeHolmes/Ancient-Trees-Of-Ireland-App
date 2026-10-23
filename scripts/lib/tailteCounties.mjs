import fs from 'node:fs/promises'
import path from 'node:path'
import proj4 from 'proj4'

export const TAILTE_URL =
  'https://data-osi.opendata.arcgis.com/api/download/v1/items/a2dd7924915e4c74ad6a417e33c394eb/geojson?layers=1'

proj4.defs(
  'EPSG:2157',
  '+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
)

export function normalizeCounty(name) {
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

export function pointInGeometry(x, y, geometry) {
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

export function wgs84ToItm(lat, lng) {
  const [x, y] = proj4('EPSG:4326', 'EPSG:2157', [lng, lat])
  return { x, y }
}

export function countyFromTailte(featureCollection, lat, lng) {
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

export function claimedMatchesTailteCounty(featureCollection, tree) {
  if (typeof tree.lat !== 'number' || typeof tree.lng !== 'number') return null
  const detected = countyFromTailte(featureCollection, tree.lat, tree.lng)
  if (!detected) return false
  return normalizeCounty(tree.county) === detected
}

export async function ensureTailteGeojson(tmpDir) {
  const tailtePath = path.join(tmpDir, 'ireland_counties_tailte.geojson')
  await fs.mkdir(tmpDir, { recursive: true })
  try {
    await fs.access(tailtePath)
  } catch {
    const response = await fetch(TAILTE_URL)
    if (!response.ok) {
      throw new Error(`Failed to download Tailte counties GeoJSON: ${response.status}`)
    }
    await fs.writeFile(tailtePath, await response.text(), 'utf8')
  }
  return JSON.parse(await fs.readFile(tailtePath, 'utf8'))
}

/** Manual overrides from heritage register review (Phase 1). */
export const PLACEMENT_OVERRIDES = {
  '1': 'border',
  '161': 'border',
  '489': 'needs_review',
}
