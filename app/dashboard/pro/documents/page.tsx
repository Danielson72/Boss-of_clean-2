'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, XCircle, Upload, AlertCircle, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

const REQUIRED_DOCS = [
  { type: 'license', label: 'Business License' },
  { type: 'insurance', label: 'Liability Insurance Certificate' },
]

const OPTIONAL_DOCS = [
  { type: 'background_check', label: 'Background Check' },
  { type: 'certification', label: 'Certification' },
  { type: 'id_photo', label: 'Government ID' },
]

interface CleanerDoc {
  id: string
  document_type: string
  file_name: string
  file_url: string
  verification_status: string
  rejection_reason?: string
  created_at: string
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
      <Clock className="w-3 h-3" /> Pending Review
    </span>
  )
}

function UploadCard({
  docType,
  label,
  required,
  existing,
  onUploaded,
}: {
  docType: string
  label: string
  required?: boolean
  existing?: CleanerDoc
  onUploaded: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxMb = 10
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`File must be under ${maxMb} MB`)
      return
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|heic|heif)$/i)) {
      toast.error('Only PDF, JPG, PNG, or HEIC files are accepted')
      return
    }

    setUploading(true)
    try {
      // Get signed upload URL
      const urlRes = await fetch(`/api/pro/documents/upload-url?filename=${encodeURIComponent(file.name)}&type=${docType}`)
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { signedUrl, fileUrl } = await urlRes.json()

      // Upload to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Storage upload failed')

      // Save metadata
      const metaRes = await fetch('/api/pro/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: docType,
          file_name: file.name,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.type,
        }),
      })
      if (!metaRes.ok) throw new Error('Failed to save document')

      toast.success('Document uploaded. Admin will review within 1–2 business days.')
      onUploaded()
    } catch (err) {
      console.error('[UploadCard] error:', err)
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const canReUpload = !existing || existing.verification_status === 'rejected'

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="font-medium text-sm text-gray-900">{label}</p>
            {required && <p className="text-xs text-red-600">Required</p>}
          </div>
        </div>
        {existing ? (
          <StatusBadge status={existing.verification_status} />
        ) : (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Missing</span>
        )}
      </div>

      {existing?.rejection_reason && (
        <div className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Rejected:</strong> {existing.rejection_reason}</span>
        </div>
      )}

      {existing && existing.verification_status !== 'rejected' && (
        <p className="text-xs text-gray-500 truncate">
          {existing.file_name} · {new Date(existing.created_at).toLocaleDateString()}
        </p>
      )}

      {canReUpload && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> {existing ? 'Re-upload' : 'Upload file'}</>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">PDF, JPG, PNG, or HEIC · Max 10 MB</p>
        </>
      )}
    </div>
  )
}

export default function ProDocumentsPage() {
  const [documents, setDocuments] = useState<CleanerDoc[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDocs = async () => {
    const res = await fetch('/api/pro/documents')
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  const getDoc = (type: string) => documents.find(d => d.document_type === type)

  const requiredApproved = REQUIRED_DOCS.filter(d => getDoc(d.type)?.verification_status === 'verified').length
  const requiredTotal = REQUIRED_DOCS.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-600 mt-1">
          Upload your business documents for verification. Required documents must be approved before you can receive leads.
        </p>
      </div>

      {requiredApproved === requiredTotal ? (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
          <CheckCircle className="w-5 h-5" />
          All required documents approved — your account is verified!
        </div>
      ) : (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>
            {requiredApproved}/{requiredTotal} required documents approved.
            Upload your Business License and Liability Insurance to get verified.
          </span>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Required Documents</h2>
        <div className="space-y-3">
          {REQUIRED_DOCS.map(d => (
            <UploadCard
              key={d.type}
              docType={d.type}
              label={d.label}
              required
              existing={getDoc(d.type)}
              onUploaded={fetchDocs}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Optional Documents</h2>
        <div className="space-y-3">
          {OPTIONAL_DOCS.map(d => (
            <UploadCard
              key={d.type}
              docType={d.type}
              label={d.label}
              existing={getDoc(d.type)}
              onUploaded={fetchDocs}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
