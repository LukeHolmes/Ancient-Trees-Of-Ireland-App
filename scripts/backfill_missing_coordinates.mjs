import fs from 'node:fs/promises'
import path from 'node:path'
import {
  claimedMatchesTailteCounty,
  ensureTailteGeojson,
} from './lib/tailteCounties.mjs'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const TMP_DIR = path.join(ROOT, 'tmp')
const REPORT_PATH = path.join(TMP_DIR, 'backfill_coordinates_report.json')

const IRELAND_BOUNDS = {
  minLat: 51.3,
  maxLat: 55.8,
  minLng: -10.9,
  maxLng: -5.0,
}

const GEOCODER_DELAY_MS = 1200

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function inIrelandBounds(lat, lng) {
  return (
    lat >= IRELAND_BOUNDS.minLat &&
    lat <= IRELAND_BOUNDS.maxLat &&
    lng >= IRELAND_BOUNDS.minLng &&
    lng <= IRELAND_BOUNDS.maxLng
  )
}

function buildQueries(tree) {
  const countyPart = tree.county ? `County ${tree.county}` : ''
  const q1 = [tree.siteName, countyPart, 'Ireland'].filter(Boolean).join(', ')
  const q2 = [tree.siteName, tree.county, 'Ireland'].filter(Boolean).join(', ')
  return [q1, q2].filter(Boolean)
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
      'User-Agent': 'AncientTreesOfIrelandApp/1.0 (coordinate-backfill)',
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

async function main() {
  const tailte = await ensureTailteGeojson(TMP_DIR)
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const verifiedAt = new Date().toISOString().slice(0, 10)

  const missing = trees.filter(
    (t) => t.lat == null || t.lng == null || t.coordinateStatus === 'needs_site_coordinates'
  )

  const results = { attempted: missing.length, geocoded: 0, stillMissing: 0, details: [] }

  for (const tree of missing) {
    let fixed = null
    for (const query of buildQueries(tree)) {
      const candidates = await geocodeCandidate(query)
      for (const candidate of candidates) {
        if (!inIrelandBounds(candidate.lat, candidate.lng)) continue
        fixed = candidate
        break
      }
      if (fixed) break
      await wait(GEOCODER_DELAY_MS)
    }

    const idx = trees.findIndex((t) => t.id === tree.id)
    if (idx < 0) continue

    if (!fixed) {
      results.stillMissing++
      results.details.push({ id: tree.id, siteName: tree.siteName, status: 'unresolved' })
      await wait(GEOCODER_DELAY_MS)
      continue
    }

    const inCounty = claimedMatchesTailteCounty(tailte, {
      ...tree,
      lat: fixed.lat,
      lng: fixed.lng,
    })

    trees[idx] = {
      ...trees[idx],
      lat: fixed.lat,
      lng: fixed.lng,
      coordinateStatus: 'site_geocoded',
      geocodeSource: 'nominatim',
      verifiedAt,
      placementConfidence: inCounty ? 'verified' : 'needs_review',
    }
    results.geocoded++
    results.details.push({
      id: tree.id,
      siteName: tree.siteName,
      status: inCounty ? 'verified' : 'needs_review',
      lat: fixed.lat,
      lng: fixed.lng,
      display: fixed.display,
    })
    await wait(GEOCODER_DELAY_MS)
  }

  await fs.writeFile(TREES_PATH, JSON.stringify(trees, null, 2), 'utf8')
  await fs.writeFile(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8')
  console.log(JSON.stringify({ ...results, report: REPORT_PATH }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
