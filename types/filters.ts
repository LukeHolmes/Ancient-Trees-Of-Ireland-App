export interface Filters {
  counties: string[]
  broadTypes: string[]
  commonNames: string[]
  ageRanges: string[]
  condition: string
}

export const DEFAULT_FILTERS: Filters = {
  counties: [],
  broadTypes: [],
  commonNames: [],
  ageRanges: [],
  condition: '',
}
