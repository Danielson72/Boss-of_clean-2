'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const BocAssistant = dynamic(() => import('./BocAssistant'), { ssr: false })

export default function BocAssistantLoader() {
  const pathname = usePathname()
  // Suppress on all dashboard routes — authenticated users have role-specific support
  if (pathname?.startsWith('/dashboard')) return null
  return <BocAssistant />
}
