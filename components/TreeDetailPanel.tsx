'use client'

import type { TreeRecord } from '@/types/tree'
import PlacementBadge from '@/components/PlacementBadge'
import { isMappableRecord } from '@/lib/trees'

interface TreeDetailPanelProps {
  record: TreeRecord | null
  onClose: () => void
  onCopyLink: () => void
}

function DetailRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null
  return (
    <div className="py-1.5 border-b border-white/5 last:border-0">
      <div className="text-[10px] uppercase tracking-wider text-parchment/45">{label}</div>
      <div className="text-xs text-parchment/90 mt-0.5 leading-relaxed">{value}</div>
    </div>
  )
}

export default function TreeDetailPanel({ record, onClose, onCopyLink }: TreeDetailPanelProps) {
  if (!record) {
    return (
      <div
        className="mx-4 mb-3 flex-shrink-0 rounded-lg overflow-hidden"
        style={{
          background: 'rgba(28, 74, 42, 0.35)',
          border: '1px solid rgba(196, 148, 58, 0.18)',
        }}
      >
        <div className="px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber/80">Selected tree</p>
          <p className="mt-2 text-sm text-parchment/75 leading-relaxed">
            Choose a tree from the list or tap a map marker to open its heritage notes, location,
            and a shareable link.
          </p>
        </div>
      </div>
    )
  }

  const mappable = isMappableRecord(record)

  return (
    <div
      className="mx-4 mb-3 flex-shrink-0 rounded-lg overflow-hidden"
      style={{
        background: 'rgba(28, 74, 42, 0.55)',
        border: '1px solid rgba(196, 148, 58, 0.35)',
      }}
    >
      <div
        className="px-3 py-2 flex items-start justify-between gap-2"
        style={{ borderBottom: '1px solid rgba(196, 148, 58, 0.2)' }}
      >
        <div className="min-w-0">
          <div
            className="text-sm font-bold text-parchment leading-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {record.commonName || record.taxonName || 'Unknown tree'}
          </div>
          {record.taxonName && record.taxonName !== record.commonName && (
            <div className="text-[11px] italic text-amber/90 mt-0.5">{record.taxonName}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopyLink}
            className="text-[10px] px-2.5 py-2 rounded font-semibold whitespace-nowrap"
            style={{
              color: '#C4943A',
              border: '1px solid rgba(196, 148, 58, 0.4)',
              background: 'rgba(196, 148, 58, 0.08)',
            }}
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-parchment/50 hover:text-parchment text-lg leading-none h-9 w-9 inline-flex items-center justify-center rounded-full"
            aria-label="Close details"
            style={{ background: 'rgba(15, 35, 24, 0.38)' }}
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-3 py-2 max-h-[220px] overflow-y-auto">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <PlacementBadge confidence={record.placementConfidence} awaitingCoordinates={!mappable} />
        </div>
        <DetailRow label="Site" value={record.siteName} />
        <DetailRow label="County" value={record.county} />
        <DetailRow label="Heritage type" value={record.heritageType} />
        <DetailRow label="Category" value={record.category} />
        <DetailRow label="Form" value={record.form} />
        <DetailRow label="Condition" value={record.condition} />
        <DetailRow label="Age range" value={record.ageRange} />
        <DetailRow label="Evidence" value={record.evidence} />
        <DetailRow label="Tree type" value={record.broadType} />
        {mappable && (
          <DetailRow
            label="Coordinates"
            value={`${record.lat!.toFixed(5)}, ${record.lng!.toFixed(5)}`}
          />
        )}
      </div>

    </div>
  )
}
