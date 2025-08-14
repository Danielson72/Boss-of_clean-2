'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { 
  Settings, FileText, Clock, CheckCircle, Star, TrendingUp,
  DollarSign, MapPin, Calendar, User, Phone, MessageSquare,
  Camera, Shield, Award, Zap, Crown, Gift
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CleanerProfile {
  id: string;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  insurance_verified: boolean;
  license_verified: boolean;
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  approval_status: string;
}

interface QuoteRequest {
  id: string;
  service_type: string;
  service_date: string;
  service_time: string;
  address: string;
  city: string;
  zip_code: string;
  description: string;
  status: string;
  quoted_price?: number;
  created_at: string;
  customer: {
    full_name: string;
    email: string;
    phone: string;
  };
}

const subscriptionPlans = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    icon: Gift,
    color: 'green',
    features: ['Basic listing', '1 photo', '5 quote responses/month']
  },
  {
    tier: 'basic',
    name: 'Basic',
    price: '$29',
    icon: Star,
    color: 'blue',
    features: ['Enhanced listing', '5 photos', '50 quote responses/month', 'Analytics']
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$79',
    icon: Zap,
    color: 'purple',
    features: ['Priority placement', 'Unlimited photos', '200 quote responses/month', 'Lead generation']
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: '$149',
    icon: Crown,
    color: 'yellow',
    features: ['Featured placement', 'Unlimited everything', 'Priority support', 'Custom branding']
  }
];

export default function CleanerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadCleanerProfile();
      loadQuotes();
    }
  }, [user]);

  const loadCleanerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No cleaner profile exists, redirect to create one
        router.push('/dashboard/cleaner/setup');
        return;
      }
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadQuotes = async () => {
    try {
      const { data: cleanerData } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!cleanerData) return;

      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          customer:users!quote_requests_customer_id_fkey(
            full_name,
            email,
            phone
          )
        `)
        .eq('cleaner_id', cleanerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlan = () => {
    return subscriptionPlans.find(plan => plan.tier === profile?.subscription_tier) || subscriptionPlans[0];
  };

  const handleRespondToQuote = (quoteId: string) => {
    // Navigate to quote response page
    router.push(`/dashboard/cleaner/quotes/${quoteId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.business_name || 'Cleaner Dashboard'}
                </h1>
                {profile?.approval_status === 'pending' && (
                  <p className="text-sm text-yellow-600 mt-1">
                    Your profile is pending approval
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/cleaner/profile"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Settings className="h-6 w-6" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Current Plan Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(() => {
                  const plan = getCurrentPlan();
                  const IconComponent = plan.icon;
                  return (
                    <div className={`p-3 rounded-lg ${
                      plan.tier === 'free' ? 'bg-green-100' :
                      plan.tier === 'basic' ? 'bg-blue-100' :
                      plan.tier === 'pro' ? 'bg-purple-100' :
                      'bg-yellow-100'
                    }`}>
                      <IconComponent className={`h-8 w-8 ${
                        plan.tier === 'free' ? 'text-green-600' :
                        plan.tier === 'basic' ? 'text-blue-600' :
                        plan.tier === 'pro' ? 'text-purple-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Current Plan: {getCurrentPlan().name}
                  </h2>
                  <p className="text-gray-600">
                    {getCurrentPlan().price}/month
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Upgrade Plan →
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Quotes</p>
                  <p className="text-2xl font-bold text-gray-900">{quotes.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Quotes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {quotes.filter(q => q.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-green-600">
                    {profile?.average_rating.toFixed(1) || '0.0'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {profile?.total_jobs || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                    activeTab === 'quotes'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Quote Requests
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                    activeTab === 'services'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Services & Areas
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{profile?.business_phone || 'No phone set'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>${profile?.hourly_rate}/hr ({profile?.minimum_hours}hr minimum)</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-gray-400" />
                          <span>{profile?.years_experience} years experience</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Verification Status */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Shield className={`h-4 w-4 ${profile?.insurance_verified ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            Insurance {profile?.insurance_verified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className={`h-4 w-4 ${profile?.license_verified ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            License {profile?.license_verified ? 'Verified' : 'Not Verified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Link
                        href="/dashboard/cleaner/profile"
                        className="p-4 border rounded-lg hover:shadow-md transition duration-300 text-center"
                      >
                        <Camera className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-medium">Update Profile</p>
                      </Link>
                      <Link
                        href="/dashboard/cleaner/services"
                        className="p-4 border rounded-lg hover:shadow-md transition duration-300 text-center"
                      >
                        <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="font-medium">Manage Service Areas</p>
                      </Link>
                      <Link
                        href="/pricing"
                        className="p-4 border rounded-lg hover:shadow-md transition duration-300 text-center"
                      >
                        <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <p className="font-medium">Upgrade Plan</p>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quotes' && (
                <div>
                  {quotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No quote requests yet</h3>
                      <p className="text-gray-600">
                        Quote requests from customers will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quotes.map((quote) => (
                        <div key={quote.id} className="border rounded-lg p-6 hover:shadow-md transition duration-300">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {quote.customer.full_name}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm ${
                                  quote.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-600' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {quote.status}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Service Date: {new Date(quote.service_date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{quote.city}, {quote.zip_code}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{quote.customer.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{quote.customer.phone}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="mt-3 text-sm text-gray-700">
                                {quote.description}
                              </p>
                            </div>
                            
                            {quote.status === 'pending' && (
                              <button
                                onClick={() => handleRespondToQuote(quote.id)}
                                className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
                              >
                                Respond
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'services' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Services Offered</h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {profile?.services.map((service) => (
                      <span key={service} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {service}
                      </span>
                    ))}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile?.service_areas.map((area) => (
                      <span key={area} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <Link
                      href="/dashboard/cleaner/services"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Services & Areas →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}