export type CoordinateStatus = 'site_geocoded' | 'needs_site_coordinates'

export type PlacementConfidence = 'verified' | 'border' | 'needs_review'

export type GeocodeSource = 'heritage_register' | 'nominatim' | 'manual'

export interface TreeFields {
  id: string
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
  coordinateStatus?: CoordinateStatus
  placementConfidence?: PlacementConfidence
  geocodeSource?: GeocodeSource
  /** ISO date (YYYY-MM-DD) of last placement review */
  verifiedAt?: string
}

export interface Tree extends TreeFields {
  lat: number
  lng: number
}

export type TreeRecord = TreeFields & {
  lat: number | null
  lng: number | null
}
