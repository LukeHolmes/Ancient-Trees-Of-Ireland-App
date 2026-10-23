'use client'

import type { PlacementConfidence } from '@/types/tree'

const LABELS: Record<PlacementConfidence, string> = {
  verified: 'Verified',
  border: 'County border',
  needs_review: 'Needs review',
}

interface PlacementBadgeProps {
  confidence?: PlacementConfidence
  awaitingCoordinates?: boolean
}

export default function PlacementBadge({ confidence, awaitingCoordinates }: PlacementBadgeProps) {
  if (awaitingCoordinates) {
    return (
      <span
        className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
        style={{
          background: 'rgba(196, 148, 58, 0.12)',
          border: '1px solid rgba(196, 148, 58, 0.35)',
          color: '#C4943A',
        }}
      >
        No map pin
      </span>
    )
  }

  if (!confidence || confidence === 'verified') return null

  const isWarning = confidence === 'needs_review'
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0"
      style={{
        background: isWarning ? 'rgba(180, 80, 60, 0.15)' : 'rgba(196, 148, 58, 0.12)',
        border: `1px solid ${isWarning ? 'rgba(180, 80, 60, 0.4)' : 'rgba(196, 148, 58, 0.35)'}`,
        color: isWarning ? '#e8b4a8' : '#C4943A',
      }}
      title={LABELS[confidence]}
    >
      {LABELS[confidence]}
    </span>
  )
}
