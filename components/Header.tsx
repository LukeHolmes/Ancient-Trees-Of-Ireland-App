'use client'

interface HeaderProps {
  totalCount: number
}

export default function Header({ totalCount }: HeaderProps) {
  return (
    <div
      className="px-6 py-5 flex-shrink-0"
      style={{
        background:
          'linear-gradient(160deg, #0F2318 0%, #1C4A2A 60%, #2D6A4F22 100%)',
        borderBottom: '1px solid rgba(196, 148, 58, 0.3)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-2xl leading-tight text-parchment"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Ancient Trees
            <br />
            <span className="text-amber">of Ireland</span>
          </h1>
          <p className="text-xs text-parchment/60 mt-2 leading-relaxed">
            Discover Ireland&apos;s living heritage - trees of extraordinary age and significance
          </p>
          <p className="text-[11px] text-parchment/55 mt-3 leading-relaxed">
            Website &amp; contact:{' '}
            <a
              href="https://lukeholmes.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber hover:text-parchment transition-colors underline decoration-amber/40 underline-offset-4"
            >
              lukeholmes.github.io
            </a>
          </p>
        </div>
        <div className="flex-shrink-0 mt-1">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(196, 148, 58, 0.15)',
              border: '1px solid rgba(196, 148, 58, 0.5)',
              color: '#C4943A',
            }}
          >
            <span className="text-base">Tree</span>
            {totalCount} Heritage Trees
          </span>
        </div>
      </div>
    </div>
  )
}
