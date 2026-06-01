import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ancient Trees of Ireland',
  description: "Discover Ireland's living heritage - trees of extraordinary age and significance",
  keywords: ['ancient trees', 'Ireland', 'heritage trees', 'nature', 'conservation'],
  openGraph: {
    title: 'Ancient Trees of Ireland',
    description: "Discover Ireland's living heritage - trees of extraordinary age and significance",
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} h-full`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  )
}
