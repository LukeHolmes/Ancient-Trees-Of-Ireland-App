'use client'

interface StatsBarProps {
  filteredCount: number
  filteredMappableCount: number
  totalMappable: number
  awaitingCoordinates: number
}

export default function StatsBar({
  filteredCount,
  filteredMappableCount,
  totalMappable,
  awaitingCoordinates,
}: StatsBarProps) {
  const stats = [
    { label: 'Results', value: filteredCount },
    { label: 'On map', value: `${filteredMappableCount}` },
    { label: 'Awaiting coords', value: awaitingCoordinates },
  ]

  return (
    <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(196, 148, 58, 0.2)' }}>
      <div
        className="grid grid-cols-3"
        style={{ background: 'rgba(28, 74, 42, 0.4)' }}
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
      <p className="text-[10px] text-center text-parchment/40 py-1.5 px-3">
        {totalMappable} heritage trees have map coordinates · {awaitingCoordinates} need site
        coordinates
      </p>
    </div>
  )
}
