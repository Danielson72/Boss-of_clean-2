'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Eye,
  AlertCircle,
  Coins,
  Zap,
} from 'lucide-react';
import { getCleanerLeads, type LeadMatch, type CleanerLeadCredits } from './actions';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  viewed: { label: 'Viewed', color: 'bg-yellow-100 text-yellow-700', icon: Eye },
  responded: { label: 'Responded', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertCircle },
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

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }

  return `${hours}h ${minutes}m left`;
}

export default function CleanerLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadMatch[]>([]);
  const [credits, setCredits] = useState<CleanerLeadCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const result = await getCleanerLeads();
    if (result.success) {
      setLeads(result.leads || []);
      setCredits(result.credits || null);
    } else {
      setError(result.error || 'Failed to load leads');
    }
    setLoading(false);
  };

  const filteredLeads = leads.filter((lead) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'viewed'].includes(lead.status);
    return lead.status === filter;
  });

  const pendingCount = leads.filter((l) => l.status === 'pending').length;
  const viewedCount = leads.filter((l) => l.status === 'viewed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">{error}</p>
          <button
            onClick={() => router.push('/dashboard/cleaner')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/cleaner"
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Incoming Leads</h1>
                <p className="text-sm text-gray-600">
                  {pendingCount} new, {viewedCount} awaiting response
                </p>
              </div>
            </div>

            {/* Lead Credits */}
            {credits && (
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-600" />
                  <div>
                    {credits.subscription_tier === 'free' ? (
                      <>
                        <span className="font-semibold text-gray-900">
                          {credits.lead_credits_remaining} credits
                        </span>
                        <span className="text-sm text-gray-500 ml-1">remaining</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-gray-900">Unlimited</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'New' },
            { value: 'viewed', label: 'Viewed' },
            { value: 'responded', label: 'Responded' },
            { value: 'declined', label: 'Declined' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Leads List */}
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Quote requests from customers in your service area will appear here.'
                : 'No leads match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const status = statusConfig[lead.status];
              const StatusIcon = status.icon;
              const isActive = ['pending', 'viewed'].includes(lead.status);
              const isExpiringSoon =
                isActive && new Date(lead.expires_at).getTime() - Date.now() < 6 * 60 * 60 * 1000;

              return (
                <div
                  key={lead.id}
                  className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
                    lead.status === 'pending' ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            <StatusIcon className="h-3.5 w-3.5 inline mr-1" />
                            {status.label}
                          </span>
                          {isExpiringSoon && isActive && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                              <Clock className="h-3.5 w-3.5 inline mr-1" />
                              {formatTimeRemaining(lead.expires_at)}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            Match Score: {Math.round(lead.match_score)}%
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {serviceTypeLabels[lead.quote_request.service_type] || lead.quote_request.service_type}
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-gray-400" />
                            <span>
                              {propertyTypeLabels[lead.quote_request.property_type] || lead.quote_request.property_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>
                              {lead.quote_request.city
                                ? `${lead.quote_request.city}, ${lead.quote_request.zip_code}`
                                : lead.quote_request.zip_code}
                            </span>
                          </div>
                          {lead.quote_request.preferred_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>
                                {new Date(lead.quote_request.preferred_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {lead.quote_request.sqft_estimate && (
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-gray-400" />
                              <span>{lead.quote_request.sqft_estimate.toLocaleString()} sq ft</span>
                            </div>
                          )}
                        </div>

                        {lead.quote_request.bedrooms && lead.quote_request.bathrooms && (
                          <p className="text-sm text-gray-600 mt-2">
                            {lead.quote_request.bedrooms} bed, {lead.quote_request.bathrooms} bath
                          </p>
                        )}

                        {lead.status === 'responded' && lead.quote_amount && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-medium">Your quote: ${lead.quote_amount}</span>
                              {lead.availability_date && (
                                <span className="text-green-600">
                                  | Available: {new Date(lead.availability_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        {isActive ? (
                          <Link
                            href={`/dashboard/cleaner/leads/${lead.id}`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                          >
                            View & Respond
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/cleaner/leads/${lead.id}`}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium text-center"
                          >
                            View Details
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t">
                      <span>
                        Received: {new Date(lead.created_at).toLocaleString()}
                      </span>
                      {isActive && (
                        <span>
                          Expires: {new Date(lead.expires_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Credit Info Banner */}
        {credits && credits.subscription_tier === 'free' && credits.lead_credits_remaining <= 2 && (
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Running low on lead credits?</h3>
                <p className="text-purple-100">
                  Upgrade to Pro for unlimited leads and priority placement in search results.
                </p>
              </div>
              <Link
                href="/pricing"
                className="bg-white text-purple-600 px-6 py-2 rounded-md font-medium hover:bg-purple-50 transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
