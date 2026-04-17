'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { verifyDocument } from '../actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, XCircle, Clock, Eye, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PendingDoc {
  id: string
  cleaner_id: string
  document_type: string
  file_name: string
  file_url: string
  file_size?: number
  verification_status: string
  created_at: string
  cleaner: {
    business_name: string
    user: { email: string; full_name: string }
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: 'Insurance Certificate',
  id_photo: 'Government-Issued ID',
  license: 'Business License',
  background_check: 'Background Check',
  certification: 'Certification',
  other: 'Other',
}

const STATUS_FILTER_OPTIONS = ['pending', 'verified', 'rejected', 'expired'] as const
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number] | 'all'

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<PendingDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const supabase = createClient()

  const loadDocs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('cleaner_documents')
      .select(`
        id, cleaner_id, document_type, file_name, file_url, file_size,
        verification_status, created_at,
        cleaner:cleaners!cleaner_documents_cleaner_id_fkey(
          business_name,
          user:users!cleaners_user_id_fkey(email, full_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('verification_status', statusFilter)
    }

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load documents')
    } else {
      setDocs((data ?? []) as unknown as PendingDoc[])
    }
    setLoading(false)
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadDocs() }, [loadDocs])

  const handleView = async (doc: PendingDoc) => {
    const res = await fetch(`/api/admin/documents/signed-url?documentId=${doc.id}`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
    else toast.error('Could not open document')
  }

  const handleAction = async (docId: string, status: 'verified' | 'rejected' | 'expired') => {
    setProcessing(docId)
    const result = await verifyDocument(docId, status, notes[docId])
    if (result.success) {
      toast.success(`Document marked ${status}`)
      setDocs((prev) => prev.filter((d) => d.id !== docId))
    } else {
      toast.error(result.error ?? 'Action failed')
    }
    setProcessing(null)
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Review Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and verify pro-submitted documents
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', ...STATUS_FILTER_OPTIONS] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No {statusFilter !== 'all' ? statusFilter : ''} documents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">
                        {doc.cleaner?.business_name ?? 'Unknown Pro'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </Badge>
                      <StatusBadge status={doc.verification_status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {doc.cleaner?.user?.full_name} · {doc.cleaner?.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.file_name} {formatSize(doc.file_size) ? `· ${formatSize(doc.file_size)}` : ''}
                      {' · '}Uploaded {new Date(doc.created_at).toLocaleDateString()}
                    </p>

                    {doc.verification_status === 'pending' && (
                      <Textarea
                        className="mt-3 text-xs h-16 max-w-md"
                        placeholder="Notes or rejection reason (optional for verify, required for reject)..."
                        value={notes[doc.id] ?? ''}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleView(doc)}>
                      <Eye className="h-4 w-4 mr-1" />View
                    </Button>

                    {doc.verification_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processing === doc.id}
                          onClick={() => handleAction(doc.id, 'verified')}
                        >
                          {processing === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" />Verify</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={processing === doc.id}
                          onClick={() => handleAction(doc.id, 'rejected')}
                        >
                          {processing === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" />Reject</>}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600"
                          disabled={processing === doc.id}
                          onClick={() => handleAction(doc.id, 'expired')}
                        >
                          <Clock className="h-4 w-4 mr-1" />Expire
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
    case 'rejected':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
    case 'expired':
      return <Badge className="bg-orange-500 text-white"><Clock className="h-3 w-3 mr-1" />Expired</Badge>
    default:
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
  }
}
