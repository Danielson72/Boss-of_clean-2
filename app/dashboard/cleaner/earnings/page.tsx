'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { analyticsService, type EarningsData } from '@/lib/services/analytics';
import { EarningsChart } from '@/components/analytics/EarningsChart';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Download,
  ArrowLeft,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/earnings/page.tsx' });

export default function EarningsPage() {
  const { user } = useAuth();
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cleanerId, setCleanerId] = useState<string | null>(null);
  const supabase = createClient();

  const loadCleanerId = useCallback(async () => {
    if (!user) return;

    const { data: cleaner, error } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Error fetching cleaner - silently fail for client component
      return;
    }

    setCleanerId(cleaner.id);
  }, [user, supabase]);

  const loadEarningsData = useCallback(async () => {
    if (!cleanerId) return;

    try {
      setLoading(true);
      const data = await analyticsService.getEarningsData(cleanerId);
      setEarningsData(data);
    } catch (error) {
      logger.error('Error loading earnings data', { function: 'loadEarningsData', error });
    } finally {
      setLoading(false);
    }
  }, [cleanerId]);

  useEffect(() => {
    if (user) {
      loadCleanerId();
    }
  }, [user, loadCleanerId]);

  useEffect(() => {
    if (cleanerId) {
      loadEarningsData();
    }
  }, [cleanerId, loadEarningsData]);

  const handleExportCSV = async () => {
    if (!cleanerId) return;

    try {
      setExporting(true);
      const csvContent = await analyticsService.exportEarningsToCSV(cleanerId);

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Error exporting CSV', { function: 'handleExportCSV', error });
      alert('Failed to export earnings data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading earnings data...</p>
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
                  className="mr-4 text-gray-400 hover:text-gray-600 transition"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Track your revenue and booking analytics
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportCSV}
                disabled={exporting || !earningsData}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
                  exporting || !earningsData
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                )}
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Earnings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">All-Time Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(earningsData?.stats.totalEarnings || 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Monthly Earnings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(earningsData?.stats.monthlyEarnings || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Completed Bookings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bookings Completed</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {earningsData?.stats.completedBookings || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {earningsData?.stats.totalBookings || 0} total
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Lead Conversion Rate</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(earningsData?.stats.conversionRate || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: {formatCurrency(earningsData?.stats.averageBookingValue || 0)}/booking
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
                <p className="text-sm text-gray-600">Last 6 months</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <EarningsChart data={earningsData?.monthlyData || []} />
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
              <p className="text-sm text-gray-600">Your latest completed and pending bookings</p>
            </div>
            <div className="divide-y">
              {(!earningsData?.recentBookings || earningsData.recentBookings.length === 0) ? (
                <div className="p-12 text-center">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                  <p className="text-gray-600">
                    Your completed bookings will appear here
                  </p>
                </div>
              ) : (
                earningsData.recentBookings.map((booking) => (
                  <div key={booking.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-gray-900">{booking.customer_name}</p>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              booking.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : booking.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-700'
                                : booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            )}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                          <span className="capitalize">{booking.service_type.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(booking.total_price)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
