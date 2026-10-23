import type { Filters } from '@/types/filters'
import { DEFAULT_FILTERS } from '@/types/filters'

function splitList(value: string | null): string[] {
  if (!value) return []
  return value.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean)
}

function joinList(values: string[]): string | null {
  if (values.length === 0) return null
  return values.map((v) => encodeURIComponent(v)).join(',')
}

export function filtersFromSearchParams(params: URLSearchParams): Filters {
  return {
    counties: splitList(params.get('county')),
    broadTypes: splitList(params.get('type')),
    commonNames: splitList(params.get('species')),
    ageRanges: splitList(params.get('age')),
    condition: params.get('condition') ?? '',
    searchQuery: params.get('q') ?? '',
    mappableOnly: params.get('all') !== '1',
    showCountyBoundaries: params.get('boundaries') === '1',
  }
}

export function searchParamsFromState(
  filters: Filters,
  selectedId: string | null
): URLSearchParams {
  const params = new URLSearchParams()

  const county = joinList(filters.counties)
  if (county) params.set('county', county)
  const type = joinList(filters.broadTypes)
  if (type) params.set('type', type)
  const species = joinList(filters.commonNames)
  if (species) params.set('species', species)
  const age = joinList(filters.ageRanges)
  if (age) params.set('age', age)
  if (filters.condition) params.set('condition', filters.condition)
  if (filters.searchQuery.trim()) params.set('q', filters.searchQuery.trim())
  if (!filters.mappableOnly) params.set('all', '1')
  if (filters.showCountyBoundaries) params.set('boundaries', '1')
  if (selectedId) params.set('tree', selectedId)

  return params
}

export function selectedTreeIdFromParams(params: URLSearchParams): string | null {
  return params.get('tree')
}

export function searchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {
  const keys = new Set([...a.keys(), ...b.keys()])
  for (const key of keys) {
    if (a.get(key) !== b.get(key)) return false
  }
  return true
}

export function isDefaultFilters(filters: Filters): boolean {
  return (
    filters.counties.length === 0 &&
    filters.broadTypes.length === 0 &&
    filters.commonNames.length === 0 &&
    filters.ageRanges.length === 0 &&
    filters.condition === '' &&
    filters.searchQuery.trim() === '' &&
    filters.mappableOnly === DEFAULT_FILTERS.mappableOnly &&
    filters.showCountyBoundaries === DEFAULT_FILTERS.showCountyBoundaries
  )
}
