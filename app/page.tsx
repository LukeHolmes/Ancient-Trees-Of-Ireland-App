import { promises as fs } from 'fs'
import path from 'path'
import dynamic from 'next/dynamic'
import type { Tree } from '@/types/tree'

const MapApp = dynamic(() => import('@/components/MapApp'), { ssr: false })

export default async function Home() {
  const filePath = path.join(process.cwd(), 'public', 'data', 'trees.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  const trees: Tree[] = JSON.parse(raw)

  return <MapApp trees={trees} />
}
