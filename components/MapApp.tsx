'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { FilterOptions, Filters, TourKey, Tree } from '@/types/tree'
import Header from '@/components/Header'
import StatsBar from '@/components/StatsBar'
import FilterPanel from '@/components/FilterPanel'
import TreeList from '@/components/TreeList'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

const DEFAULT_FILTERS: Filters = {
  counties: [],
  broadTypes: [],
  ageRanges: [],
  condition: '',
}

interface TourPreset {
  key: TourKey
  label: string
  description: string
  buildFilters: (rows: Tree[]) => Filters
}

interface TourSummary {
  key: TourKey
  label: string
  description: string
}

interface MapAppProps {
  trees: Tree[]
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function parseAgeLowerBound(ageRange: string): number {
  const match = ageRange.match(/\d+/)
  return match ? Number(match[0]) : -1
}

function sortAgeRanges(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const aMin = parseAgeLowerBound(a)
    const bMin = parseAgeLowerBound(b)
    if (aMin !== bMin) {
      return aMin - bMin
    }
    return a.localeCompare(b)
  })
}

function filterTrees(rows: Tree[], filters: Filters): Tree[] {
  return rows.filter((tree) => {
    if (filters.counties.length > 0 && !filters.counties.includes(tree.county)) return false
    if (filters.broadTypes.length > 0 && !filters.broadTypes.includes(tree.broadType)) return false
    if (filters.ageRanges.length > 0 && !filters.ageRanges.includes(tree.ageRange)) return false
    if (filters.condition && tree.condition !== filters.condition) return false
    return true
  })
}

function buildFilterOptions(rows: Tree[], filters: Filters): FilterOptions {
  const counties = uniqueSorted(
    filterTrees(rows, { ...filters, counties: [] }).map((tree) => tree.county)
  )
  const broadTypes = uniqueSorted(
    filterTrees(rows, { ...filters, broadTypes: [] }).map((tree) => tree.broadType)
  )
  const ageRanges = sortAgeRanges(
    uniqueSorted(filterTrees(rows, { ...filters, ageRanges: [] }).map((tree) => tree.ageRange))
  )
  const conditions = uniqueSorted(
    filterTrees(rows, { ...filters, condition: '' }).map((tree) => tree.condition)
  )

  return { counties, broadTypes, ageRanges, conditions }
}

function sanitizeFilters(filters: Filters, options: FilterOptions): Filters {
  const countySet = new Set(options.counties)
  const broadTypeSet = new Set(options.broadTypes)
  const ageSet = new Set(options.ageRanges)
  const conditionSet = new Set(options.conditions)

  return {
    counties: filters.counties.filter((value) => countySet.has(value)),
    broadTypes: filters.broadTypes.filter((value) => broadTypeSet.has(value)),
    ageRanges: filters.ageRanges.filter((value) => ageSet.has(value)),
    condition: conditionSet.has(filters.condition) ? filters.condition : '',
  }
}

function isSameFilterState(a: Filters, b: Filters): boolean {
  if (a.condition !== b.condition) return false
  if (a.counties.length !== b.counties.length) return false
  if (a.broadTypes.length !== b.broadTypes.length) return false
  if (a.ageRanges.length !== b.ageRanges.length) return false
  if (a.counties.some((value, i) => value !== b.counties[i])) return false
  if (a.broadTypes.some((value, i) => value !== b.broadTypes[i])) return false
  if (a.ageRanges.some((value, i) => value !== b.ageRanges[i])) return false
  return true
}

export default function MapApp({ trees }: MapAppProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const availableOptions = useMemo(() => buildFilterOptions(trees, filters), [trees, filters])

  useEffect(() => {
    setFilters((current) => {
      const sanitized = sanitizeFilters(current, availableOptions)
      return isSameFilterState(current, sanitized) ? current : sanitized
    })
  }, [availableOptions])

  const filtered = useMemo(() => filterTrees(trees, filters), [trees, filters])

  const tours = useMemo<TourPreset[]>(() => {
    const ageRanges = sortAgeRanges(uniqueSorted(trees.map((tree) => tree.ageRange)))
    const oldestRanges = ageRanges.filter((value) => parseAgeLowerBound(value) >= 300)

    const broadTypeCounts = trees.reduce<Record<string, number>>((acc, tree) => {
      if (!tree.broadType) return acc
      acc[tree.broadType] = (acc[tree.broadType] ?? 0) + 1
      return acc
    }, {})
    const rareTypes = Object.entries(broadTypeCounts)
      .filter(([_, count]) => count <= 3)
      .map(([type]) => type)
      .sort((a, b) => a.localeCompare(b))

    return [
      {
        key: 'oldest',
        label: 'Oldest Giants',
        description: 'Jump to trees in the oldest age bands.',
        buildFilters: () => ({ ...DEFAULT_FILTERS, ageRanges: oldestRanges }),
      },
      {
        key: 'rare-types',
        label: 'Rare Type Hunt',
        description: 'Surface uncommon broad types across Ireland.',
        buildFilters: () => ({ ...DEFAULT_FILTERS, broadTypes: rareTypes }),
      },
      {
        key: 'legendary-oaks',
        label: 'Legendary Oaks',
        description: 'Focus on older oak records.',
        buildFilters: () => ({
          ...DEFAULT_FILTERS,
          broadTypes: ['Oaks'],
          ageRanges: oldestRanges,
        }),
      },
    ]
  }, [trees])

  const handleSelectTree = useCallback((tree: Tree) => {
    setSelectedId(tree.id)
    setFlyTo({ lat: tree.lat, lng: tree.lng })
  }, [])

  const handleApplyTour = useCallback(
    (tourKey: TourKey) => {
      const matchedTour = tours.find((tour) => tour.key === tourKey)
      if (!matchedTour) return
      const next = matchedTour.buildFilters(trees)
      const safeNext = sanitizeFilters(next, buildFilterOptions(trees, next))
      setFilters(safeNext)
      setSelectedId(null)
      if (sidebarOpen) {
        setSidebarOpen(false)
      }
    },
    [sidebarOpen, trees, tours]
  )

  const tourSummaries = useMemo<TourSummary[]>(
    () => tours.map(({ key, label, description }) => ({ key, label, description })),
    [tours]
  )

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
          w-[350px] lg:w-[400px] flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#0F2318',
          borderRight: '1px solid rgba(196, 148, 58, 0.2)',
        }}
      >
        <Header totalCount={trees.length} />
        <StatsBar trees={filtered} />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 pt-4 flex-shrink-0">
            <FilterPanel
              filters={filters}
              options={availableOptions}
              tours={tourSummaries}
              onApplyTour={handleApplyTour}
              onChange={setFilters}
            />
          </div>
          <div
            className="mx-4 my-3 flex-shrink-0"
            style={{ height: '1px', background: 'rgba(196, 148, 58, 0.15)' }}
          />
          <TreeList trees={filtered} selectedId={selectedId} onSelect={handleSelectTree} />
        </div>
      </aside>

      <main className="flex-1 relative">
        <MapView
          trees={filtered}
          selectedId={selectedId}
          flyTo={flyTo}
          onSelectTree={handleSelectTree}
        />

        <button
          className="absolute top-4 left-4 z-10 lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
          style={{
            background: '#1C4A2A',
            border: '1px solid rgba(196, 148, 58, 0.5)',
            color: '#F5F0E8',
          }}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open filters"
        >
          <span>Map</span> Filters
        </button>
      </main>
    </div>
  )
}
