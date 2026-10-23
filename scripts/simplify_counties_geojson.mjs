import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const INPUT = path.join(ROOT, 'public', 'data', 'counties-roi.geojson')
const OUTPUT = path.join(ROOT, 'public', 'data', 'counties-roi.geojson')

/** Douglas–Peucker-style step: keep every nth vertex on rings for display-only boundaries */
function simplifyRing(ring, step = 8) {
  if (ring.length <= 4) return ring
  const out = [ring[0]]
  for (let i = step; i < ring.length - 1; i += step) {
    out.push(ring[i])
  }
  out.push(ring[ring.length - 1])
  return out
}

function simplifyGeometry(geometry, step) {
  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, step)),
    }
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, step))
      ),
    }
  }
  return geometry
}

async function main() {
  const raw = JSON.parse(await fs.readFile(INPUT, 'utf8'))
  const features = raw.features.map((feature) => ({
    type: 'Feature',
    properties: {
      NAME_1: feature.properties?.NAME_1 ?? feature.properties?.ENG_NAME_VALUE ?? '',
    },
    geometry: simplifyGeometry(feature.geometry, 10),
  }))

  const out = { type: 'FeatureCollection', features }
  await fs.writeFile(OUTPUT, JSON.stringify(out), 'utf8')
  const stat = await fs.stat(OUTPUT)
  console.log(
    JSON.stringify({
      features: features.length,
      bytes: stat.size,
      path: OUTPUT,
    })
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
