'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const BocAssistant = dynamic(() => import('./BocAssistant'), { ssr: false })

export default function BocAssistantLoader() {
  const pathname = usePathname()
  // Gate the whole David widget behind the flag — hidden entirely unless
  // NEXT_PUBLIC_DAVID_ENABLED is exactly "true" (needs OPENROUTER_API_KEY set
  // server-side too). Inlined at build time; nothing renders when off.
  if (process.env.NEXT_PUBLIC_DAVID_ENABLED !== 'true') return null
  // Suppress on all dashboard routes — authenticated users have role-specific support
  if (pathname?.startsWith('/dashboard')) return null
  return <BocAssistant />
}
