import type { TreeFields } from '@/types/tree'

export function placementPopupNote(tree: TreeFields): string | null {
  if (tree.placementConfidence === 'border') {
    return 'This site is on or near a county boundary; the heritage register county may differ from the map polygon.'
  }
  if (tree.placementConfidence === 'needs_review') {
    return 'Placement or county label may need verification against the original heritage record.'
  }
  return null
}
