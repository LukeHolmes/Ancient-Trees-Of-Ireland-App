'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Tree } from '@/types/tree'
import type { Filters } from '@/types/filters'
import { DEFAULT_FILTERS } from '@/types/filters'

interface FilterPanelProps {
  trees: Tree[]
  filters: Filters
  onChange: (filters: Filters) => void
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3
        className="text-xs font-semibold uppercase tracking-widest mb-2"
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
  onToggle: (val: string) => void
}) {
  return (
    <div
      className="overflow-y-auto rounded"
      style={{
        maxHeight: 160,
        background: 'rgba(15, 35, 24, 0.6)',
        border: '1px solid rgba(74, 124, 89, 0.3)',
      }}
    >
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-green-primary/40 transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="accent-amber w-3 h-3 flex-shrink-0"
          />
          <span className="text-xs text-parchment/80 truncate">{opt}</span>
        </label>
      ))}
    </div>
  )
}

export default function FilterPanel({ trees, filters, onChange }: FilterPanelProps) {
  const allCounties = useMemo(
    () => [...new Set(trees.map((t) => t.county).filter(Boolean))].sort(),
    [trees]
  )
  const allBroadTypes = useMemo(
    () => [...new Set(trees.map((t) => t.broadType).filter(Boolean))].sort(),
    [trees]
  )
  const allCommonNames = useMemo(
    () => [...new Set(trees.map((t) => t.commonName).filter(Boolean))].sort(),
    [trees]
  )
  const allAgeRanges = useMemo(
    () => [...new Set(trees.map((t) => t.ageRange).filter(Boolean))].sort(),
    [trees]
  )
  const allConditions = useMemo(
    () => ['', ...[...new Set(trees.map((t) => t.condition).filter(Boolean))].sort()],
    [trees]
  )

  const toggle = (
    key: 'counties' | 'broadTypes' | 'commonNames' | 'ageRanges',
    val: string
  ) => {
    const current = filters[key]
    const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val]
    onChange({ ...filters, [key]: next })
  }

  const clearAll = () => {
    onChange(DEFAULT_FILTERS)
  }

  const hasFilters =
    filters.counties.length > 0 ||
    filters.broadTypes.length > 0 ||
    filters.commonNames.length > 0 ||
    filters.ageRanges.length > 0 ||
    filters.condition !== ''

  return (
    <div
      className="py-4 flex-shrink-0 overflow-y-auto"
      style={{
        borderBottom: '1px solid rgba(196, 148, 58, 0.2)',
        maxHeight: 340,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: '#C4943A' }}
        >
          Filters
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] px-2 py-1 rounded transition-colors"
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

      <Section title="County">
        <MultiCheckList
          options={allCounties}
          selected={filters.counties}
          onToggle={(v) => toggle('counties', v)}
        />
      </Section>

      <Section title="Tree Type">
        <MultiCheckList
          options={allBroadTypes}
          selected={filters.broadTypes}
          onToggle={(v) => toggle('broadTypes', v)}
        />
      </Section>

      <Section title="Common Name">
        <MultiCheckList
          options={allCommonNames}
          selected={filters.commonNames}
          onToggle={(v) => toggle('commonNames', v)}
        />
      </Section>

      <Section title="Age Range">
        <MultiCheckList
          options={allAgeRanges}
          selected={filters.ageRanges}
          onToggle={(v) => toggle('ageRanges', v)}
        />
      </Section>

      <Section title="Condition">
        <select
          value={filters.condition}
          onChange={(e) => onChange({ ...filters, condition: e.target.value })}
          className="w-full rounded px-3 py-2 text-xs outline-none"
          style={{
            background: 'rgba(15, 35, 24, 0.6)',
            border: '1px solid rgba(74, 124, 89, 0.3)',
            color: '#F5F0E8',
          }}
        >
          {allConditions.map((c) => (
            <option key={c} value={c} style={{ background: '#1C4A2A' }}>
              {c === '' ? 'All conditions' : c}
            </option>
          ))}
        </select>
      </Section>
    </div>
  )
}
