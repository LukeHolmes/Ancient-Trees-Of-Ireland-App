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
  isDefaultFilters,
  searchParamsEqual,
  searchParamsFromState,
  selectedTreeIdFromParams,
} from '@/lib/urlState'
import { DEFAULT_FILTERS } from '@/types/filters'
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(true)
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
  const hasActiveFilters = useMemo(() => !isDefaultFilters(filters), [filters])

  const handleSelectTree = useCallback((tree: TreeRecord) => {
    setSelectedId(tree.id)
    if (isMappableRecord(tree)) {
      setFlyTo({ lat: tree.lat, lng: tree.lng })
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(true)
    }
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS })
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
      <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-3 focus-within:left-3 focus-within:z-[1300] flex gap-2">
        <a
          href="#visitor-filters"
          className="rounded-full px-3 py-2 text-xs font-semibold text-parchment"
          style={{ background: '#1C4A2A', border: '1px solid rgba(196, 148, 58, 0.45)' }}
        >
          Skip to filters
        </a>
        <a
          href="#visitor-map"
          className="rounded-full px-3 py-2 text-xs font-semibold text-parchment"
          style={{ background: '#1C4A2A', border: '1px solid rgba(196, 148, 58, 0.45)' }}
        >
          Skip to map
        </a>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[1300] lg:z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-[1400] lg:z-auto
          w-full max-w-[380px] lg:max-w-none lg:w-[380px] flex flex-col h-full
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
          <div className="lg:hidden px-4 pt-4 pb-2 flex items-center justify-between gap-3 flex-shrink-0">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber/80">Menu</p>
              <p className="text-xs text-parchment/60">Search, filters, tree list, and details</p>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full px-3 py-2 text-xs font-semibold text-parchment"
              style={{
                background: 'rgba(28, 74, 42, 0.7)',
                border: '1px solid rgba(196, 148, 58, 0.45)',
              }}
            >
              Close
            </button>
          </div>
          <TreeDetailPanel
            record={selectedRecord}
            onClose={() => setSelectedId(null)}
            onCopyLink={handleCopyLink}
          />
          {linkCopied && (
            <p
              role="status"
              aria-live="polite"
              className="text-[10px] text-center text-amber px-4 -mt-1 mb-1"
            >
              Link copied
            </p>
          )}
          <div id="visitor-filters" className="px-4 pt-2 lg:pt-1 flex-shrink-0">
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
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        </div>
      </aside>

      <main id="visitor-map" className="flex-1 relative" aria-label="Map of heritage trees">
        <MapView
          trees={filteredMappable}
          selectedId={selectedId}
          flyTo={flyTo}
          onSelectTree={handleSelectTree}
          showCountyBoundaries={filters.showCountyBoundaries}
        />

        {!sidebarOpen && (
          <button
            type="button"
            className="absolute left-1/2 -translate-x-1/2 bottom-6 z-[1200] lg:hidden flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold shadow-2xl"
            style={{
              background: '#1C4A2A',
              border: '1px solid rgba(196, 148, 58, 0.5)',
              color: '#F5F0E8',
            }}
            onClick={() => setSidebarOpen(true)}
            aria-label={`Browse ${filteredRecords.length} matching trees and open filters`}
          >
            <span>Browse trees</span>
            <span
              className="inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-[11px]"
              style={{ background: 'rgba(196, 148, 58, 0.18)', color: '#C4943A' }}
            >
              {filteredRecords.length}
            </span>
          </button>
        )}

        <div
          className="hidden md:block absolute left-4 bottom-4 max-w-xs z-[900] rounded-2xl px-4 py-3 pointer-events-none"
          style={{
            background: 'rgba(15, 35, 24, 0.84)',
            border: '1px solid rgba(196, 148, 58, 0.28)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber/80">How to explore</p>
          <p className="mt-1 text-xs leading-relaxed text-parchment/75">
            Search by tree name, site, county, or species. Tap clusters to zoom closer, then open a
            marker or list result for the full heritage notes and a shareable tree link.
          </p>
        </div>
      </main>
    </div>
  )
}
