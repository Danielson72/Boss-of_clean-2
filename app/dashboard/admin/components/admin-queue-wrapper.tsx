'use client'

import { useState } from 'react'
import { ApprovalQueue } from './approval-queue'
import { CleanerDetailModal } from './cleaner-detail-modal'

interface CleanerApplication {
  id: string
  business_name: string
  business_description?: string
  approval_status: string
  years_experience?: number
  hourly_rate?: number
  insurance_verified?: boolean
  background_check?: boolean
  created_at: string
  onboarding_completed_at?: string
  rejected_reason?: string
  user?: {
    email: string
    full_name?: string
    display_name?: string
    city?: string
    state?: string
    zip_code?: string
  }
}

interface AdminQueueWrapperProps {
  applications: CleanerApplication[]
}

export function AdminQueueWrapper({ applications }: AdminQueueWrapperProps) {
  const [selectedCleanerId, setSelectedCleanerId] = useState<string | null>(null)

  return (
    <>
      <ApprovalQueue
        applications={applications}
        onViewDetails={(cleanerId) => setSelectedCleanerId(cleanerId)}
      />

      <CleanerDetailModal
        cleanerId={selectedCleanerId}
        isOpen={selectedCleanerId !== null}
        onClose={() => setSelectedCleanerId(null)}
      />
    </>
  )
}
