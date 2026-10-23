'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Tree, TreeRecord } from '@/types/tree'
import type { Filters } from '@/types/filters'
import { isMappableRecord } from '@/lib/trees'
import { matchesFilters } from '@/lib/filterRecords'
import {
  filtersFromSearchParams,
  searchParamsEqual,
  searchParamsFromState,
  selectedTreeIdFromParams,
} from '@/lib/urlState'
import Header from '@/components/Header'
import StatsBar from '@/components/StatsBar'
import FilterPanel from '@/components/FilterPanel'
import TreeList from '@/components/TreeList'
import TreeDetailPanel from '@/components/TreeDetailPanel'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

interface MapAppProps {
  records: TreeRecord[]
  mappableTrees: Tree[]
  awaitingCoordinates: number
}

export default function MapApp({ records, mappableTrees, awaitingCoordinates }: MapAppProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hydratedFromUrl = useRef(false)

  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromSearchParams(new URLSearchParams(searchParams.toString()))
  )
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    selectedTreeIdFromParams(new URLSearchParams(searchParams.toString()))
  )
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (hydratedFromUrl.current) return
    hydratedFromUrl.current = true
    const id = selectedTreeIdFromParams(new URLSearchParams(searchParams.toString()))
    if (!id) return
    const record = records.find((r) => r.id === id)
    if (record && isMappableRecord(record)) {
      setFlyTo({ lat: record.lat, lng: record.lng })
    }
  }, [records, searchParams])

  useEffect(() => {
    const params = searchParamsFromState(filters, selectedId)
    const current = new URLSearchParams(searchParams.toString())
    if (searchParamsEqual(params, current)) return
    const next = params.toString()
    const url = next ? `${pathname}?${next}` : pathname
    router.replace(url, { scroll: false })
  }, [filters, selectedId, pathname, router, searchParams])

  const filteredRecords = useMemo(
    () => records.filter((t) => matchesFilters(t, filters)),
    [records, filters]
  )

  const filteredMappable = useMemo(() => {
    const ids = new Set(filteredRecords.map((r) => r.id))
    return mappableTrees.filter((t) => ids.has(t.id))
  }, [filteredRecords, mappableTrees])

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId]
  )

  const handleSelectTree = useCallback((tree: TreeRecord) => {
    setSelectedId(tree.id)
    if (isMappableRecord(tree)) {
      setFlyTo({ lat: tree.lat, lng: tree.lng })
    }
  }, [])

  const handleCopyLink = useCallback(async () => {
    if (!selectedId) return
    const params = searchParamsFromState(filters, selectedId)
    const url = `${window.location.origin}${pathname}?${params.toString()}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }, [filters, pathname, selectedId])

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
          <TreeDetailPanel
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
            onCopyLink={handleCopyLink}
          />
          {linkCopied && (
            <p className="text-[10px] text-center text-amber px-4 -mt-1 mb-1">Link copied</p>
          )}
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
