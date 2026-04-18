'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, Eye, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

type DocStatus = 'pending' | 'verified' | 'rejected' | 'all'

interface AdminDoc {
  id: string
  document_type: string
  file_name: string
  file_url: string
  file_size?: number
  verification_status: string
  rejection_reason?: string
  created_at: string
  cleaner?: {
    id: string
    business_name: string
    user?: { full_name?: string; email?: string }
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Approved
    </span>
  )
  if (status === 'rejected') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Rejected
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> Pending
    </span>
  )
}

const DOC_TYPE_LABELS: Record<string, string> = {
  license: 'Business License',
  insurance: 'Liability Insurance',
  background_check: 'Background Check',
  certification: 'Certification',
  id_photo: 'Government ID',
  other: 'Other',
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDoc[]>([])
  const [statusFilter, setStatusFilter] = useState<DocStatus>('pending')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AdminDoc | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/documents?status=${statusFilter}`)
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents || [])
    }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const openModal = async (doc: AdminDoc) => {
    setSelected(doc)
    setNotes('')
    setSignedUrl(null)
    setLoadingUrl(true)

    try {
      const res = await fetch(`/api/admin/documents/signed-url?documentId=${doc.id}`)
      if (res.ok) {
        const data = await res.json()
        setSignedUrl(data.signedUrl)
      }
    } catch {
      // signed URL is optional — can still view via file_url if public
    } finally {
      setLoadingUrl(false)
    }
  }

  const handleAction = async (action: 'verified' | 'rejected') => {
    if (!selected) return
    if (action === 'rejected' && !notes.trim()) {
      toast.error('Review notes are required when rejecting a document')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/documents?id=${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, notes: notes.trim() || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed')
      }

      toast.success(action === 'verified' ? 'Document approved' : 'Document rejected')
      setSelected(null)
      fetchDocs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const TABS: { label: string; value: DocStatus }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'verified' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Review Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve pro verification documents</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              statusFilter === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No {statusFilter === 'all' ? '' : statusFilter} documents</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Pro</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{doc.cleaner?.business_name || '—'}</p>
                    <p className="text-xs text-gray-500">{doc.cleaner?.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-gray-600">{doc.file_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={doc.verification_status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(doc)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {DOC_TYPE_LABELS[selected.document_type] || selected.document_type}
                </h2>
                <p className="text-sm text-gray-500">
                  {selected.cleaner?.business_name} · {selected.file_name}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none"
              >
                ×
              </button>
            </div>

            {/* File preview */}
            <div className="flex-1 overflow-auto bg-gray-50 min-h-[240px] flex items-center justify-center">
              {loadingUrl ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : signedUrl ? (
                selected.file_name.match(/\.(jpg|jpeg|png|heic|heif)$/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signedUrl} alt={selected.file_name} className="max-h-80 max-w-full object-contain" />
                ) : (
                  <iframe src={signedUrl} className="w-full h-80" title="Document preview" />
                )
              ) : (
                <a
                  href={selected.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  Open document in new tab
                </a>
              )}
            </div>

            <div className="px-6 py-4 space-y-3 border-t border-gray-100">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Review notes (required when rejecting)"
                rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('verified')}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '✓ Approve'}
                </button>
                <button
                  onClick={() => handleAction('rejected')}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '✕ Reject'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 border border-gray-300 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
