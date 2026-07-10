'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Loader2,
  Users,
  XCircle,
  MessageSquare,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';
import { getWonLeads, type WonLead } from './actions';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function serviceLabel(serviceType: string | null): string {
  return (serviceType || 'Cleaning').replace(/_/g, ' ');
}

export default function WonLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<WonLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getWonLeads();
        if (result.success) {
          setLeads(result.leads || []);
        } else {
          setError(result.error || 'Failed to load your customers');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading your customers...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">My Customers</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Leads you&apos;ve unlocked — full contact info and a direct line to Messages.
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
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No won leads yet</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                When you unlock a hired lead, the customer&apos;s full contact info lands here.
              </p>
              <Link
                href="/dashboard/pro/leads"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition"
              >
                Browse leads to unlock
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-4 md:hidden">
                {leads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg shadow-sm border-l-4 border-green-400 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                        {serviceLabel(lead.service_type)}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      {lead.customer_full_name || 'Customer'}
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      {lead.customer_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <a href={`mailto:${lead.customer_email}`} className="text-blue-600 hover:underline break-all">
                            {lead.customer_email}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{[lead.city, lead.zip_code].filter(Boolean).join(', ') || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Unlocked {formatDate(lead.unlocked_at)}</span>
                      </div>
                    </div>
                    {lead.conversation_id && (
                      <Link
                        href={`/dashboard/messages/${lead.conversation_id}`}
                        className="mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                      >
                        <MessageSquare className="h-4 w-4" /> Open conversation
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Customer', 'Contact', 'Service', 'Location', 'Unlocked', ''].map((h) => (
                          <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {lead.customer_full_name || 'Customer'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {lead.customer_email ? (
                              <a href={`mailto:${lead.customer_email}`} className="text-blue-600 hover:underline">
                                {lead.customer_email}
                              </a>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                            {serviceLabel(lead.service_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {[lead.city, lead.zip_code].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(lead.unlocked_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {lead.conversation_id ? (
                              <Link
                                href={`/dashboard/messages/${lead.conversation_id}`}
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <MessageSquare className="h-4 w-4" /> Message
                              </Link>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
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
