'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  MessageSquare,
  Filter,
  Search,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/quote-requests/page.tsx' });

interface QuoteRequest {
  id: string;
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date: string;
  preferred_time: string;
  zip_code: string;
  address: string;
  city: string;
  special_instructions: string;
  budget_range: string;
  status: string;
  customer_message: string;
  cleaner_response: string;
  quoted_price: number | null;
  created_at: string;
  cleaner_id: string | null;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  };
}

type IconComponent = React.ComponentType<{ className?: string }>;

const statusConfig: Record<string, { label: string; color: string; icon: IconComponent }> = {
  pending: { label: 'Pending', color: 'yellow', icon: Clock },
  responded: { label: 'Responded', color: 'blue', icon: MessageSquare },
  accepted: { label: 'Accepted', color: 'green', icon: CheckCircle },
  completed: { label: 'Completed', color: 'gray', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
};

export default function QuoteRequestsPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responsePrice, setResponsePrice] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myCleanerId, setMyCleanerId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadQuotes();
    }
  }, [user]);

  const loadQuotes = async () => {
    try {
      setLoading(true);

      // Get cleaner ID first
      const { data: cleanerData } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!cleanerData) {
        setLoading(false);
        return;
      }

      setMyCleanerId(cleanerData.id);

      // Get quote requests for this cleaner's service areas
      const { data: serviceAreas } = await supabase
        .from('cleaner_service_areas')
        .select('zip_code')
        .eq('cleaner_id', cleanerData.id);

      const zipCodes = serviceAreas?.map((sa) => sa.zip_code) || [];

      // Fetch own claimed quotes (with full contact info)
      const { data: ownQuotes, error: ownError } = await supabase
        .from('quote_requests')
        .select(
          `
          *,
          customer:users!quote_requests_customer_id_fkey(
            full_name,
            email,
            phone
          )
        `
        )
        .eq('cleaner_id', cleanerData.id)
        .order('created_at', { ascending: false });

      if (ownError) throw ownError;

      if (zipCodes.length === 0) {
        setQuotes(ownQuotes || []);
      } else {
        // Fetch unclaimed area quotes (contact info redacted - only full_name)
        const { data: areaQuotes, error: areaError } = await supabase
          .from('quote_requests')
          .select(
            `
            *,
            customer:users!quote_requests_customer_id_fkey(
              full_name
            )
          `
          )
          .in('zip_code', zipCodes)
          .is('cleaner_id', null)
          .order('created_at', { ascending: false });

        if (areaError) throw areaError;

        // Merge: own quotes first, then area quotes (deduplicated)
        const ownIds = new Set((ownQuotes || []).map((q: QuoteRequest) => q.id));
        const merged = [
          ...(ownQuotes || []),
          ...(areaQuotes || []).filter((q: QuoteRequest) => !ownIds.has(q.id)),
        ];
        setQuotes(merged);
      }
    } catch (error) {
      logger.error('Error loading quotes', { function: 'loadQuotes', error });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (quoteId: string) => {
    if (!responsePrice || !responseMessage) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('quote_requests')
        .update({
          status: 'responded',
          quoted_price: parseFloat(responsePrice),
          cleaner_response: responseMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (error) throw error;

      // Refresh quotes
      await loadQuotes();
      setRespondingTo(null);
      setResponsePrice('');
      setResponseMessage('');
    } catch (error) {
      logger.error('Error responding to quote', { function: 'handleRespond', error });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const matchesFilter = filter === 'all' || quote.status === filter;
    const matchesSearch =
      searchTerm === '' ||
      quote.customer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.zip_code?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-${config.color}-100 text-${config.color}-700`}
      >
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                href="/dashboard/cleaner"
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
                <p className="text-sm text-gray-600 mt-1">
                  View and respond to customer quote requests in your service areas
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name, city, or ZIP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="responded">Responded</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {quotes.filter((q) => q.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Responded</p>
              <p className="text-2xl font-bold text-blue-600">
                {quotes.filter((q) => q.status === 'responded').length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter((q) => q.status === 'accepted').length}
              </p>
            </div>
          </div>

          {/* Quote List */}
          {filteredQuotes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quote requests found</h3>
              <p className="text-gray-600">
                {filter !== 'all'
                  ? `No ${filter} quote requests at this time.`
                  : 'Quote requests from customers in your service areas will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Quote Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {quote.customer?.full_name || 'Customer'}
                        </h3>
                        {getStatusBadge(quote.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span>
                            {quote.service_type?.replace('_', ' ')} - {quote.property_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {quote.preferred_date
                              ? new Date(quote.preferred_date).toLocaleDateString()
                              : 'Flexible'}
                            {quote.preferred_time && ` at ${quote.preferred_time}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>
                            {quote.city}, {quote.zip_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>Budget: {quote.budget_range || 'Not specified'}</span>
                        </div>
                        {quote.cleaner_id === myCleanerId ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span>{quote.customer?.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span>{quote.customer?.phone || 'Not provided'}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 col-span-2">
                            <Lock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500 italic">Contact info available after claiming</span>
                          </div>
                        )}
                      </div>

                      {quote.special_instructions && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {quote.special_instructions}
                          </p>
                        </div>
                      )}

                      {quote.quoted_price && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-blue-700">
                            <strong>Your Quote:</strong> ${quote.quoted_price}
                          </p>
                          {quote.cleaner_response && (
                            <p className="text-sm text-blue-600 mt-1">{quote.cleaner_response}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {quote.status === 'pending' && (
                        <>
                          {respondingTo === quote.id ? (
                            <div className="bg-gray-50 p-4 rounded-lg w-72">
                              <h4 className="font-medium text-gray-900 mb-3">Send Quote</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm text-gray-600 mb-1">
                                    Your Price ($)
                                  </label>
                                  <input
                                    type="number"
                                    value={responsePrice}
                                    onChange={(e) => setResponsePrice(e.target.value)}
                                    placeholder="150"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm text-gray-600 mb-1">Message</label>
                                  <textarea
                                    value={responseMessage}
                                    onChange={(e) => setResponseMessage(e.target.value)}
                                    placeholder="Include details about your service..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRespond(quote.id)}
                                    disabled={submitting || !responsePrice || !responseMessage}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition"
                                  >
                                    {submitting ? 'Sending...' : 'Send Quote'}
                                  </button>
                                  <button
                                    onClick={() => setRespondingTo(null)}
                                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRespondingTo(quote.id)}
                              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
                            >
                              Respond
                            </button>
                          )}
                        </>
                      )}
                      <p className="text-xs text-gray-500 text-center">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
