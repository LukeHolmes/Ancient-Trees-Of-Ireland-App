'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { TreeRecord } from '@/types/tree'
import { isMappableRecord } from '@/lib/trees'
import PlacementBadge from '@/components/PlacementBadge'

interface TreeListProps {
  records: TreeRecord[]
  selectedId: string | null
  onSelect: (tree: TreeRecord) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

const ROW_HEIGHT = 100

export default function TreeList({
  records,
  selectedId,
  onSelect,
  hasActiveFilters,
  onClearFilters,
}: TreeListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="px-4 py-2 flex-shrink-0 flex items-center justify-between"
        style={{
          borderBottom: '1px solid rgba(196, 148, 58, 0.15)',
          background: 'rgba(15, 35, 24, 0.4)',
        }}
      >
        <span className="text-[10px] uppercase tracking-widest text-parchment/40">
          Results
        </span>
        <span className="text-[10px] text-parchment/40">{records.length} trees</span>
      </div>

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
            <div className="text-4xl mb-3 opacity-40">Tree</div>
            <p className="text-sm text-parchment/50">No trees match this search and filter combination.</p>
            <p className="text-xs text-parchment/30 mt-1">Try clearing a few filters or broadening the search.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 rounded-full px-3 py-2 text-xs font-semibold text-amber"
                style={{
                  border: '1px solid rgba(196, 148, 58, 0.4)',
                  background: 'rgba(196, 148, 58, 0.08)',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const tree = records[virtualRow.index]
              const mappable = isMappableRecord(tree)
              return (
                <button
                  key={tree.id}
                  type="button"
                  disabled={!mappable}
                  onClick={() => onSelect(tree)}
                  aria-pressed={selectedId === tree.id}
                  className="absolute left-0 w-full text-left px-4 py-4 transition-all duration-150 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/70 focus-visible:ring-inset"
                  style={{
                    top: 0,
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    borderBottom: '1px solid rgba(196, 148, 58, 0.08)',
                    background:
                      selectedId === tree.id
                        ? 'rgba(196, 148, 58, 0.12)'
                        : 'transparent',
                    borderLeft:
                      selectedId === tree.id
                        ? '3px solid #C4943A'
                        : '3px solid transparent',
                    cursor: mappable ? 'pointer' : 'default',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className="font-bold text-sm text-parchment leading-tight truncate"
                          style={{ fontFamily: 'var(--font-playfair)' }}
                        >
                          {tree.commonName || tree.taxonName || 'Unknown Tree'}
                        </div>
                        <PlacementBadge
                          confidence={tree.placementConfidence}
                          awaitingCoordinates={!mappable}
                        />
                      </div>
                      {tree.siteName && (
                        <div
                          className="text-xs mt-0.5 truncate"
                          style={{ color: '#C4943A', fontStyle: 'italic' }}
                        >
                          {tree.siteName}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {tree.county && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(45, 106, 79, 0.4)',
                              border: '1px solid rgba(74, 124, 89, 0.4)',
                              color: '#F5F0E8',
                            }}
                          >
                            {tree.county}
                          </span>
                        )}
                        {tree.broadType && (
                          <span className="text-[10px] text-parchment/40 truncate">
                            {tree.broadType}
                          </span>
                        )}
                      </div>
                    </div>
                    {tree.ageRange && (
                      <div className="flex-shrink-0 text-right">
                        <span className="text-[10px] text-parchment/40 leading-tight block">
                          {tree.ageRange}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
