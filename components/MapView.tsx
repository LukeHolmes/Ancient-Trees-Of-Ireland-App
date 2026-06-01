'use client'

import { useEffect, useRef } from 'react'
import L, { type DivIcon } from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import type { Tree } from '@/types/tree'

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
  Other: '#4A7C59',
}

function getBroadTypeColor(broadType: string): string {
  return BROAD_TYPE_COLORS[broadType] ?? '#4A7C59'
}

function markerIcon(color: string, selected: boolean): DivIcon {
  const size = selected ? 16 : 12
  const border = selected ? '#F5F0E8' : 'rgba(255, 255, 255, 0.45)'

  return L.divIcon({
    className: 'tree-marker-wrapper',
    html: `<span class="tree-marker-dot" style="width:${size}px;height:${size}px;background:${color};border-color:${border};"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createClusterIcon(cluster: any): DivIcon {
  const count = cluster.getChildCount()
  let size = 40
  if (count >= 10) size = 46
  if (count >= 25) size = 54
  if (count >= 50) size = 60

  return L.divIcon({
    html: `<div class="tree-cluster" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
    className: 'tree-cluster-wrapper',
    iconSize: [size, size],
  })
}

interface FlyControllerProps {
  flyTo: { lat: number; lng: number } | null
}

function FlyController({ flyTo }: FlyControllerProps) {
  const map = useMap()
  const previous = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!flyTo) return
    if (previous.current?.lat === flyTo.lat && previous.current?.lng === flyTo.lng) return

    map.flyTo([flyTo.lat, flyTo.lng], 14, { duration: 1.1 })
    previous.current = flyTo
  }, [flyTo, map])

  return null
}

interface MapViewProps {
  trees: Tree[]
  selectedId: string | null
  flyTo: { lat: number; lng: number } | null
  onSelectTree: (tree: Tree) => void
}

export default function MapView({ trees, selectedId, flyTo, onSelectTree }: MapViewProps) {
  return (
    <MapContainer
      center={[53.4, -7.9]}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      preferCanvas={true}
      minZoom={6}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
      />

      <FlyController flyTo={flyTo} />

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={45}
        iconCreateFunction={createClusterIcon}
      >
        {trees.map((tree) => {
          const isSelected = selectedId === tree.id
          const color = getBroadTypeColor(tree.broadType)

          return (
            <Marker
              key={tree.id}
              position={[tree.lat, tree.lng]}
              icon={markerIcon(color, isSelected)}
              eventHandlers={{ click: () => onSelectTree(tree) }}
            >
              <Popup>
                <div style={{ fontFamily: 'Georgia, serif', minWidth: 220 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: '#F5F0E8',
                      marginBottom: 4,
                    }}
                  >
                    {tree.commonName || tree.taxonName || 'Unknown tree'}
                  </div>
                  {tree.taxonName && tree.taxonName !== tree.commonName && (
                    <div
                      style={{
                        fontStyle: 'italic',
                        fontSize: '0.82rem',
                        color: '#C4943A',
                        marginBottom: 6,
                      }}
                    >
                      {tree.taxonName}
                    </div>
                  )}
                  <div style={{ fontSize: '0.82rem', color: '#b8cfb8', marginBottom: 2 }}>
                    Site: {tree.siteName || 'Unknown site'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#b8cfb8', marginBottom: 2 }}>
                    County: {tree.county || 'Unknown'}
                  </div>
                  {tree.ageRange && (
                    <div style={{ fontSize: '0.82rem', color: '#b8cfb8', marginBottom: 2 }}>
                      Age: {tree.ageRange}
                    </div>
                  )}
                  {tree.condition && (
                    <div style={{ fontSize: '0.82rem', color: '#b8cfb8' }}>
                      Condition: {tree.condition}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
