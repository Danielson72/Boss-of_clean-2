'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import type { CleanerBooking } from '@/components/booking/CleanerBookingList';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

// Dynamic import for CleanerBookingList with loading fallback
const CleanerBookingList = dynamic(
  () => import('@/components/booking/CleanerBookingList').then((mod) => mod.CleanerBookingList),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-6 bg-white animate-pulse">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-3">
                <div className="h-6 w-48 bg-gray-200 rounded" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
);

const logger = createLogger({ file: 'app/dashboard/cleaner/bookings/page.tsx' });

type BookingFilter = 'all' | 'pending' | 'upcoming' | 'completed' | 'cancelled';
type ViewMode = 'list' | 'calendar';

export default function CleanerBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CleanerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingFilter>('pending');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    if (!user) return;
    try {
      // Get the cleaner profile first
      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!cleaner) return;

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:users!bookings_customer_id_fkey(
            full_name,
            email,
            phone
          )
        `)
        .eq('cleaner_id', cleaner.id)
        .order('booking_date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      logger.error('Error loading bookings', { function: 'loadBookings', error });
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
    const bookingEnd = new Date(`${booking.booking_date}T${booking.end_time}`);
    const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);

    switch (filter) {
      case 'pending':
        return booking.status === 'confirmed' && bookingStart > now;
      case 'upcoming':
        return booking.status === 'confirmed' && bookingEnd >= now;
      case 'completed':
        return booking.status === 'completed';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  const handleConfirm = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/cleaner/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm');

      setMessage({ type: 'success', text: 'Booking confirmed!' });
      loadBookings();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to confirm booking',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (bookingId: string, reason: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/cleaner/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline');

      setMessage({ type: 'success', text: 'Booking declined.' });
      loadBookings();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to decline booking',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const res = await fetch(`/api/cleaner/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete');

      setMessage({ type: 'success', text: 'Booking marked as completed! A review request has been sent to the customer.' });
      loadBookings();
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to complete booking',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => {
      const bookingStart = new Date(`${b.booking_date}T${b.start_time}`);
      return b.status === 'confirmed' && bookingStart > new Date();
    }).length,
    upcoming: bookings.filter((b) => {
      const bookingEnd = new Date(`${b.booking_date}T${b.end_time}`);
      return b.status === 'confirmed' && bookingEnd >= new Date();
    }).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  // Calendar view helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getBookingsForDate = (day: number) => {
    const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(
      (b) => b.booking_date === dateStr && b.status === 'confirmed'
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const today = new Date();
    const isCurrentMonth =
      today.getMonth() === calendarMonth.getMonth() &&
      today.getFullYear() === calendarMonth.getFullYear();

    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-md transition"
          >
            &larr;
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {calendarMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <button
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded-md transition"
          >
            &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="p-2" />;
            }

            const dayBookings = getBookingsForDate(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <div
                key={day}
                className={cn(
                  'p-2 min-h-[80px] border rounded-md text-sm',
                  isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100',
                  dayBookings.length > 0 ? 'bg-green-50' : ''
                )}
              >
                <div
                  className={cn(
                    'font-medium mb-1',
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  )}
                >
                  {day}
                </div>
                {dayBookings.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    className="text-xs bg-green-100 text-green-800 rounded px-1 py-0.5 mb-0.5 truncate"
                    title={`${b.customer.full_name} - ${b.start_time}`}
                  >
                    {b.start_time.slice(0, 5)} {b.customer.full_name.split(' ')[0]}
                  </div>
                ))}
                {dayBookings.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayBookings.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
                <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-3 py-2 text-sm rounded-md transition',
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-sm rounded-md transition',
                    viewMode === 'calendar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status message */}
          {message && (
            <div
              className={cn(
                'mb-6 p-4 rounded-md flex items-center gap-2',
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              )}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{counts.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Upcoming</p>
                  <p className="text-xl font-bold text-green-600">{counts.upcoming}</p>
                </div>
                <CalendarDays className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-xl font-bold text-blue-600">{counts.completed}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-blue-600" />
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

          {viewMode === 'calendar' ? (
            renderCalendar()
          ) : (
            <>
              {/* Filter tabs */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="border-b">
                  <nav className="flex">
                    {(
                      ['pending', 'upcoming', 'completed', 'cancelled', 'all'] as BookingFilter[]
                    ).map((tab) => (
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
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({counts[tab]})
                        </span>
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
                  ) : (
                    <CleanerBookingList
                      bookings={filteredBookings}
                      onConfirm={handleConfirm}
                      onDecline={handleDecline}
                      onComplete={handleComplete}
                      actionLoading={actionLoading}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
