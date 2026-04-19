'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Upload, CheckCircle, Clock, XCircle, FileText, AlertCircle } from 'lucide-react';

interface ProDocument {
  id: string;
  document_type: string;
  file_name: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
}

const REQUIRED_DOCS = [
  { type: 'business_license', label: 'Business License' },
  { type: 'insurance_certificate', label: 'Liability Insurance Certificate' },
  { type: 'w9', label: 'W-9 Form' },
];

const OPTIONAL_DOCS = [
  { type: 'ein_letter', label: 'EIN Letter' },
  { type: 'other', label: 'Other Document' },
];

const ALL_DOCS = [...REQUIRED_DOCS, ...OPTIONAL_DOCS];

const statusConfig = {
  pending: { label: 'Pending Review', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-800' },
};

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function ProDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function loadDocuments() {
    try {
      const res = await fetch('/api/pro/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocuments(); }, []);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleUpload(documentType: string, file: File) {
    setUploading(documentType);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', documentType);

      const res = await fetch('/api/pro/documents', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error ?? 'Upload failed');
      } else {
        showToast('success', 'Document uploaded. Admin will review within 1–2 business days.');
        await loadDocuments();
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setUploading(null);
    }
  }

  function getLatestDoc(type: string): ProDocument | undefined {
    return documents
      .filter(d => d.document_type === type)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Documents</h1>
          <p className="text-gray-600 mb-8">
            Upload the required documents to get your account verified. Admin reviews within 1–2 business days.
          </p>

          {toast && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {toast.type === 'success'
                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
              <p className={`text-sm ${toast.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toast.message}</p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Required Documents</h2>
            {REQUIRED_DOCS.map(docDef => {
              const doc = getLatestDoc(docDef.type);
              const isUploading = uploading === docDef.type;
              const canReupload = !doc || doc.verification_status === 'rejected';

              return (
                <div key={docDef.type} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{docDef.label}</p>
                        {doc ? (
                          <p className="text-sm text-gray-500 truncate mt-0.5">{doc.file_name}</p>
                        ) : (
                          <p className="text-sm text-gray-400 mt-0.5">Not uploaded</p>
                        )}
                        {doc?.verification_status === 'rejected' && doc.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            <span className="font-medium">Review note:</span> {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc ? (
                        <StatusBadge status={doc.verification_status} />
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Missing
                        </span>
                      )}
                      {canReupload && (
                        <>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic"
                            className="hidden"
                            ref={el => { fileInputRefs.current[docDef.type] = el; }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(docDef.type, file);
                              e.target.value = '';
                            }}
                          />
                          <button
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[docDef.type]?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <Upload className="w-4 h-4" />
                            {isUploading ? 'Uploading…' : doc ? 'Re-upload' : 'Upload'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-4">Optional Documents</h2>
            {OPTIONAL_DOCS.map(docDef => {
              const doc = getLatestDoc(docDef.type);
              const isUploading = uploading === docDef.type;

              return (
                <div key={docDef.type} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{docDef.label}</p>
                        {doc ? (
                          <p className="text-sm text-gray-500 truncate mt-0.5">{doc.file_name}</p>
                        ) : (
                          <p className="text-sm text-gray-400 mt-0.5">Not uploaded</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {doc && <StatusBadge status={doc.verification_status} />}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.heic"
                        className="hidden"
                        ref={el => { fileInputRefs.current[docDef.type] = el; }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(docDef.type, file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        disabled={isUploading}
                        onClick={() => fileInputRefs.current[docDef.type]?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-gray-400">Accepted formats: PDF, JPG, PNG, HEIC · Max size: 10 MB per file</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
