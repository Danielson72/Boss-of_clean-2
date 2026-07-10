'use client'

import dynamic from 'next/dynamic'

const BocAssistant = dynamic(() => import('./BocAssistant'), { ssr: false })

// DLD: David renders everywhere, including /dashboard — the API route derives
// the audience (visitor/customer/pro) server-side from the session.
export default function BocAssistantLoader() {
  return <BocAssistant />
}
