import type { Tree, TreeRecord } from '@/types/tree'

const IRELAND_BOUNDS = {
  minLat: 51.3,
  maxLat: 55.7,
  minLng: -10.9,
  maxLng: -5.1,
}

export function maybeSwapCoordinates(lat: number, lng: number) {
  if (lat > -11 && lat < -5 && lng > 51 && lng < 56) {
    return { lat: lng, lng: lat }
  }
  return { lat, lng }
}

export function hasNumericCoordinates(
  tree: TreeRecord
): tree is TreeRecord & { lat: number; lng: number } {
  return typeof tree.lat === 'number' && typeof tree.lng === 'number'
}

export function isMappableRecord(tree: TreeRecord): tree is Tree {
  if (!hasNumericCoordinates(tree)) return false
  const coords = maybeSwapCoordinates(tree.lat, tree.lng)
  if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return false
  if (coords.lat < IRELAND_BOUNDS.minLat || coords.lat > IRELAND_BOUNDS.maxLat) return false
  return coords.lng >= IRELAND_BOUNDS.minLng && coords.lng <= IRELAND_BOUNDS.maxLng
}

export function toMappableTree(tree: TreeRecord): Tree | null {
  if (!isMappableRecord(tree)) return null
  const coords = maybeSwapCoordinates(tree.lat, tree.lng)
  return { ...tree, lat: coords.lat, lng: coords.lng }
}

export function normalizeMappableTrees(trees: TreeRecord[]): Tree[] {
  return trees.map(toMappableTree).filter((t): t is Tree => t !== null)
}

export function countAwaitingCoordinates(trees: TreeRecord[]): number {
  return trees.filter((t) => !isMappableRecord(t)).length
}
