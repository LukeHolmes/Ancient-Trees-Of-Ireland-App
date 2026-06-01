'use client'

import type { Tree } from '@/types/tree'

interface StatsBarProps {
  trees: Tree[]
}

export default function StatsBar({ trees }: StatsBarProps) {
  const counties = new Set(trees.map((t) => t.county).filter(Boolean)).size
  const species = new Set(trees.map((t) => t.commonName).filter(Boolean)).size

  const stats = [
    { label: 'Trees shown', value: trees.length },
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
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="py-3 px-2 text-center"
          style={{
            borderRight:
              i < stats.length - 1
                ? '1px solid rgba(196, 148, 58, 0.15)'
                : undefined,
          }}
        >
          <div
            className="text-xl font-bold leading-none"
            style={{ color: '#C4943A', fontFamily: 'var(--font-playfair)' }}
          >
            {stat.value}
          </div>
          <div className="text-[10px] text-parchment/50 mt-1 uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}
