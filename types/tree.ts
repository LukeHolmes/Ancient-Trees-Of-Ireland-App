export interface Tree {
  id: string
  lat: number
  lng: number
  commonName: string
  taxonName: string
  siteName: string
  county: string
  broadType: string
  heritageType: string
  category: string
  form: string
  condition: string
  ageRange: string
  evidence: string
}

export interface Filters {
  counties: string[]
  broadTypes: string[]
  ageRanges: string[]
  condition: string
}

export interface FilterOptions {
  counties: string[]
  broadTypes: string[]
  ageRanges: string[]
  conditions: string[]
}

export type TourKey = 'oldest' | 'rare-types' | 'legendary-oaks'
