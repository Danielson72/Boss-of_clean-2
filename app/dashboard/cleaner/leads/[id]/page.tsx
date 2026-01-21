'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Home,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Coins,
  User,
  FileText,
  Send,
  Loader2,
} from 'lucide-react';
import { getLeadById, respondToLead, declineLead, type LeadMatch, type CleanerLeadCredits } from '../actions';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'New Lead', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  viewed: { label: 'Awaiting Response', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  responded: { label: 'Quote Sent', color: 'text-green-700', bgColor: 'bg-green-100' },
  declined: { label: 'Declined', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  expired: { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const serviceTypeLabels: Record<string, string> = {
  residential: 'Residential Cleaning',
  commercial: 'Commercial Cleaning',
  deep_cleaning: 'Deep Cleaning',
  move_in_out: 'Move In/Out Cleaning',
  recurring: 'Recurring Service',
};

const propertyTypeLabels: Record<string, string> = {
  home: 'House',
  condo: 'Condo',
  apartment: 'Apartment',
  office: 'Office',
  other: 'Other',
};

const flexibilityLabels: Record<string, string> = {
  exact: 'Must be this date',
  flexible: 'Flexible timing',
  asap: 'As soon as possible',
};

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} days, ${hours % 24} hours`;
  }

  return `${hours} hours, ${minutes} minutes`;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<LeadMatch | null>(null);
  const [credits, setCredits] = useState<CleanerLeadCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response form state
  const [quoteAmount, setQuoteAmount] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadLead();
  }, [leadId]);

  const loadLead = async () => {
    setLoading(true);
    const result = await getLeadById(leadId);
    if (result.success && result.lead) {
      setLead(result.lead);
      setCredits(result.credits || null);

      // Pre-fill availability with preferred date if available
      if (result.lead.quote_request.preferred_date) {
        setAvailabilityDate(result.lead.quote_request.preferred_date);
      }
    } else {
      setError(result.error || 'Failed to load lead');
    }
    setLoading(false);
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!quoteAmount || parseFloat(quoteAmount) <= 0) {
      setSubmitError('Please enter a valid quote amount');
      return;
    }

    if (!availabilityDate) {
      setSubmitError('Please select your availability date');
      return;
    }

    setSubmitting(true);
    const result = await respondToLead(
      leadId,
      parseFloat(quoteAmount),
      availabilityDate,
      message || undefined
    );

    if (result.success) {
      // Reload to show updated status
      await loadLead();
    } else {
      setSubmitError(result.error || 'Failed to submit quote');
    }
    setSubmitting(false);
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this lead? This action cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    const result = await declineLead(leadId);
    if (result.success) {
      router.push('/dashboard/cleaner/leads');
    } else {
      setSubmitError(result.error || 'Failed to decline lead');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">{error || 'Lead not found'}</p>
          <Link
            href="/dashboard/cleaner/leads"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Return to Leads
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[lead.status];
  const canRespond = ['pending', 'viewed'].includes(lead.status);
  const isExpired = new Date(lead.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/cleaner/leads"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color} mt-1`}>
                  {status.label}
                </span>
              </div>
            </div>

            {credits && credits.subscription_tier === 'free' && canRespond && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    <strong>{credits.lead_credits_remaining}</strong> credits remaining
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lead Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Request</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {serviceTypeLabels[lead.quote_request.service_type] || lead.quote_request.service_type}
                    </p>
                    <p className="text-sm text-gray-500">Service Type</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Home className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {propertyTypeLabels[lead.quote_request.property_type] || lead.quote_request.property_type}
                      {lead.quote_request.sqft_estimate && ` - ${lead.quote_request.sqft_estimate.toLocaleString()} sq ft`}
                    </p>
                    {lead.quote_request.bedrooms && lead.quote_request.bathrooms && (
                      <p className="text-sm text-gray-500">
                        {lead.quote_request.bedrooms} bedrooms, {lead.quote_request.bathrooms} bathrooms
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {lead.quote_request.city
                        ? `${lead.quote_request.city}, FL ${lead.quote_request.zip_code}`
                        : lead.quote_request.zip_code}
                    </p>
                    <p className="text-sm text-gray-500">Service Location</p>
                  </div>
                </div>

                {lead.quote_request.preferred_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(lead.quote_request.preferred_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        {flexibilityLabels[lead.quote_request.flexibility] || lead.quote_request.flexibility}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{lead.quote_request.contact_name}</p>
                    <p className="text-sm text-gray-500">Customer Name</p>
                  </div>
                </div>

                {lead.quote_request.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes:</p>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {lead.quote_request.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Your Response (if responded) */}
            {lead.status === 'responded' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Your Quote Response
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-700" />
                    <span className="text-lg font-semibold text-green-900">
                      ${lead.quote_amount?.toLocaleString()}
                    </span>
                  </div>

                  {lead.availability_date && (
                    <div className="flex items-center gap-2 text-green-800">
                      <Calendar className="h-5 w-5 text-green-700" />
                      <span>
                        Available: {new Date(lead.availability_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {lead.response_message && (
                    <div className="pt-3 border-t border-green-200">
                      <p className="text-sm text-green-800">{lead.response_message}</p>
                    </div>
                  )}

                  <p className="text-sm text-green-700 pt-2">
                    Sent: {new Date(lead.responded_at!).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Response Form / Status Panel */}
          <div className="lg:col-span-1">
            {canRespond && !isExpired ? (
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Quote</h2>

                {/* Time Remaining */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {formatTimeRemaining(lead.expires_at)} to respond
                    </span>
                  </div>
                </div>

                {/* Credit Warning */}
                {credits && credits.subscription_tier === 'free' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>1 lead credit</strong> will be used when you submit this quote.
                    </p>
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-red-800">{submitError}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitQuote} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quote Amount ($) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        placeholder="150.00"
                        min="1"
                        step="0.01"
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Availability *
                    </label>
                    <input
                      type="date"
                      value={availabilityDate}
                      onChange={(e) => setAvailabilityDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message to Customer (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Introduce yourself and explain what's included in your quote..."
                      rows={4}
                      maxLength={500}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send Quote
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Decline Lead
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Status</h2>

                {lead.status === 'responded' && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">Quote Submitted</p>
                    <p className="text-sm text-gray-600 mt-1">
                      The customer has been notified of your quote.
                    </p>
                  </div>
                )}

                {lead.status === 'declined' && (
                  <div className="text-center py-4">
                    <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">Lead Declined</p>
                    <p className="text-sm text-gray-600 mt-1">
                      You declined this lead request.
                    </p>
                  </div>
                )}

                {(lead.status === 'expired' || isExpired) && (
                  <div className="text-center py-4">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                    <p className="font-medium text-gray-900">Lead Expired</p>
                    <p className="text-sm text-gray-600 mt-1">
                      This lead is no longer available for response.
                    </p>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Timeline</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Received</span>
                      <span className="text-gray-900">
                        {new Date(lead.created_at).toLocaleString()}
                      </span>
                    </div>
                    {lead.viewed_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Viewed</span>
                        <span className="text-gray-900">
                          {new Date(lead.viewed_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {lead.responded_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Responded</span>
                        <span className="text-gray-900">
                          {new Date(lead.responded_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
