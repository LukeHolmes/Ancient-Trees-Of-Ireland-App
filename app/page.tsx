import { promises as fs } from 'fs'
import path from 'path'
import type { Tree, TreeRecord } from '@/types/tree'
import MapApp from '@/components/MapApp'

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

function hasNumericCoordinates(tree: TreeRecord): tree is TreeRecord & { lat: number; lng: number } {
  return typeof tree.lat === 'number' && typeof tree.lng === 'number'
}

function normalizeAndFilterTrees(trees: TreeRecord[]): Tree[] {
  return trees
    .filter(hasNumericCoordinates)
    .map((tree) => {
      const coords = maybeSwapCoordinates(tree.lat, tree.lng)
      return { ...tree, lat: coords.lat, lng: coords.lng }
    })
    .filter((tree) => {
      if (!Number.isFinite(tree.lat) || !Number.isFinite(tree.lng)) return false
      if (tree.lat < IRELAND_BOUNDS.minLat || tree.lat > IRELAND_BOUNDS.maxLat) return false
      return tree.lng >= IRELAND_BOUNDS.minLng && tree.lng <= IRELAND_BOUNDS.maxLng
    })
}

export default async function Home() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'trees.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const trees: TreeRecord[] = JSON.parse(raw)
  const cleanedTrees = normalizeAndFilterTrees(trees)

  return <MapApp trees={cleanedTrees} />
}
