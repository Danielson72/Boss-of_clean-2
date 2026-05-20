'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  Settings, FileText, Clock, CheckCircle,
  XCircle, AlertCircle, Calendar, MapPin, DollarSign,
  MessageSquare, Star, Home,
  Gift, ThumbsUp, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface QuoteRequest {
  id: string;
  cleaner_id: string;
  service_type: string;
  service_date: string | null;
  service_time: string | null;
  address: string;
  city: string;
  zip_code: string;
  description: string;
  status: 'pending' | 'responded' | 'accepted' | 'completed' | 'cancelled';
  quoted_price?: number;
  response_message?: string;
  created_at: string;
  cleaner: {
    business_name: string;
    business_phone: string;
  } | null;
}

interface CustomerCredit {
  id: string;
  amount_cents: number;
  reason: string;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [confirmedQuotes, setConfirmedQuotes] = useState<Set<string>>(new Set());
  const [confirmingHire, setConfirmingHire] = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quotes');
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadQuotes();
      // DLD-460: loadCredits() disabled until loyalty/referral program ships.
      // loadCredits();
      // DLD-464: loadProfile() moved to /dashboard/customer/profile standalone page.
      loadHireConfirmations();
    }
  }, [user]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          cleaner:pros(
            business_name,
            business_phone
          )
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      // Error loading quotes - silently fail for client component
    } finally {
      setLoading(false);
    }
  };

  const loadCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_credits')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch {
      // silently fail
    }
  };

  const loadHireConfirmations = async () => {
    try {
      const { data, error } = await supabase
        .from('hire_confirmations')
        .select('quote_request_id')
        .eq('customer_id', user?.id);

      if (error) throw error;
      setConfirmedQuotes(new Set((data || []).map(h => h.quote_request_id)));
    } catch {
      // silently fail
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    setAcceptingQuote(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept quote');
      }

      setMessage('Quote accepted! A booking has been created. Check My Bookings for details.');
      await loadQuotes();
      setTimeout(() => setMessage(''), 5000);
    } catch (err) {
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Error accepting quote. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setAcceptingQuote(null);
    }
  };

  const handleConfirmHire = async (quoteId: string, cleanerId: string) => {
    if (!user?.id) return;
    setConfirmingHire(quoteId);

    try {
      // 1. Create hire confirmation
      const { data: confirmation, error: confirmError } = await supabase
        .from('hire_confirmations')
        .insert({
          quote_request_id: quoteId,
          customer_id: user.id,
          cleaner_id: cleanerId,
        })
        .select('id')
        .single();

      if (confirmError) throw confirmError;

      // DLD-460: Credit issuance disabled until loyalty/referral program ships.
      // Re-enable the block below (and uncomment loadCredits in useEffect) when
      // the Credits tab is restored.
      // // 2. Issue $10 credit
      // const { error: creditError } = await supabase
      //   .from('customer_credits')
      //   .insert({
      //     customer_id: user.id,
      //     amount_cents: 1000,
      //     reason: 'hire_confirmation',
      //     source_hire_confirmation_id: confirmation.id,
      //   });
      //
      // if (creditError) throw creditError;
      //
      // // 3. Mark credit as issued
      // await supabase
      //   .from('hire_confirmations')
      //   .update({ credit_issued: true })
      //   .eq('id', confirmation.id);

      // 4. Refresh state
      setConfirmedQuotes(prev => { const next = new Set(Array.from(prev)); next.add(quoteId); return next; });
      // await loadCredits();
      setMessage('Hire confirmed! Thanks for letting us know.');
      setTimeout(() => setMessage(''), 5000);
    } catch {
      setMessage('Error confirming hire. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setConfirmingHire(null);
    }
  };

  const availableCredits = credits
    .filter(c => !c.redeemed && new Date(c.expires_at) > new Date())
    .reduce((sum, c) => sum + c.amount_cents, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'responded': return 'text-blue-600 bg-blue-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />;
      case 'responded': return <MessageSquare className="h-5 w-5" />;
      case 'accepted': return <CheckCircle className="h-5 w-5" />;
      case 'completed': return <Star className="h-5 w-5" />;
      case 'cancelled': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Flexible';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Flexible';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'Flexible';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    if (isNaN(hour)) return 'Flexible';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-brand-cream">
        {/* Header — branded, mobile-responsive */}
        <div className="bg-brand-dark border-b border-brand-gold/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-cream">Customer Dashboard</h1>
                <div className="mt-2 h-[3px] w-10 rounded-full bg-brand-gold" />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href="/search"
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-md bg-brand-gold px-4 py-2.5 font-medium text-brand-dark transition hover:bg-brand-gold-light"
                >
                  <Home className="h-5 w-5" />
                  Find Pros
                </Link>
                <Link
                  href="/quote-request"
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-md border border-brand-cream/30 bg-white/5 px-4 py-2.5 font-medium text-brand-cream transition hover:bg-white/10"
                >
                  <FileText className="h-5 w-5" />
                  Request Quote
                </Link>
                <Link
                  href="/dashboard/messages"
                  className="flex items-center gap-2 px-2 py-2.5 font-medium text-brand-cream/80 transition hover:text-brand-cream"
                >
                  <MessageSquare className="h-5 w-5 text-brand-gold" />
                  <span className="sm:hidden lg:inline">Messages</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-2 py-2.5 text-brand-cream/80 transition hover:text-brand-cream"
                >
                  <Settings className="h-5 w-5 text-brand-gold" />
                  <span className="sm:hidden lg:inline">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-brand-dark/5 border-t-[3px] border-t-brand-gold p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Quotes</p>
                  <p className="font-display text-3xl font-bold text-brand-dark">{quotes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-brand-gold" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-brand-dark/5 border-t-[3px] border-t-brand-navy p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="font-display text-3xl font-bold text-brand-navy">
                    {quotes.filter(q => q.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-brand-navy" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-brand-dark/5 border-t-[3px] border-t-brand-gold p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="font-display text-3xl font-bold text-brand-dark">
                    {quotes.filter(q => ['responded', 'accepted'].includes(q.status)).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-brand-gold" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-brand-dark/5 border-t-[3px] border-t-brand-navy p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="font-display text-3xl font-bold text-brand-navy">
                    {quotes.filter(q => q.status === 'completed').length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-brand-navy" />
              </div>
            </div>

            {/* DLD-460: Credits stats card hidden until loyalty/referral program ships. */}
            {false && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Credits</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${(availableCredits / 100).toFixed(0)}
                    </p>
                  </div>
                  <Gift className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            )}
          </div>

          {/* Global message */}
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('Error')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.includes('Error') ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                {message}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                    activeTab === 'quotes'
                      ? 'border-brand-gold text-brand-dark'
                      : 'border-transparent text-gray-500 hover:text-brand-dark'
                  }`}
                >
                  Quote Requests
                </button>
                {/* DLD-460: My Credits tab hidden until loyalty/referral program ships. */}
                {false && (
                  <button
                    onClick={() => setActiveTab('credits')}
                    className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                      activeTab === 'credits'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Credits
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'quotes' && (
                <div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-gold mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading quotes...</p>
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No quote requests yet</h3>
                      <p className="text-gray-600 mb-6">
                        Start by searching for pros in your area
                      </p>
                      <Link
                        href="/search"
                        className="inline-flex items-center px-4 py-2 bg-brand-gold text-brand-dark font-medium rounded-md hover:bg-brand-gold-light transition duration-300"
                      >
                        Find Pros
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quotes.map((quote) => (
                        <div key={quote.id} className="border rounded-lg p-6 hover:shadow-md transition duration-300">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {quote.cleaner?.business_name || 'Unknown Business'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(quote.status)}`}>
                                  {getStatusIcon(quote.status)}
                                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Service Date: {formatDate(quote.service_date)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Time: {formatTime(quote.service_time)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{quote.city}, {quote.zip_code}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4" />
                                    <span>Service: {quote.service_type}</span>
                                  </div>
                                  {quote.quoted_price && (
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      <span className="font-semibold text-green-600">
                                        Quote: ${quote.quoted_price}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {quote.response_message && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-700">
                                    <strong>Response:</strong> {quote.response_message}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4">
                              {quote.status === 'responded' && (
                                <button
                                  onClick={() => handleAcceptQuote(quote.id)}
                                  disabled={acceptingQuote === quote.id}
                                  className="text-sm bg-brand-dark text-brand-cream px-4 py-2 rounded-md hover:bg-brand-navy disabled:opacity-50 transition duration-300 flex items-center gap-1.5 font-medium"
                                >
                                  {acceptingQuote === quote.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-brand-gold" />
                                  )}
                                  Accept Quote
                                </button>
                              )}
                              {quote.status === 'accepted' && (
                                <div className="text-sm space-y-2">
                                  <div className="text-gray-600">
                                    <p className="font-medium">Contact:</p>
                                    <p>{quote.cleaner?.business_phone || 'N/A'}</p>
                                  </div>
                                  {!confirmedQuotes.has(quote.id) ? (
                                    <button
                                      onClick={() => handleConfirmHire(quote.id, quote.cleaner_id)}
                                      disabled={confirmingHire === quote.id}
                                      className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 transition duration-300 text-xs font-medium"
                                    >
                                      {confirmingHire === quote.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <ThumbsUp className="h-3 w-3" />
                                      )}
                                      Confirm Hire
                                    </button>
                                  ) : (
                                    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                                      <CheckCircle className="h-3 w-3" />
                                      Hire Confirmed
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DLD-460: Credits tab content hidden until loyalty/referral program ships. */}
              {false && activeTab === 'credits' && (
                <div>
                  {/* Credits Balance */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3">
                      <Gift className="h-8 w-8 text-emerald-600" />
                      <div>
                        <p className="text-sm text-emerald-700 font-medium">Available Balance</p>
                        <p className="text-3xl font-bold text-emerald-800">
                          ${(availableCredits / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 mt-2">
                      Earn $10 each time you confirm a hire. Credits expire 90 days after issue.
                    </p>
                  </div>

                  {/* Credits History */}
                  {credits.length === 0 ? (
                    <div className="text-center py-12">
                      <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No credits yet</h3>
                      <p className="text-gray-600">
                        Confirm a hire from an accepted quote to earn your first $10 credit.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Credit History</h3>
                      {credits.map((credit) => {
                        const isExpired = new Date(credit.expires_at) < new Date();
                        const statusLabel = credit.redeemed ? 'Redeemed' : isExpired ? 'Expired' : 'Active';
                        const statusColor = credit.redeemed
                          ? 'text-blue-600 bg-blue-100'
                          : isExpired
                            ? 'text-red-600 bg-red-100'
                            : 'text-emerald-600 bg-emerald-100';

                        return (
                          <div key={credit.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 rounded-full">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  ${(credit.amount_cents / 100).toFixed(2)} Credit
                                </p>
                                <p className="text-xs text-gray-500">
                                  {credit.reason === 'hire_confirmation' ? 'Hire Confirmation Bonus' : credit.reason}
                                  {' \u00B7 '}
                                  {new Date(credit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                {statusLabel}
                              </span>
                              {!credit.redeemed && !isExpired && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Expires {new Date(credit.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}