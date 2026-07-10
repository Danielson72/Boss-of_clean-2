'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  ArrowLeft,
  Loader2,
  Receipt,
  XCircle,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { getPaymentHistory, type PaymentRow } from './actions';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** payments.amount is already dollars — format only, never divide by 100. */
function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'usd').toUpperCase(),
  }).format(amount);
}

const STATUS_STYLES: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status}
    </span>
  );
}

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getPaymentHistory();
        if (result.success) {
          setPayments(result.payments || []);
        } else {
          setError(result.error || 'Failed to load payment history');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    return payments
      .filter((p) => {
        if (p.status !== 'succeeded') return false;
        const d = new Date(p.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading payment history...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/pro"
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Every charge on your account — lead unlocks and subscription payments.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="rounded-lg p-4 mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
            </div>
          )}

          {/* Current-month total */}
          <div className="bg-white rounded-lg shadow-sm p-5 sm:p-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Spent in {monthLabel}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatAmount(monthTotal, 'usd')}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Lead unlock fees and subscription charges will show up here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-4 md:hidden">
                {payments.map((p) => (
                  <div key={p.id} className="bg-white rounded-lg shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-lg font-semibold text-gray-900">{formatAmount(p.amount, p.currency)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm text-gray-900">{p.description || 'Payment'}</p>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>{formatDate(p.date)}</p>
                      {(p.service_type || p.lead_city) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="capitalize">
                            {[p.service_type?.replace(/_/g, ' '), p.lead_city].filter(Boolean).join(' — ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Date', 'Description', 'Lead', 'Amount', 'Status'].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(p.date)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{p.description || 'Payment'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                            {[p.service_type?.replace(/_/g, ' '), p.lead_city].filter(Boolean).join(' — ') || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatAmount(p.amount, p.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
