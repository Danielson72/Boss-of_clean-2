'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CheckCircle,
  XCircle,
  Shield,
  AlertCircle,
  FileText,
  Eye,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { approveCleaner, rejectCleaner, requestCleanerInfo } from '../actions'

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

interface ApprovalQueueProps {
  applications: CleanerApplication[]
  onViewDetails: (cleanerId: string) => void
}

type ActionType = 'approve' | 'reject' | 'request_info' | null

export function ApprovalQueue({ applications, onViewDetails }: ApprovalQueueProps) {
  const [selectedCleaner, setSelectedCleaner] = useState<CleanerApplication | null>(null)
  const [actionType, setActionType] = useState<ActionType>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const openActionDialog = (cleaner: CleanerApplication, action: ActionType) => {
    setSelectedCleaner(cleaner)
    setActionType(action)
    setNotes('')
  }

  const closeDialog = () => {
    setSelectedCleaner(null)
    setActionType(null)
    setNotes('')
  }

  const handleAction = async () => {
    if (!selectedCleaner || !actionType) return

    setLoading(true)

    try {
      let result

      switch (actionType) {
        case 'approve':
          result = await approveCleaner(selectedCleaner.id, notes || undefined)
          break
        case 'reject':
          if (!notes.trim()) {
            toast.error('Please provide a reason for rejection')
            setLoading(false)
            return
          }
          result = await rejectCleaner(selectedCleaner.id, notes)
          break
        case 'request_info':
          if (!notes.trim()) {
            toast.error('Please specify what information is needed')
            setLoading(false)
            return
          }
          result = await requestCleanerInfo(selectedCleaner.id, notes)
          break
      }

      if (result?.success) {
        toast.success(
          actionType === 'approve' ? 'Application approved!' :
          actionType === 'reject' ? 'Application rejected' :
          'Information request sent'
        )
        closeDialog()
      } else {
        toast.error(result?.error || 'Action failed')
      }
    } catch (error) {
      console.error('Action error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const hasInfoRequest = (cleaner: CleanerApplication) => {
    return cleaner.rejected_reason?.startsWith('INFO_REQUESTED:')
  }

  const getInfoRequestMessage = (cleaner: CleanerApplication) => {
    if (hasInfoRequest(cleaner)) {
      return cleaner.rejected_reason?.replace('INFO_REQUESTED: ', '')
    }
    return null
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <p className="text-muted-foreground">
          No pending applications
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {applications.map((cleaner) => (
          <Card
            key={cleaner.id}
            className={hasInfoRequest(cleaner) ? 'border-yellow-500 border-2' : ''}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cleaner.id)}
                      onChange={() => toggleSelect(cleaner.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <h3 className="font-semibold">{cleaner.business_name}</h3>
                    <Badge variant={
                      cleaner.approval_status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {cleaner.approval_status}
                    </Badge>
                    {hasInfoRequest(cleaner) && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Info Requested
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Contact: {cleaner.user?.email}</p>
                    <p>Location: {cleaner.user?.city}, {cleaner.user?.state} {cleaner.user?.zip_code}</p>
                    <p>Experience: {cleaner.years_experience || 0} years</p>
                    <p>Rate: ${cleaner.hourly_rate || 0}/hour</p>
                    <p>Applied: {new Date(cleaner.created_at).toLocaleDateString()}</p>
                    {cleaner.onboarding_completed_at && (
                      <p>Submitted: {new Date(cleaner.onboarding_completed_at).toLocaleDateString()}</p>
                    )}
                  </div>

                  {cleaner.business_description && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Description:</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cleaner.business_description}
                      </p>
                    </div>
                  )}

                  {hasInfoRequest(cleaner) && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-800">Requested Information:</p>
                      <p className="text-sm text-yellow-700">{getInfoRequestMessage(cleaner)}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-2">
                    {cleaner.insurance_verified && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Insurance Verified
                      </Badge>
                    )}
                    {cleaner.background_check && (
                      <Badge variant="outline" className="text-blue-600">
                        <Shield className="h-3 w-3 mr-1" />
                        Background Checked
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(cleaner.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => openActionDialog(cleaner, 'approve')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                    onClick={() => openActionDialog(cleaner, 'request_info')}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Request Info
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openActionDialog(cleaner, 'reject')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Application'}
              {actionType === 'reject' && 'Reject Application'}
              {actionType === 'request_info' && 'Request Additional Information'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && `Approve ${selectedCleaner?.business_name}? They will be notified by email.`}
              {actionType === 'reject' && `Please provide a reason for rejecting ${selectedCleaner?.business_name}.`}
              {actionType === 'request_info' && `What information do you need from ${selectedCleaner?.business_name}?`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="notes">
              {actionType === 'approve' && 'Notes (optional)'}
              {actionType === 'reject' && 'Rejection Reason (required)'}
              {actionType === 'request_info' && 'Information Needed (required)'}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Any notes about this approval...'
                  : actionType === 'reject'
                  ? 'Please explain why this application cannot be approved...'
                  : 'Please describe what additional information is needed...'
              }
              className="mt-2"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'approve' && 'Approve'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'request_info' && 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
