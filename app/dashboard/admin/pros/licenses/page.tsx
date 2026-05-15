'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { BadgeCheck, Clock, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';

// DLD-445 — admin queue for FL pro license verification.
// First-pass UI: list pending / verified / rejected / expired in tabs,
// show submitted documents (links only, the file storage layer is shared
// with cleaner_documents and is gated by signed URLs in a follow-up),
// and provide Verify / Reject / Expire / Reset buttons that PATCH
// /api/admin/licenses/[id].

type LicenseStatus = 'pending' | 'verified' | 'rejected' | 'expired';

type SubmittedDocument = {
  url?: string;
  label?: string;
  uploaded_at?: string;
};

interface AdminLicense {
  id: string;
  pro_id: string;
  license_type: string;
  license_number: string;
  issuing_state: string;
  issuing_authority: string;
  verification_status: LicenseStatus;
  submitted_documents: SubmittedDocument[] | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  dbpr_status: string | null;
  last_checked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pros: {
    id: string;
    business_name: string | null;
    user_id: string | null;
    users: { full_name: string | null; email: string | null } | null;
  } | null;
}

const LICENSE_TYPE_LABEL: Record<string, string> = {
  plumbing: 'Plumbing',
  hvac: 'HVAC',
  electrical: 'Electrical',
  general_contractor: 'General Contractor',
  pest_control: 'Pest Control',
  roofing: 'Roofing',
  other: 'Other',
};

const STATUS_LABEL: Record<LicenseStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};

function StatusBadge({ status }: { status: LicenseStatus }) {
  const map: Record<LicenseStatus, string> = {
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    verified: 'bg-green-50 text-green-800 border-green-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    expired: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function AdminLicensesContent() {
  const [tab, setTab] = useState<LicenseStatus>('pending');
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/licenses?status=${tab}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: AdminLicense[]) => {
        if (!cancelled) setLicenses(Array.isArray(data) ? data : []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  async function handleAction(
    id: string,
    action: 'verify' | 'reject' | 'expire' | 'reset'
  ) {
    if (action === 'reject') {
      const reason = (reasonDraft[id] ?? '').trim();
      if (!reason) {
        setError('Rejection reason is required.');
        return;
      }
    }

    setActionBusyId(id);
    setError(null);

    try {
      const body: Record<string, unknown> = { action };
      if (action === 'reject') {
        body.rejection_reason = reasonDraft[id]?.trim() ?? '';
      }

      const res = await fetch(`/api/admin/licenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `Action failed (${res.status})`);
      }

      // Refresh current tab.
      const refresh = await fetch(`/api/admin/licenses?status=${tab}`, { cache: 'no-store' });
      const fresh = (await refresh.json()) as AdminLicense[];
      setLicenses(Array.isArray(fresh) ? fresh : []);
      setReasonDraft((prev) => ({ ...prev, [id]: '' }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionBusyId(null);
    }
  }

  const tabs = useMemo(
    () => [
      { key: 'pending' as const, label: 'Pending', icon: Clock },
      { key: 'verified' as const, label: 'Verified', icon: BadgeCheck },
      { key: 'rejected' as const, label: 'Rejected', icon: XCircle },
      { key: 'expired' as const, label: 'Expired', icon: ShieldAlert },
    ],
    []
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pro License Verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          DLD-445 · FL DBPR scaffold. Manual verification for plumbing, HVAC,
          electrical, and other licensed trades. Automated DBPR lookup ships
          in a follow-up.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition ${
              tab === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-500 text-sm">Loading licenses…</div>
      ) : licenses.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">
          No {STATUS_LABEL[tab].toLowerCase()} licenses.
        </div>
      ) : (
        <ul className="space-y-3">
          {licenses.map((license) => {
            const proName =
              license.pros?.business_name ??
              license.pros?.users?.full_name ??
              'Unknown pro';
            const proEmail = license.pros?.users?.email ?? '';
            const docs = license.submitted_documents ?? [];

            return (
              <li
                key={license.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {LICENSE_TYPE_LABEL[license.license_type] ?? license.license_type}
                      <span className="text-gray-500 font-normal"> · {license.license_number}</span>
                    </h3>
                    <p className="text-sm text-gray-500">
                      {proName}
                      {proEmail ? ` · ${proEmail}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={license.verification_status} />
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                  <div>
                    <dt className="text-gray-400">Authority</dt>
                    <dd>
                      {license.issuing_authority} · {license.issuing_state}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Submitted</dt>
                    <dd>{formatDate(license.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Expires</dt>
                    <dd>{formatDate(license.expires_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400">Last checked</dt>
                    <dd>{formatDate(license.last_checked_at)}</dd>
                  </div>
                </dl>

                {docs.length > 0 && (
                  <div className="mb-3 text-xs">
                    <span className="text-gray-500">Documents: </span>
                    {docs.map((d, i) => (
                      <span key={i} className="mr-2">
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline"
                          >
                            {d.label ?? `Document ${i + 1}`}
                          </a>
                        ) : (
                          <span>{d.label ?? `Document ${i + 1}`}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {license.rejection_reason && (
                  <div className="mb-3 text-xs px-3 py-2 rounded bg-red-50 border border-red-100 text-red-800">
                    <span className="font-medium">Rejection reason:</span>{' '}
                    {license.rejection_reason}
                  </div>
                )}

                {license.notes && (
                  <p className="text-xs text-gray-500 italic mb-3">Notes: {license.notes}</p>
                )}

                {tab === 'pending' && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <textarea
                      placeholder="Rejection reason (required to reject)"
                      value={reasonDraft[license.id] ?? ''}
                      onChange={(e) =>
                        setReasonDraft((prev) => ({ ...prev, [license.id]: e.target.value }))
                      }
                      rows={2}
                      className="text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={actionBusyId === license.id}
                        onClick={() => handleAction(license.id, 'verify')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-60"
                      >
                        <BadgeCheck className="w-4 h-4" />
                        Verify
                      </button>
                      <button
                        disabled={
                          actionBusyId === license.id ||
                          !(reasonDraft[license.id] ?? '').trim()
                        }
                        onClick={() => handleAction(license.id, 'reject')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {tab !== 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      disabled={actionBusyId === license.id}
                      onClick={() => handleAction(license.id, 'reset')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-60"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to pending
                    </button>
                    {tab === 'verified' && (
                      <button
                        disabled={actionBusyId === license.id}
                        onClick={() => handleAction(license.id, 'expire')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm rounded-lg hover:bg-amber-200 disabled:opacity-60"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Mark expired
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function AdminLicensesPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <AdminLicensesContent />
    </ProtectedRoute>
  );
}
