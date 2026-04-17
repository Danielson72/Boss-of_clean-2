'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const BocAssistant = dynamic(
  () => import('./BocAssistant').then((mod) => mod.BocAssistant),
  { ssr: false }
)

export function BocAssistantLoader() {
  const pathname = usePathname()
  // Don't render on dashboard routes (authenticated area has its own tools)
  if (pathname?.startsWith('/dashboard')) return null
  return <BocAssistant />
}
