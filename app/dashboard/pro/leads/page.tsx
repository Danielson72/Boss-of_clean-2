'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Lock,
  Loader2,
  Inbox,
  CheckCircle,
  XCircle,
  PartyPopper,
} from 'lucide-react';
import Link from 'next/link';
import { getHiredLeadsAwaitingUnlock, type HiredLead } from './actions';

export default function HiredLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<HiredLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // quoteId currently being sent to the unlock API (button spinner + lock)
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadLeads();
  }, [user]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getHiredLeadsAwaitingUnlock();
      if (result.success) {
        setLeads(result.leads || []);
      } else {
        setError(result.error || 'Failed to load leads');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (quoteId: string) => {
    setUnlockingId(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${quoteId}/unlock`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not start checkout. Please try again.');
        setUnlockingId(null);
        return;
      }

      // Already paid (e.g. webhook landed between load and click) — just refresh.
      if (data.alreadyUnlocked) {
        await loadLeads();
        setUnlockingId(null);
        return;
      }

      // Fresh session or resumed in-flight checkout: hand the browser to Stripe.
      if (data.url) {
        window.location.href = data.url;
        return; // keep the spinner — we're navigating away
      }

      setError('Could not start checkout. Please try again.');
      setUnlockingId(null);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setUnlockingId(null);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading your hired leads...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Hired — Action Needed</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Customers who confirmed your hire. Unlock their contact info to get to work.
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

          {leads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Inbox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads need action right now</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                When a customer confirms they want to hire you, the lead shows up here to unlock.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => {
                const isUnlocking = unlockingId === lead.id;
                const isPending = lead.acceptanceStatus === 'pending';
                return (
                  <div
                    key={lead.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition border-l-4 border-green-400"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        {/* Left: lead details (PII-safe — first name + city/ZIP only) */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {(lead.service_type || '').replace(/_/g, ' ')}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <PartyPopper className="h-3 w-3" />
                              Hired
                            </span>
                          </div>

                          <p className="text-lg font-semibold text-gray-900 mb-2">
                            {lead.customer_first_name || 'Customer'}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>{lead.city}, {lead.zip_code}</span>
                            </div>
                            {lead.quoted_price != null && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span>Accepted at ${lead.quoted_price}</span>
                              </div>
                            )}
                          </div>

                          <p className="mt-3 text-xs text-gray-500">
                            Full name, email, phone, and address unlock after the $30 lead fee.
                          </p>
                        </div>

                        {/* Right: unlock CTA */}
                        <div className="flex flex-col gap-2 lg:w-64 flex-shrink-0">
                          <button
                            onClick={() => handleUnlock(lead.id)}
                            disabled={isUnlocking}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-400 transition"
                          >
                            {isUnlocking ? (
                              <><Loader2 className="h-4 w-4 animate-spin" /> Starting checkout...</>
                            ) : isPending ? (
                              <><CheckCircle className="h-4 w-4" /> Resume payment</>
                            ) : (
                              <><Lock className="h-4 w-4" /> Unlock contact — $30</>
                            )}
                          </button>
                          {isPending && (
                            <p className="text-xs text-gray-500 text-center">
                              You have a checkout in progress for this lead.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
