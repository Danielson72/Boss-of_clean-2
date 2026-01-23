'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
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
  Eye,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

interface Lead {
  id: string;
  service_type: string;
  property_size: string;
  property_type: string;
  frequency: string;
  preferred_date: string;
  preferred_time: string;
  zip_code: string;
  city: string;
  budget_range: string;
  special_instructions: string;
  created_at: string;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  };
}

interface CleanerProfile {
  id: string;
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  lead_credits_used: number;
  lead_credits_reset_at: string;
}

const LEAD_LIMITS = {
  free: 5,
  basic: 20,
  pro: -1, // unlimited
  enterprise: -1, // unlimited
};

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cleaner, setCleaner] = useState<CleanerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingLead, setViewingLead] = useState<string | null>(null);
  const [claimingLead, setClaimingLead] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get cleaner profile
      const { data: cleanerData, error: cleanerError } = await supabase
        .from('cleaners')
        .select('id, subscription_tier')
        .eq('user_id', user?.id)
        .single();

      if (cleanerError || !cleanerData) {
        setLoading(false);
        return;
      }

      setCleaner({
        ...cleanerData,
        lead_credits_used: 0, // TODO: Track actual usage
        lead_credits_reset_at: new Date().toISOString(),
      });

      // Get service areas for this cleaner
      const { data: serviceAreas } = await supabase
        .from('cleaner_service_areas')
        .select('zip_code')
        .eq('cleaner_id', cleanerData.id);

      const zipCodes = serviceAreas?.map((sa) => sa.zip_code) || [];

      if (zipCodes.length === 0) {
        // No service areas configured
        setLeads([]);
        setLoading(false);
        return;
      }

      // Get unassigned leads in service areas
      const { data, error } = await supabase
        .from('quote_requests')
        .select(
          `
          id,
          service_type,
          property_size,
          property_type,
          frequency,
          preferred_date,
          preferred_time,
          zip_code,
          city,
          budget_range,
          special_instructions,
          created_at,
          customer:users!quote_requests_customer_id_fkey(
            full_name,
            email,
            phone
          )
        `
        )
        .in('zip_code', zipCodes)
        .is('cleaner_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Supabase FK joins return related row as array; unwrap to single object
      const normalized = (data || []).map((row: any) => ({
        ...row,
        customer: Array.isArray(row.customer) ? row.customer[0] : row.customer,
      }));
      setLeads(normalized);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeadLimit = () => {
    if (!cleaner) return 0;
    return LEAD_LIMITS[cleaner.subscription_tier];
  };

  const getRemainingCredits = () => {
    if (!cleaner) return 0;
    const limit = getLeadLimit();
    if (limit === -1) return -1; // unlimited
    return Math.max(0, limit - cleaner.lead_credits_used);
  };

  const canViewLeadDetails = () => {
    if (!cleaner) return false;
    const tier = cleaner.subscription_tier;
    return tier === 'pro' || tier === 'enterprise' || tier === 'basic';
  };

  const handleClaimLead = async (leadId: string) => {
    if (!cleaner) return;

    try {
      setClaimingLead(true);

      // Update the quote request to assign it to this cleaner
      const { error } = await supabase
        .from('quote_requests')
        .update({
          cleaner_id: cleaner.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      // Refresh leads
      await loadData();
      setViewingLead(null);
    } catch (error) {
      console.error('Error claiming lead:', error);
    } finally {
      setClaimingLead(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesFilter =
      filter === 'all' || lead.service_type?.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch =
      searchTerm === '' ||
      lead.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.zip_code?.includes(searchTerm) ||
      lead.service_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leads...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const remaining = getRemainingCredits();
  const isUnlimited = remaining === -1;

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
                  <h1 className="text-2xl font-bold text-gray-900">Available Leads</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    New customer requests in your service areas
                  </p>
                </div>
              </div>

              {/* Lead Credits */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg px-4 py-2 border border-blue-200">
                <div className="flex items-center gap-2">
                  {isUnlimited ? (
                    <>
                      <Crown className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900">Unlimited Leads</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {remaining} / {getLeadLimit()} credits left
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Upgrade Banner for Free Users */}
          {cleaner?.subscription_tier === 'free' && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Unlock More Leads</h3>
                  <p className="text-purple-100 mt-1">
                    Upgrade to Pro for unlimited lead access and customer contact info
                  </p>
                </div>
                <Link
                  href="/dashboard/cleaner/billing"
                  className="bg-white text-purple-600 px-6 py-2 rounded-md font-medium hover:bg-purple-50 transition"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by city, ZIP, or service type..."
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
                  <option value="all">All Services</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="deep">Deep Cleaning</option>
                  <option value="move">Move In/Out</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Available Leads</p>
              <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">In Your Area</p>
              <p className="text-2xl font-bold text-blue-600">{filteredLeads.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">New Today</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  leads.filter((l) => {
                    const today = new Date().toDateString();
                    return new Date(l.created_at).toDateString() === today;
                  }).length
                }
              </p>
            </div>
          </div>

          {/* Lead List */}
          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads available</h3>
              <p className="text-gray-600">
                New leads in your service areas will appear here. Make sure you have service areas
                configured.
              </p>
              <Link
                href="/dashboard/cleaner/service-areas"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Manage Service Areas →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="bg-white rounded-lg shadow-sm p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {lead.service_type?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>
                        {lead.city}, {lead.zip_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {lead.preferred_date
                          ? new Date(lead.preferred_date).toLocaleDateString()
                          : 'Flexible date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>{lead.budget_range || 'Budget not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span>
                        {lead.property_type} - {lead.property_size}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info - Hidden for free tier */}
                  {canViewLeadDetails() ? (
                    <div className="border-t pt-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{lead.customer?.email}</span>
                      </div>
                      {lead.customer?.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{lead.customer?.phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t pt-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Lock className="h-4 w-4" />
                        <span>Contact info hidden - Upgrade to view</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingLead(lead.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleClaimLead(lead.id)}
                      disabled={claimingLead || (!isUnlimited && remaining <= 0)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 transition"
                    >
                      Claim Lead
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Detail Modal */}
        {viewingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Lead Details</h3>
                  <button
                    onClick={() => setViewingLead(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                {(() => {
                  const lead = leads.find((l) => l.id === viewingLead);
                  if (!lead) return null;

                  return (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500">Service Type</label>
                        <p className="font-medium">{lead.service_type?.replace('_', ' ')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Property</label>
                          <p className="font-medium">
                            {lead.property_type} - {lead.property_size}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Frequency</label>
                          <p className="font-medium">{lead.frequency || 'One-time'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-500">Location</label>
                          <p className="font-medium">
                            {lead.city}, {lead.zip_code}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Budget</label>
                          <p className="font-medium">{lead.budget_range || 'Not specified'}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Preferred Date</label>
                        <p className="font-medium">
                          {lead.preferred_date
                            ? new Date(lead.preferred_date).toLocaleDateString()
                            : 'Flexible'}
                          {lead.preferred_time && ` at ${lead.preferred_time}`}
                        </p>
                      </div>
                      {lead.special_instructions && (
                        <div>
                          <label className="text-sm text-gray-500">Special Instructions</label>
                          <p className="font-medium">{lead.special_instructions}</p>
                        </div>
                      )}

                      {canViewLeadDetails() && (
                        <div className="border-t pt-4">
                          <label className="text-sm text-gray-500">Customer Contact</label>
                          <p className="font-medium">{lead.customer?.full_name}</p>
                          <p className="text-sm text-gray-600">{lead.customer?.email}</p>
                          {lead.customer?.phone && (
                            <p className="text-sm text-gray-600">{lead.customer?.phone}</p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setViewingLead(null)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => handleClaimLead(lead.id)}
                          disabled={claimingLead || (!isUnlimited && remaining <= 0)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
                        >
                          {claimingLead ? 'Claiming...' : 'Claim This Lead'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
