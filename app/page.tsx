import { promises as fs } from 'fs'
import path from 'path'
import type { Tree } from '@/types/tree'
import MapApp from '@/components/MapApp'

// [lng, lat] polygon that approximates the island of Ireland.
const IRELAND_POLYGON: [number, number][] = [
  [-10.6, 51.35],
  [-10.4, 51.7],
  [-10.15, 52.2],
  [-10.0, 52.8],
  [-9.8, 53.35],
  [-9.35, 53.9],
  [-8.95, 54.25],
  [-8.25, 54.6],
  [-7.4, 55.05],
  [-6.35, 55.28],
  [-5.55, 55.02],
  [-5.45, 54.6],
  [-5.75, 54.25],
  [-6.25, 53.95],
  [-6.85, 53.5],
  [-7.35, 53.1],
  [-7.9, 52.75],
  [-8.45, 52.25],
  [-9.05, 51.9],
  [-9.65, 51.65],
  [-10.25, 51.45],
  [-10.6, 51.35],
]

const IRELAND_BOUNDS = {
  minLat: 51.3,
  maxLat: 55.7,
  minLng: -10.9,
  maxLng: -5.1,
}

function maybeSwapCoordinates(lat: number, lng: number) {
  // Handle obvious inversion: lat in Ireland-longitude range and lng in Ireland-latitude range.
  if (lat > -11 && lat < -5 && lng > 51 && lng < 56) {
    return { lat: lng, lng: lat }
  }
  return { lat, lng }
}

function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function normalizeAndFilterTrees(trees: Tree[]): Tree[] {
  return trees
    .map((tree) => {
      const coords = maybeSwapCoordinates(tree.lat, tree.lng)
      return { ...tree, lat: coords.lat, lng: coords.lng }
    })
    .filter((tree) => {
      if (!Number.isFinite(tree.lat) || !Number.isFinite(tree.lng)) return false
      if (tree.lat < IRELAND_BOUNDS.minLat || tree.lat > IRELAND_BOUNDS.maxLat) return false
      if (tree.lng < IRELAND_BOUNDS.minLng || tree.lng > IRELAND_BOUNDS.maxLng) return false
      return isPointInPolygon(tree.lat, tree.lng, IRELAND_POLYGON)
    })
}

export default async function Home() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'trees.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const trees: Tree[] = JSON.parse(raw)
  const cleanedTrees = normalizeAndFilterTrees(trees)

  return <MapApp trees={cleanedTrees} />
}
