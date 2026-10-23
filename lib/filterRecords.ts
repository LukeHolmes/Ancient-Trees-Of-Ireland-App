import type { TreeRecord } from '@/types/tree'
import type { Filters } from '@/types/filters'
import { isMappableRecord } from '@/lib/trees'

function matchesSearch(record: TreeRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    record.commonName,
    record.taxonName,
    record.siteName,
    record.county,
    record.broadType,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function matchesFilters(record: TreeRecord, filters: Filters): boolean {
  if (!matchesSearch(record, filters.searchQuery)) return false
  if (filters.counties.length > 0 && !filters.counties.includes(record.county)) return false
  if (filters.broadTypes.length > 0 && !filters.broadTypes.includes(record.broadType)) return false
  if (filters.commonNames.length > 0 && !filters.commonNames.includes(record.commonName)) return false
  if (filters.ageRanges.length > 0 && !filters.ageRanges.includes(record.ageRange)) return false
  if (filters.condition && record.condition !== filters.condition) return false
  if (filters.mappableOnly && !isMappableRecord(record)) return false
  return true
}
