'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Filter,
  Search,
  Zap,
  Crown,
  Lock,
  Unlock,
  Eye,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// --- Types ---

interface AvailableLead {
  id: string;
  service_type: string;
  zip_code: string;
  city: string;
  property_size: string;
  property_type: string;
  service_date: string;
  frequency: string;
  created_at: string;
  competition_count: number;
  competition_remaining: number;
}

interface UnlockedLead {
  id: string;
  fee_tier: string;
  amount_cents: number;
  status: string;
  unlocked_at: string;
  created_at: string;
  refund_status: string | null;
  quote_request: {
    id: string;
    service_type: string;
    service_date: string;
    service_time: string;
    address: string;
    city: string;
    zip_code: string;
    property_size: string;
    property_type: string;
    description: string;
    special_requests: string;
    frequency: string;
    customer: {
      full_name: string;
      phone: string;
      email: string;
    };
  };
}

interface ProCredits {
  tier: string;
  credits: {
    total: number;
    used: number;
    remaining: number;
    is_unlimited: boolean;
    billing_period_end: string;
  } | null;
  spending_cap: {
    weekly_cap_cents: number;
    current_week_spent_cents: number;
    remaining_cents: number;
  } | null;
}

// --- Helpers ---

function getFeeTier(serviceType: string): 'standard' | 'deep_clean' | 'specialty' {
  const lower = (serviceType || '').toLowerCase();
  if (['deep clean', 'deep_clean', 'move-in', 'move-out', 'move_in_out'].some(t => lower.includes(t))) {
    return 'deep_clean';
  }
  if (['commercial', 'specialty', 'industrial', 'post-construction'].some(t => lower.includes(t))) {
    return 'specialty';
  }
  return 'standard';
}

