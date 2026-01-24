'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { BookingCard, Booking } from '@/components/booking/BookingCard';
import { RescheduleModal } from '@/components/booking/RescheduleModal';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type BookingFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

const CANCEL_REASONS = [
  'Schedule conflict',
  'Found another cleaner',
  'No longer needed',
  'Moving/relocating',
  'Financial reasons',
  'Other',
];

export default function CustomerBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          cleaner:cleaners(
            id,
            business_name,
            business_phone,
            business_email,
            profile_image_url,
            average_rating,
            user:users(full_name, email)
          )
        `)
        .eq('customer_id', user.id)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      loadBookings();
    }
  }, [user, loadBookings]);

  const filteredBookings = bookings.filter((booking) => {
    const now = new Date();
    const bookingDate = new Date(`${booking.booking_date}T${booking.end_time}`);

    switch (filter) {
      case 'upcoming':
        return booking.status === 'confirmed' && bookingDate >= now;
      case 'past':
        return booking.status === 'completed' || (booking.status === 'confirmed' && bookingDate < now);
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  const handleReschedule = async (bookingDate: string, startTime: string, endTime: string) => {
    if (!rescheduleBooking) return;

    const res = await fetch(`/api/bookings/${rescheduleBooking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reschedule',
        bookingDate,
        startTime,
        endTime,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to reschedule');
    }

    setRescheduleBooking(null);
    setMessage({ type: 'success', text: 'Booking rescheduled successfully!' });
    loadBookings();
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCancel = async () => {
    if (!cancelBooking || !cancelReason) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          reason: cancelReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel');
      }

      setCancelBooking(null);
      setCancelReason('');
      setMessage({ type: 'success', text: 'Booking cancelled successfully.' });
      loadBookings();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to cancel booking',
      });
    } finally {
      setCancelling(false);
    }
  };

  const counts = {
    all: bookings.length,
    upcoming: bookings.filter((b) => {
      const bookingDate = new Date(`${b.booking_date}T${b.end_time}`);
      return b.status === 'confirmed' && bookingDate >= new Date();
    }).length,
    past: bookings.filter((b) => {
      const bookingDate = new Date(`${b.booking_date}T${b.end_time}`);
      return b.status === 'completed' || (b.status === 'confirmed' && bookingDate < new Date());
    }).length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/customer"
                className="mr-4 text-gray-400 hover:text-gray-600 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status message */}
          {message && (
            <div className={cn(
              'mb-6 p-4 rounded-md flex items-center gap-2',
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{counts.all}</p>
                </div>
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Upcoming</p>
                  <p className="text-xl font-bold text-green-600">{counts.upcoming}</p>
                </div>
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Past</p>
                  <p className="text-xl font-bold text-gray-600">{counts.past}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-gray-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Cancelled</p>
                  <p className="text-xl font-bold text-red-600">{counts.cancelled}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b">
              <nav className="flex">
                {(['all', 'upcoming', 'past', 'cancelled'] as BookingFilter[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      'px-4 py-3 text-sm font-medium border-b-2 transition',
                      filter === tab
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span className="ml-1.5 text-xs text-gray-400">({counts[tab]})</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Bookings list */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading bookings...</p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {filter === 'all'
                      ? 'Book a cleaning service to get started'
                      : `You don't have any ${filter} bookings`}
                  </p>
                  {filter === 'all' && (
                    <Link
                      href="/search"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Find Cleaners
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onReschedule={setRescheduleBooking}
                      onCancel={setCancelBooking}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        {rescheduleBooking && (
          <RescheduleModal
            booking={rescheduleBooking}
            onClose={() => setRescheduleBooking(null)}
            onConfirm={handleReschedule}
          />
        )}

        {/* Cancel Confirmation Modal */}
        {cancelBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setCancelBooking(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to cancel your booking with{' '}
                  <strong>{cancelBooking.cleaner.business_name}</strong> on{' '}
                  {new Date(cancelBooking.booking_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  ?
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for cancellation
                  </label>
                  <div className="space-y-2">
                    {CANCEL_REASONS.map((reason) => (
                      <label
                        key={reason}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border cursor-pointer transition',
                          cancelReason === reason
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={reason}
                          checked={cancelReason === reason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setCancelBooking(null);
                      setCancelReason('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={!cancelReason || cancelling}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-md transition',
                      cancelReason && !cancelling
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {cancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
