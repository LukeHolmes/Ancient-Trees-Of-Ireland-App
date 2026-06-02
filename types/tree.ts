export type CoordinateStatus = 'site_geocoded' | 'needs_site_coordinates'

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
  coordinateStatus?: CoordinateStatus
}

export type TreeRecord = Omit<Tree, 'lat' | 'lng'> & {
  lat: number | null
  lng: number | null
}
