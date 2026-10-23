export interface Filters {
  counties: string[]
  broadTypes: string[]
  commonNames: string[]
  ageRanges: string[]
  condition: string
  /** When true, hide records without map coordinates from the results list */
  mappableOnly: boolean
  showCountyBoundaries: boolean
}

export const DEFAULT_FILTERS: Filters = {
  counties: [],
  broadTypes: [],
  commonNames: [],
  ageRanges: [],
  condition: '',
  mappableOnly: true,
  showCountyBoundaries: false,
}