function getUnlockPrice(serviceType: string): string {
  const tier = getFeeTier(serviceType);
  const prices = { standard: '$12', deep_clean: '$18', specialty: '$25' };
  return prices[tier];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// --- Page ---

export default function LeadsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Tab state
  const [activeTab, setActiveTab] = useState<'available' | 'unlocked'>('available');

  // Available leads
  const [availableLeads, setAvailableLeads] = useState<AvailableLead[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(true);

  // Unlocked leads
  const [unlockedLeads, setUnlockedLeads] = useState<UnlockedLead[]>([]);
  const [loadingUnlocked, setLoadingUnlocked] = useState(true);

  // Credits & spending
  const [proCredits, setProCredits] = useState<ProCredits | null>(null);

  // Filters
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [unlockingLeadId, setUnlockingLeadId] = useState<string | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState<AvailableLead | null>(null);
  const [viewingUnlocked, setViewingUnlocked] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Refund modal
  const [refundLeadId, setRefundLeadId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundEvidence, setRefundEvidence] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Check for URL params (returning from Stripe checkout)
  useEffect(() => {
    const unlockStatus = searchParams?.get('unlock');
    if (unlockStatus === 'success') {
      setMessage({ type: 'success', text: 'Lead unlocked successfully! Full contact details are now available.' });
      setActiveTab('unlocked');
    } else if (unlockStatus === 'cancelled') {
      setMessage({ type: 'error', text: 'Lead unlock payment was cancelled.' });
    }
  }, [searchParams]);

  // Load data
  const loadAvailableLeads = useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const res = await fetch('/api/leads/available');
      if (res.ok) {
        const data = await res.json();
        setAvailableLeads(data.leads || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const loadUnlockedLeads = useCallback(async () => {
    try {
      setLoadingUnlocked(true);
      const res = await fetch('/api/leads/unlocked');
      if (res.ok) {
        const data = await res.json();
        setUnlockedLeads(data.leads || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingUnlocked(false);
    }
  }, []);

  const loadProCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/pro');
      if (res.ok) {
        const data = await res.json();
        setProCredits(data);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadAvailableLeads();
      loadUnlockedLeads();
      loadProCredits();
    }
  }, [user, loadAvailableLeads, loadUnlockedLeads, loadProCredits]);

  // --- Actions ---

  const handleUnlockLead = async (lead: AvailableLead) => {
    setUnlockingLeadId(lead.id);
    setConfirmUnlock(null);
    setMessage(null);

    try {
      const res = await fetch('/api/leads/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_request_id: lead.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to unlock lead' });
        return;
      }

      if (data.unlocked) {
        // Used a credit — no payment needed
        setMessage({ type: 'success', text: 'Lead unlocked with included credit! Check Unlocked Leads.' });
        setActiveTab('unlocked');
        loadAvailableLeads();
        loadUnlockedLeads();
        loadProCredits();
      } else if (data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setUnlockingLeadId(null);
    }
  };

  const handleRefundRequest = async () => {
    if (!refundLeadId || !refundReason) return;

    setSubmittingRefund(true);
    try {
      const res = await fetch('/api/leads/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_unlock_id: refundLeadId,
          reason: refundReason,
          evidence: refundEvidence || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Refund request submitted. We\'ll review it within 24-48 hours.' });
        setRefundLeadId(null);
        setRefundReason('');
        setRefundEvidence('');
        loadUnlockedLeads();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit refund request' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setSubmittingRefund(false);
    }
  };

  // --- Filtering ---

  const filteredAvailable = availableLeads.filter((lead) => {
    const matchesFilter = filter === 'all' || (lead.service_type || '').toLowerCase().includes(filter.toLowerCase());
    const matchesSearch =
      searchTerm === '' ||
      (lead.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.zip_code || '').includes(searchTerm) ||
      (lead.service_type || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredUnlocked = unlockedLeads.filter((lead) => {
    const qr = lead.quote_request;
    if (!qr) return false;
    const matchesSearch =
      searchTerm === '' ||
      (qr.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (qr.zip_code || '').includes(searchTerm) ||
      (qr.service_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (qr.customer?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // --- Competition Bar ---

  const CompetitionBar = ({ count, remaining }: { count: number; remaining: number }) => (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${
              i < count ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${remaining <= 1 ? 'text-red-600' : 'text-gray-500'}`}>
        {remaining === 0 ? 'Full' : `${remaining} spot${remaining === 1 ? '' : 's'} left`}
      </span>
    </div>
  );

  // --- Render ---

  const isLoading = activeTab === 'available' ? loadingAvailable : loadingUnlocked;

  if (isLoading && availableLeads.length === 0 && unlockedLeads.length === 0) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading leads...</p>
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
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center">
                <Link
                  href="/dashboard/cleaner"
                  className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Find and unlock customer leads in your area
                  </p>
                </div>
              </div>

              {/* Credits + Spending Cap */}
              <div className="flex items-center gap-3">
                {proCredits?.credits && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">
                    <div className="flex items-center gap-2">
                      {proCredits.credits.is_unlimited ? (
                        <>
                          <Crown className="h-5 w-5 text-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">Unlimited Credits</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">
                            {proCredits.credits.remaining} credits left
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {proCredits?.spending_cap && (
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg px-4 py-2 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatCents(proCredits.spending_cap.remaining_cents)} cap left
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Message Banner */}
          {message && (
            <div
              className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'available'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Available Leads
              {availableLeads.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {availableLeads.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('unlocked')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'unlocked'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Unlocked Leads
              {unlockedLeads.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                  {unlockedLeads.length}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'available'
                      ? 'Search by city, ZIP, or service type...'
                      : 'Search by name, city, or service type...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {activeTab === 'available' && (
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Services</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="deep">Deep Cleaning</option>
                    <option value="move">Move In/Out</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">{availableLeads.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Unlocked</p>
              <p className="text-2xl font-bold text-emerald-600">{unlockedLeads.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">New Today</p>
              <p className="text-2xl font-bold text-blue-600">
                {availableLeads.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Hot Leads</p>
              <p className="text-2xl font-bold text-orange-600">
                {availableLeads.filter((l) => l.competition_remaining <= 1).length}
              </p>
            </div>
          </div>

          {/* ======= AVAILABLE LEADS TAB ======= */}
          {activeTab === 'available' && (
            <>
              {filteredAvailable.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No leads available</h3>
                  <p className="text-gray-600">
                    New leads in your service areas will appear here. Make sure you have service areas configured.
                  </p>
                  <Link
                    href="/dashboard/cleaner/service-areas"
                    className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Manage Service Areas
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAvailable.map((lead) => (
                    <div
                      key={lead.id}
                      className={`bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition ${
                        lead.competition_remaining <= 1 ? 'ring-2 ring-orange-200' : ''
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {(lead.service_type || '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Competition indicator */}
                      <div className="mb-3">
                        <CompetitionBar count={lead.competition_count} remaining={lead.competition_remaining} />
                      </div>

                      {/* Lead info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{lead.city}, {lead.zip_code}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {lead.service_date
                              ? new Date(lead.service_date).toLocaleDateString()
                              : 'Flexible date'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>{lead.property_type} - {lead.property_size}</span>
                        </div>
                        {lead.frequency && lead.frequency !== 'one-time' && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="capitalize">{lead.frequency}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact hidden notice */}
                      <div className="border-t pt-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Lock className="h-4 w-4" />
                          <span>Unlock to see contact info</span>
                        </div>
                      </div>

                      {/* Unlock button */}
                      <button
                        onClick={() => setConfirmUnlock(lead)}
                        disabled={unlockingLeadId === lead.id || lead.competition_remaining === 0}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition ${
                          lead.competition_remaining === 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                        }`}
                      >
                        {unlockingLeadId === lead.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : lead.competition_remaining === 0 ? (
                          'No spots left'
                        ) : (
                          <>
                            <Unlock className="h-4 w-4" />
                            Unlock for {getUnlockPrice(lead.service_type)}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ======= UNLOCKED LEADS TAB ======= */}
          {activeTab === 'unlocked' && (
            <>
              {filteredUnlocked.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Unlock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No unlocked leads yet</h3>
                  <p className="text-gray-600">
                    Unlock available leads to see full customer contact info.
                  </p>
                  <button
                    onClick={() => setActiveTab('available')}
                    className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Browse Available Leads
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUnlocked.map((lead) => {
                    const qr = lead.quote_request;
                    if (!qr) return null;

                    return (
                      <div key={lead.id} className="bg-white rounded-lg shadow-sm p-5">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Left: Customer info */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                                {(qr.service_type || '').replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                Unlocked {new Date(lead.unlocked_at).toLocaleDateString()}
                              </span>
                              {lead.refund_status && (
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    lead.refund_status === 'approved'
                                      ? 'bg-green-100 text-green-700'
                                      : lead.refund_status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  Refund {lead.refund_status}
                                </span>
                              )}
                            </div>

                            {/* Customer contact */}
                            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                              <p className="font-semibold text-gray-900">{qr.customer?.full_name}</p>
                              {qr.customer?.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Mail className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={`mailto:${qr.customer.email}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {qr.customer.email}
                                  </a>
                                </div>
                              )}
                              {qr.customer?.phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <Phone className="h-4 w-4 text-blue-500" />
                                  <a
                                    href={`tel:${qr.customer.phone}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {qr.customer.phone}
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Job details */}
                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{qr.address ? `${qr.address}, ` : ''}{qr.city}, {qr.zip_code}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span>
                                  {qr.service_date
                                    ? new Date(qr.service_date).toLocaleDateString()
                                    : 'Flexible'}
                                  {qr.service_time && ` at ${qr.service_time}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span>{qr.property_type} - {qr.property_size}</span>
                              </div>
                              {qr.frequency && qr.frequency !== 'one-time' && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span className="capitalize">{qr.frequency}</span>
                                </div>
                              )}
                            </div>

                            {qr.description && (
                              <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">{qr.description}</p>
                            )}
                            {qr.special_requests && (
                              <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                                <strong>Special:</strong> {qr.special_requests}
                              </p>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-row md:flex-col gap-2 md:w-40">
                            <div className="text-center bg-gray-50 rounded-lg p-3 mb-2">
                              <p className="text-xs text-gray-500">Paid</p>
                              <p className="text-lg font-bold text-gray-900">
                                {lead.amount_cents > 0 ? formatCents(lead.amount_cents) : 'Credit'}
                              </p>
                            </div>
                            {!lead.refund_status && (
                              <button
                                onClick={() => setRefundLeadId(lead.id)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition"
                              >
                                Request Refund
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ======= UNLOCK CONFIRMATION MODAL ======= */}
        {confirmUnlock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-2">Unlock This Lead?</h3>
              <p className="text-gray-600 mb-4">
                You&apos;ll get full access to the customer&apos;s contact information including name, phone, and email.
              </p>

              <div className="bg-gray-50 rounded-md p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium">{(confirmUnlock.service_type || '').replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Location</span>
                  <span className="font-medium">{confirmUnlock.city}, {confirmUnlock.zip_code}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Competition</span>
                  <span className="font-medium">
                    {confirmUnlock.competition_count} of 3 pros
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-gray-600">Unlock fee</span>
                  <span className="font-bold text-gray-900">
                    {proCredits?.credits && (proCredits.credits.is_unlimited || proCredits.credits.remaining > 0)
                      ? 'Included credit'
                      : getUnlockPrice(confirmUnlock.service_type)}
                  </span>
                </div>
              </div>

              {confirmUnlock.competition_remaining <= 1 && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <span className="text-sm text-orange-700">
                    Only {confirmUnlock.competition_remaining} spot left! Act fast.
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmUnlock(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnlockLead(confirmUnlock)}
                  disabled={unlockingLeadId !== null}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition flex items-center justify-center gap-2"
                >
                  {unlockingLeadId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Unlock Lead
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======= REFUND REQUEST MODAL ======= */}
        {refundLeadId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-2">Request a Refund</h3>
              <p className="text-gray-600 mb-4">
                Select a reason for the refund. Our team will review within 24-48 hours.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a reason...</option>
                    <option value="wrong_contact_info">Wrong contact information</option>
                    <option value="outside_service_area">Outside my service area</option>
                    <option value="not_a_real_lead">Not a real lead</option>
                    <option value="duplicate_lead">Duplicate lead</option>
                    <option value="customer_cancelled_before_contact">Customer cancelled before I contacted them</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Evidence (optional)
                  </label>
                  <textarea
                    value={refundEvidence}
                    onChange={(e) => setRefundEvidence(e.target.value)}
                    placeholder="Describe the issue..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setRefundLeadId(null);
                    setRefundReason('');
                    setRefundEvidence('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundRequest}
                  disabled={!refundReason || submittingRefund}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  {submittingRefund ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Refund Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
