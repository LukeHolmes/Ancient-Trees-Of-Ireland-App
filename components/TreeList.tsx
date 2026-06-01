'use client'

import type { Tree } from '@/types/tree'

interface TreeListProps {
  trees: Tree[]
  selectedId: string | null
  onSelect: (tree: Tree) => void
}

export default function TreeList({ trees, selectedId, onSelect }: TreeListProps) {
  const displayed = trees.slice(0, 50)

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
        <span className="text-[10px] text-parchment/40">
          {trees.length > 50 ? `Showing 50 of ${trees.length}` : `${trees.length} trees`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
            <div className="text-4xl mb-3 opacity-40">🌲</div>
            <p className="text-sm text-parchment/40">No trees match your filters.</p>
            <p className="text-xs text-parchment/30 mt-1">Try clearing some filters.</p>
          </div>
        ) : (
          displayed.map((tree) => (
            <button
              key={tree.id}
              onClick={() => onSelect(tree)}
              className="w-full text-left px-4 py-3 transition-all duration-150"
              style={{
                borderBottom: '1px solid rgba(196, 148, 58, 0.08)',
                background:
                  selectedId === tree.id
                    ? 'rgba(196, 148, 58, 0.12)'
                    : 'transparent',
                borderLeft:
                  selectedId === tree.id
                    ? '3px solid #C4943A'
                    : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (selectedId !== tree.id) {
                  e.currentTarget.style.background = 'rgba(45, 106, 79, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedId !== tree.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div
                    className="font-bold text-sm text-parchment leading-tight truncate"
                    style={{ fontFamily: 'var(--font-playfair)' }}
                  >
                    {tree.commonName || tree.taxonName || 'Unknown Tree'}
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
          ))
        )}
      </div>
    </div>
  )
}
