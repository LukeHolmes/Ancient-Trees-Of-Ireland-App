'use client'

import type { FilterOptions, Filters, TourKey } from '@/types/tree'

interface TourSummary {
  key: TourKey
  label: string
  description: string
}

interface FilterPanelProps {
  filters: Filters
  options: FilterOptions
  tours: TourSummary[]
  onApplyTour: (tourKey: TourKey) => void
  onChange: (filters: Filters) => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3
        className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-2"
        style={{ color: '#C4943A' }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function MultiCheckList({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  if (options.length === 0) {
    return (
      <div
        className="rounded px-3 py-2 text-xs"
        style={{
          background: 'rgba(15, 35, 24, 0.6)',
          border: '1px solid rgba(74, 124, 89, 0.3)',
          color: 'rgba(245, 240, 232, 0.55)',
        }}
      >
        No options with current filters.
      </div>
    )
  }

  return (
    <div
      className="overflow-y-auto rounded"
      style={{
        maxHeight: 150,
        background: 'rgba(15, 35, 24, 0.6)',
        border: '1px solid rgba(74, 124, 89, 0.3)',
      }}
    >
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-green-primary/40 transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="accent-amber w-4 h-4 flex-shrink-0"
          />
          <span className="text-sm text-parchment/85 truncate">{option}</span>
        </label>
      ))}
    </div>
  )
}

export default function FilterPanel({
  filters,
  options,
  tours,
  onApplyTour,
  onChange,
}: FilterPanelProps) {
  const toggle = (key: 'counties' | 'broadTypes' | 'ageRanges', value: string) => {
    const current = filters[key]
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]
    onChange({ ...filters, [key]: next })
  }

  const clearAll = () => {
    onChange({ counties: [], broadTypes: [], ageRanges: [], condition: '' })
  }

  const hasFilters =
    filters.counties.length > 0 ||
    filters.broadTypes.length > 0 ||
    filters.ageRanges.length > 0 ||
    filters.condition !== ''

  return (
    <div
      className="px-4 py-4 flex-shrink-0 overflow-y-auto"
      style={{
        borderBottom: '1px solid rgba(196, 148, 58, 0.2)',
        maxHeight: 430,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: '#C4943A' }}
        >
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs px-2 py-1 rounded transition-colors"
            style={{
              color: '#C4943A',
              border: '1px solid rgba(196, 148, 58, 0.4)',
              background: 'rgba(196, 148, 58, 0.08)',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <Section title="Remarkable Tours">
        <div className="grid gap-2">
          {tours.map((tour) => (
            <button
              key={tour.key}
              onClick={() => onApplyTour(tour.key)}
              className="text-left px-3 py-2 rounded transition-colors"
              style={{
                border: '1px solid rgba(196, 148, 58, 0.35)',
                background: 'rgba(196, 148, 58, 0.08)',
              }}
            >
              <div className="text-sm font-semibold text-parchment">{tour.label}</div>
              <div className="text-xs text-parchment/65 mt-0.5">{tour.description}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="County">
        <MultiCheckList
          options={options.counties}
          selected={filters.counties}
          onToggle={(value) => toggle('counties', value)}
        />
      </Section>

      <Section title="Tree Type">
        <MultiCheckList
          options={options.broadTypes}
          selected={filters.broadTypes}
          onToggle={(value) => toggle('broadTypes', value)}
        />
      </Section>

      <Section title="Age Range">
        <MultiCheckList
          options={options.ageRanges}
          selected={filters.ageRanges}
          onToggle={(value) => toggle('ageRanges', value)}
        />
      </Section>

      <Section title="Condition">
        <select
          value={filters.condition}
          onChange={(event) => onChange({ ...filters, condition: event.target.value })}
          className="w-full rounded px-3 py-2 text-sm outline-none"
          style={{
            background: 'rgba(15, 35, 24, 0.6)',
            border: '1px solid rgba(74, 124, 89, 0.3)',
            color: '#F5F0E8',
          }}
        >
          <option value="" style={{ background: '#1C4A2A' }}>
            All conditions
          </option>
          {options.conditions.map((condition) => (
            <option key={condition} value={condition} style={{ background: '#1C4A2A' }}>
              {condition}
            </option>
          ))}
        </select>
      </Section>
    </div>
  )
}
