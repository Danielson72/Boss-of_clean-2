'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { CheckCircle, XCircle, Clock, FileText, X } from 'lucide-react';

interface AdminDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  verified_at: string | null;
  cleaner_id: string;
  cleaners: {
    business_name: string;
    users: { full_name: string; email: string } | null;
  } | null;
}

type Tab = 'pending' | 'verified' | 'rejected';

const DOC_TYPE_LABELS: Record<string, string> = {
  license: 'Business License',
  insurance: 'Liability Insurance',
  id_photo: 'Photo ID',
  background_check: 'Background Check',
  certification: 'Certification',
  other: 'Other Document',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface ReviewModalProps {
  doc: AdminDocument;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject', notes: string) => Promise<void>;
}

function ReviewModal({ doc, onClose, onAction }: ReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    fetch(`/api/admin/documents/${doc.id}/signed-url`)
      .then(async res => {
        if (!res.ok) {
          if (!cancelled) setPreviewError('Preview unavailable.');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSignedUrl(data.signedUrl);
          setPreviewMime(data.mimeType);
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewError('Network error loading preview.');
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => { cancelled = true; };
  }, [doc.id]);

  async function handleAction(action: 'approve' | 'reject') {
    if (action === 'reject' && !notes.trim()) return;
    setSubmitting(action);
    await onAction(doc.id, action, notes);
    setSubmitting(null);
    onClose();
  }

  function renderPreview() {
    if (previewLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading preview…</p>
        </div>
      );
    }
    if (previewError || !signedUrl) {
      return (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">{doc.file_name}</p>
          <p className="text-xs text-red-600 mt-2">{previewError ?? 'Preview unavailable.'}</p>
        </div>
      );
    }
    if (previewMime === 'application/pdf') {
      return (
        <iframe
          src={signedUrl}
          title={doc.file_name}
          className="w-full h-[600px] rounded-lg border border-gray-200 bg-white"
        />
      );
    }
    if (previewMime && ['image/jpeg', 'image/png', 'image/webp'].includes(previewMime)) {
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          src={signedUrl}
          alt={doc.file_name}
          className="max-w-full max-h-[600px] object-contain mx-auto"
        />
      );
    }
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">{doc.file_name}</p>
        <p className="text-xs text-gray-500 mt-2">
          Preview unavailable.{' '}
          <a href={signedUrl} download className="text-blue-600 underline">Download to view</a>
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}</h2>
            <p className="text-sm text-gray-500">
              {doc.cleaners?.business_name} · {doc.cleaners?.users?.full_name ?? 'Unknown'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="bg-gray-50 rounded-lg flex items-center justify-center min-h-48 mb-4 p-2">
            {renderPreview()}
          </div>
          <p className="text-xs text-gray-400 text-center mb-4">
            {doc.file_name} · {formatBytes(doc.file_size)}
          </p>

          {doc.verification_status === 'pending' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes <span className="text-gray-400">(required to reject)</span>
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add notes for the pro (required when rejecting)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={submitting !== null}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting === 'approve' ? 'Approving…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={submitting !== null || !notes.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  {submitting === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </>
          )}

          {doc.verification_status !== 'pending' && doc.rejection_reason && (
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800">
              <span className="font-medium">Review notes:</span> {doc.rejection_reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [selectedDoc, setSelectedDoc] = useState<AdminDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  async function loadDocuments() {
    const res = await fetch('/api/admin/documents');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadDocuments(); }, []);

  async function handleAction(id: string, action: 'approve' | 'reject', notes: string) {
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, review_notes: notes }),
    });

    if (res.ok) {
      setToast(`Document ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => setToast(null), 4000);
      await loadDocuments();
    }
  }

  const filtered = documents.filter(d => d.verification_status === activeTab);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending', count: documents.filter(d => d.verification_status === 'pending').length },
    { key: 'verified', label: 'Verified', count: documents.filter(d => d.verification_status === 'verified').length },
    { key: 'rejected', label: 'Rejected', count: documents.filter(d => d.verification_status === 'rejected').length },
  ];

  if (forbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Pro Document Review Queue</h1>

          {toast && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              {toast}
            </div>
          )}

          <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-lg p-1 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No {activeTab} documents</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Document Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{doc.cleaners?.business_name ?? '—'}</p>
                        <p className="text-gray-500 text-xs">{doc.cleaners?.users?.full_name ?? doc.cleaner_id}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-40 truncate">{doc.file_name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {doc.verification_status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                        {doc.verification_status === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {doc.verification_status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedDoc && (
        <ReviewModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onAction={handleAction}
        />
      )}
    </ProtectedRoute>
  );
}
