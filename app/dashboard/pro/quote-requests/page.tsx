'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  DollarSign,
  MessageSquare,
  Filter,
  Search,
  Send,
  Loader2,
  Inbox,
  Home,
} from 'lucide-react';
import Link from 'next/link';
import {
  getMarketplaceQuotes,
  respondToQuote,
  type MarketplaceQuote,
} from './actions';

const statusConfig: Record<
  string,
  { label: string; bgClass: string; textClass: string; icon: typeof Clock }
> = {
  pending: { label: 'New', bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', icon: Clock },
  responded: { label: 'Responded', bgClass: 'bg-blue-100', textClass: 'text-blue-700', icon: MessageSquare },
  accepted: { label: 'Accepted', bgClass: 'bg-green-100', textClass: 'text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', bgClass: 'bg-gray-100', textClass: 'text-gray-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', bgClass: 'bg-red-100', textClass: 'text-red-700', icon: XCircle },
};

export default function QuoteRequestsPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<MarketplaceQuote[]>([]);
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Response form state
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responsePrice, setResponsePrice] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [responseDate, setResponseDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadQuotes();
  }, [user]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMarketplaceQuotes();
      if (result.success) {
        setQuotes(result.quotes || []);
        setCleanerId(result.cleanerId || null);
      } else {
        setError(result.error || 'Failed to load quotes');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    const price = parseFloat(responsePrice);
    if (!price || price < 1) {
      setError('Please enter a valid price');
      return;
    }
    if (!responseMessage.trim()) {
      setError('Please include a message');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await respondToQuote(
        quoteId,
        price,
        responseMessage,
        responseDate || undefined
      );

      if (result.success) {
        setSuccessMsg('Quote sent! The customer has been notified.');
        setRespondingTo(null);
        setResponsePrice('');
        setResponseMessage('');
        setResponseDate('');
        await loadQuotes();
      } else {
        setError(result.error || 'Failed to send quote');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter logic
  const filteredQuotes = quotes.filter((q) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'mine' && q.cleaner_id === cleanerId) ||
      (filter === 'available' && q.cleaner_id === null) ||
      q.status === filter;
    const matchesSearch =
      searchTerm === '' ||
      (q.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.zip_code || '').includes(searchTerm) ||
      (q.service_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const availableCount = quotes.filter((q) => q.cleaner_id === null && q.status === 'pending').length;
  const myCount = quotes.filter((q) => q.cleaner_id === cleanerId).length;

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading quote requests...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
                <p className="text-sm text-gray-600 mt-1">
                  View and respond to customer requests in your area
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Messages */}
          {successMsg && (
            <div className="rounded-lg p-4 mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium">{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
            </div>
          )}
          {error && (
            <div className="rounded-lg p-4 mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-800">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-yellow-600">{availableCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">My Quotes</p>
              <p className="text-2xl font-bold text-blue-600">{myCount}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">New Today</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter((q) => q.cleaner_id === null && new Date(q.created_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, city, ZIP, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Quotes</option>
                  <option value="available">Available</option>
                  <option value="mine">My Quotes</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quote List */}
          {filteredQuotes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Inbox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quote requests found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {filter !== 'all'
                  ? 'No quotes match your current filter. Try changing the filter.'
                  : 'New quote requests from customers will appear here. Make sure your profile is complete and approved.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => {
                const isMine = quote.cleaner_id === cleanerId;
                const isAvailable = quote.cleaner_id === null && quote.status === 'pending';

                return (
                  <div
                    key={quote.id}
                    className={`bg-white rounded-lg shadow-sm hover:shadow-md transition ${
                      isAvailable ? 'border-l-4 border-yellow-400' : isMine ? 'border-l-4 border-blue-400' : ''
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        {/* Left: Quote details */}
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              {(quote.service_type || '').replace(/_/g, ' ')}
                            </span>
                            {getStatusBadge(quote.status)}
                            {isAvailable && (
                              <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded border border-yellow-200">
                                Available
                              </span>
                            )}
                            {isMine && (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
                                Your Quote
                              </span>
                            )}
                          </div>

                          {/* Customer name */}
                          <p className="text-lg font-semibold text-gray-900 mb-2">
                            {quote.contact_name || 'Customer Request'}
                          </p>

                          {/* Details grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>{quote.city}, {quote.zip_code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>
                                {quote.service_date
                                  ? new Date(quote.service_date + 'T00:00:00').toLocaleDateString()
                                  : 'Flexible date'}
                              </span>
                            </div>
                            {quote.property_type && (
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="capitalize">{quote.property_type}{quote.property_size ? ` - ${quote.property_size}` : ''}</span>
                              </div>
                            )}
                            {quote.frequency && quote.frequency !== 'one-time' && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="capitalize">{quote.frequency}</span>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {quote.description && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <p className="text-sm text-gray-700">{quote.description}</p>
                            </div>
                          )}

                          {/* Contact info (only visible for claimed quotes) */}
                          {isMine && quote.contact_email && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-md space-y-1">
                              <p className="text-sm font-medium text-blue-900">Contact Info</p>
                              <p className="text-sm text-blue-700">
                                Email: <a href={`mailto:${quote.contact_email}`} className="underline">{quote.contact_email}</a>
                              </p>
                              {quote.contact_phone && (
                                <p className="text-sm text-blue-700">
                                  Phone: <a href={`tel:${quote.contact_phone}`} className="underline">{quote.contact_phone}</a>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Your response (if already responded) */}
                          {isMine && quote.quoted_price && (
                            <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-semibold text-green-800">
                                  Your Quote: ${quote.quoted_price}
                                </span>
                              </div>
                              {quote.response_message && (
                                <p className="text-sm text-green-700">{quote.response_message}</p>
                              )}
                              {quote.responded_at && (
                                <p className="text-xs text-green-600 mt-1">
                                  Sent {new Date(quote.responded_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 lg:w-64 flex-shrink-0">
                          <p className="text-xs text-gray-500 text-right">
                            {new Date(quote.created_at).toLocaleDateString()}
                          </p>

                          {/* Send Quote form */}
                          {isAvailable && respondingTo === quote.id && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                              <h4 className="font-medium text-gray-900 text-sm">Send Your Quote</h4>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Your Price ($) *</label>
                                <input
                                  type="number"
                                  value={responsePrice}
                                  onChange={(e) => setResponsePrice(e.target.value)}
                                  placeholder="150"
                                  min="1"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Availability Date</label>
                                <input
                                  type="date"
                                  value={responseDate}
                                  onChange={(e) => setResponseDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Message *</label>
                                <textarea
                                  value={responseMessage}
                                  onChange={(e) => setResponseMessage(e.target.value)}
                                  placeholder="Hi! I'd love to help with your cleaning needs..."
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSendQuote(quote.id)}
                                  disabled={submitting || !responsePrice || !responseMessage.trim()}
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition"
                                >
                                  {submitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                  ) : (
                                    <><Send className="h-4 w-4" /> Send Quote</>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setRespondingTo(null);
                                    setResponsePrice('');
                                    setResponseMessage('');
                                    setResponseDate('');
                                    setError(null);
                                  }}
                                  className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Respond button */}
                          {isAvailable && respondingTo !== quote.id && (
                            <button
                              onClick={() => {
                                setRespondingTo(quote.id);
                                setError(null);
                                setSuccessMsg(null);
                              }}
                              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 transition"
                            >
                              <Send className="h-4 w-4" />
                              Send Quote
                            </button>
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
