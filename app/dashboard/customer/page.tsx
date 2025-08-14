'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { 
  User, Settings, FileText, Clock, CheckCircle, 
  XCircle, AlertCircle, Calendar, MapPin, DollarSign,
  MessageSquare, Star, Home
} from 'lucide-react';
import Link from 'next/link';

interface QuoteRequest {
  id: string;
  service_type: string;
  service_date: string;
  service_time: string;
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
    user: {
      email: string;
    };
  };
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quotes');
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadQuotes();
    }
  }, [user]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          cleaner:cleaners(
            business_name,
            business_phone,
            user:users(email)
          )
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
              <div className="flex items-center gap-4">
                <Link
                  href="/search"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
                >
                  Find Cleaners
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Settings className="h-6 w-6" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <p className="text-sm text-gray-600">Pending</p>
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
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {quotes.filter(q => ['responded', 'accepted'].includes(q.status)).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {quotes.filter(q => q.status === 'completed').length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-8">
            <div className="border-b">
              <nav className="flex">
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
                  onClick={() => setActiveTab('profile')}
                  className={`px-6 py-3 font-medium border-b-2 transition duration-300 ${
                    activeTab === 'profile'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Profile
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'quotes' && (
                <div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading quotes...</p>
                    </div>
                  ) : quotes.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No quote requests yet</h3>
                      <p className="text-gray-600 mb-6">
                        Start by searching for cleaners in your area
                      </p>
                      <Link
                        href="/search"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
                      >
                        Find Cleaners
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
                                  {quote.cleaner.business_name}
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
                                <button className="text-sm bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-300">
                                  Accept Quote
                                </button>
                              )}
                              {quote.status === 'accepted' && (
                                <div className="text-sm text-gray-600">
                                  <p className="font-medium">Contact:</p>
                                  <p>{quote.cleaner.business_phone}</p>
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

              {activeTab === 'profile' && (
                <div className="max-w-2xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-gray-900">{user?.email}</p>
                    </div>
                    <div className="pt-4">
                      <Link
                        href="/settings"
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit Profile Settings →
                      </Link>
                    </div>
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