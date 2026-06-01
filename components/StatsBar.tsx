'use client'

import type { Tree } from '@/types/tree'

interface StatsBarProps {
  trees: Tree[]
}

export default function StatsBar({ trees }: StatsBarProps) {
  const counties = new Set(trees.map((tree) => tree.county).filter(Boolean)).size
  const species = new Set(trees.map((tree) => tree.commonName).filter(Boolean)).size

  const stats = [
    { label: 'Trees Shown', value: trees.length },
    { label: 'Counties', value: counties },
    { label: 'Species', value: species },
  ]

  return (
    <div
      className="grid grid-cols-3 flex-shrink-0"
      style={{
        borderBottom: '1px solid rgba(196, 148, 58, 0.2)',
        background: 'rgba(28, 74, 42, 0.4)',
      }}
    >
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="py-3 px-2 text-center"
          style={{
            borderRight:
              index < stats.length - 1
                ? '1px solid rgba(196, 148, 58, 0.15)'
                : undefined,
          }}
        >
          <div
            className="text-2xl font-bold leading-none"
            style={{ color: '#C4943A', fontFamily: 'var(--font-playfair)' }}
          >
            {stat.value}
          </div>
          <div className="text-xs text-parchment/60 mt-1 uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
