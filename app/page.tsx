import { Suspense } from 'react'
import { promises as fs } from 'fs'
import path from 'path'
import type { TreeRecord } from '@/types/tree'
import MapApp from '@/components/MapApp'
import { countAwaitingCoordinates, normalizeMappableTrees } from '@/lib/trees'

export default async function Home() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'trees.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const records: TreeRecord[] = JSON.parse(raw)
  const mappableTrees = normalizeMappableTrees(records)
  const awaitingCoordinates = countAwaitingCoordinates(records)

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-parchment/60">
          Loading map…
        </div>
      }
    >
      <MapApp
        records={records}
        mappableTrees={mappableTrees}
        awaitingCoordinates={awaitingCoordinates}
      />
    </Suspense>
  )
}
