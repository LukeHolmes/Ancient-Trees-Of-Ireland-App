'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { GeoJsonObject } from 'geojson'
import type { Tree } from '@/types/tree'
import { getBasemapConfig } from '@/lib/basemap'
import { placementPopupNote } from '@/lib/placementPopupNote'

const BROAD_TYPE_COLORS: Record<string, string> = {
  Oaks: '#8B6914',
  Beeches: '#A0522D',
  Ashes: '#6B8E4E',
  Pines: '#2D5A27',
  Cedars: '#4E7C59',
  Firs: '#3A6B3A',
  Spruces: '#2E5E2E',
  Chestnuts: '#9B6B3A',
  'Horse Chestnuts': '#C4943A',
  Maples: '#C4663A',
  'Plane Trees': '#8FAF8F',
  Birches: '#B8A882',
  Alders: '#5C7A5C',
  Willows: '#7AAF5C',
  'Southern Beeches': '#8B5E3C',
  'Monkey Puzzle': '#4A7C4A',
  Yews: '#1C4A2A',
  Hollies: '#2D6A4F',
  Elms: '#7A9A6A',
  Walnuts: '#7A5C3A',
  Larches: '#9A7A5C',
  Cypresses: '#4A6A4A',
  Redwoods: '#8B3A2A',
  Magnolias: '#C49AAA',
  Mulberries: '#6A2A5A',
  'Tree Ferns': '#3A7A5A',
}

function getBroadTypeColor(broadType: string): string {
  return BROAD_TYPE_COLORS[broadType] ?? '#4A7C59'
}

interface FlyControllerProps {
  flyTo: { lat: number; lng: number } | null
}

function FlyController({ flyTo }: FlyControllerProps) {
  const map = useMap()
  const prevFlyTo = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (
      flyTo &&
      (prevFlyTo.current?.lat !== flyTo.lat || prevFlyTo.current?.lng !== flyTo.lng)
    ) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        map.setView([flyTo.lat, flyTo.lng], 14)
      } else {
        map.flyTo([flyTo.lat, flyTo.lng], 14, { duration: 1.2 })
      }
      prevFlyTo.current = flyTo
    }
  }, [flyTo, map])

  return null
}

function CountyBoundariesLayer({ enabled }: { enabled: boolean }) {
  const [data, setData] = useState<GeoJsonObject | null>(null)

  useEffect(() => {
    if (!enabled || data) return
    fetch('/data/counties-roi.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json as GeoJsonObject)
      })
      .catch(() => {})
  }, [enabled, data])

  if (!enabled || !data) return null

  return (
    <GeoJSON
      data={data}
      style={{
        color: 'rgba(196, 148, 58, 0.55)',
        weight: 1,
        fillOpacity: 0,
      }}
    />
  )
}

interface MapViewProps {
  trees: Tree[]
  selectedId: string | null
  flyTo: { lat: number; lng: number } | null
  onSelectTree: (tree: Tree) => void
  showCountyBoundaries: boolean
}

export default function MapView({
  trees,
  selectedId,
  flyTo,
  onSelectTree,
  showCountyBoundaries,
}: MapViewProps) {
  const basemap = getBasemapConfig()

  return (
    <MapContainer
      center={[53.4, -7.9]}
      zoom={7}
      className={basemap.containerClassName}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer attribution={basemap.attribution} url={basemap.url} />
      <FlyController flyTo={flyTo} />
      <CountyBoundariesLayer enabled={showCountyBoundaries} />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
        {trees.map((tree) => {
          const isSelected = selectedId === tree.id
          const color = getBroadTypeColor(tree.broadType)
          const placementNote = placementPopupNote(tree)
          return (
            <CircleMarker
              key={tree.id}
              center={[tree.lat, tree.lng]}
              radius={isSelected ? 10 : 6}
              pathOptions={{
                fillColor: color,
                fillOpacity: isSelected ? 1 : 0.82,
                color: isSelected ? '#F5F0E8' : 'rgba(255,255,255,0.4)',
                weight: isSelected ? 2 : 1,
              }}
              eventHandlers={{ click: () => onSelectTree(tree) }}
            >
              <Popup>
                <div style={{ fontFamily: 'Georgia, serif', minWidth: 200 }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      color: '#F5F0E8',
                      marginBottom: 4,
                    }}
                  >
                    {tree.commonName || tree.taxonName || 'Unknown'}
                  </div>
                  {tree.taxonName && tree.taxonName !== tree.commonName && (
                    <div
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.8rem',
                        color: '#C4943A',
                        marginBottom: 6,
                      }}
                    >
                      {tree.taxonName}
                    </div>
                  )}
                  <div style={{ fontSize: '0.8rem', color: '#b8cfb8', marginBottom: 2 }}>
                    Site: {tree.siteName || 'Unknown site'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b8cfb8', marginBottom: 2 }}>
                    County: {tree.county}
                  </div>
                {placementNote && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#C4943A',
                      marginTop: 8,
                      lineHeight: 1.35,
                    }}
                  >
                    {placementNote}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#b8cfb8', marginTop: 8, opacity: 0.85 }}>
                  Open the sidebar for full heritage details.
                </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
