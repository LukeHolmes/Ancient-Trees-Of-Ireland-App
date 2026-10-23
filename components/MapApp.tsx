'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { Tree, TreeRecord } from '@/types/tree'
import type { Filters } from '@/types/filters'
import { DEFAULT_FILTERS } from '@/types/filters'
import { isMappableRecord } from '@/lib/trees'
import Header from '@/components/Header'
import StatsBar from '@/components/StatsBar'
import FilterPanel from '@/components/FilterPanel'
import TreeList from '@/components/TreeList'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

interface MapAppProps {
  records: TreeRecord[]
  mappableTrees: Tree[]
  awaitingCoordinates: number
}

function matchesFilters(record: TreeRecord, filters: Filters): boolean {
  if (filters.counties.length > 0 && !filters.counties.includes(record.county)) return false
  if (filters.broadTypes.length > 0 && !filters.broadTypes.includes(record.broadType)) return false
  if (filters.commonNames.length > 0 && !filters.commonNames.includes(record.commonName)) return false
  if (filters.ageRanges.length > 0 && !filters.ageRanges.includes(record.ageRange)) return false
  if (filters.condition && record.condition !== filters.condition) return false
  if (filters.mappableOnly && !isMappableRecord(record)) return false
  return true
}

export default function MapApp({ records, mappableTrees, awaitingCoordinates }: MapAppProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredRecords = useMemo(
    () => records.filter((t) => matchesFilters(t, filters)),
    [records, filters]
  )

  const filteredMappable = useMemo(() => {
    const ids = new Set(filteredRecords.map((r) => r.id))
    return mappableTrees.filter((t) => ids.has(t.id))
  }, [filteredRecords, mappableTrees])

  const handleSelectTree = useCallback((tree: TreeRecord) => {
    setSelectedId(tree.id)
    if (isMappableRecord(tree)) {
      setFlyTo({ lat: tree.lat, lng: tree.lng })
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0F2318' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto
          w-[340px] lg:w-[380px] flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#0F2318',
          borderRight: '1px solid rgba(196, 148, 58, 0.2)',
        }}
      >
        <Header totalCount={records.length} />
        <StatsBar
          filteredCount={filteredRecords.length}
          filteredMappableCount={filteredMappable.length}
          totalMappable={mappableTrees.length}
          awaitingCoordinates={awaitingCoordinates}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 pt-4 flex-shrink-0">
            <FilterPanel records={records} filters={filters} onChange={setFilters} />
          </div>
          <div
            className="mx-4 my-3 flex-shrink-0"
            style={{ height: '1px', background: 'rgba(196, 148, 58, 0.15)' }}
          />
          <TreeList
            records={filteredRecords}
            selectedId={selectedId}
            onSelect={handleSelectTree}
          />
        </div>
      </aside>

      <main className="flex-1 relative">
        <MapView
          trees={filteredMappable}
          selectedId={selectedId}
          flyTo={flyTo}
          onSelectTree={handleSelectTree}
          showCountyBoundaries={filters.showCountyBoundaries}
        />

        <button
          className="absolute top-4 left-4 z-10 lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
          style={{
            background: '#1C4A2A',
            border: '1px solid rgba(196, 148, 58, 0.5)',
            color: '#F5F0E8',
          }}
          onClick={() => setSidebarOpen(true)}
        >
          <span>Menu</span> Filters
        </button>
      </main>
    </div>
  )
}
