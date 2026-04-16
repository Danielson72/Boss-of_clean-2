'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { Star, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CompletedBooking {
  id: string;
  booking_date: string;
  cleaner: {
    id: string;
    business_name: string;
  };
}

export default function NewReviewPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CompletedBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  // Form state
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadCompletedBookings = useCallback(async () => {
    if (!user) return;
    try {
      // Get completed bookings that haven't been reviewed yet
      const { data: completedBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          cleaner:cleaners(id, business_name)
        `)
        .eq('customer_id', user.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get existing reviews by this user
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('quote_request_id')
        .eq('customer_id', user.id);

      const reviewedBookingIds = new Set(
        (existingReviews || []).map((r: { quote_request_id: string }) => r.quote_request_id)
      );

      // Filter out already-reviewed bookings
      const unreviewedBookings = (completedBookings || []).filter(
        (b: { id: string }) => !reviewedBookingIds.has(b.id)
      );

      setBookings(unreviewedBookings as CompletedBooking[]);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      loadCompletedBookings();
    }
  }, [user, loadCompletedBookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBookingId) {
      setError('Please select a booking to review.');
      return;
    }
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (comment.trim().length < 50) {
      setError('Feedback must be at least 50 characters.');
      return;
    }
    if (comment.trim().length > 500) {
      setError('Feedback must be 500 characters or fewer.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <ProtectedRoute requireRole="customer">
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <h1 className="text-2xl font-bold text-gray-900">Write a Review</h1>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Thank you for your review!
              </h2>
              <p className="text-gray-600 mb-6">
                Your feedback helps other customers find great professionals.
              </p>
              <Link
                href="/dashboard/customer/bookings"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Back to Bookings
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="customer">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/customer/bookings"
                className="mr-4 text-gray-400 hover:text-gray-600 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Write a Review</h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loadingBookings ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your completed bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                No bookings to review
              </h2>
              <p className="text-gray-600 mb-6">
                You can leave a review after a booking is completed.
              </p>
              <Link
                href="/dashboard/customer/bookings"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                View Bookings
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* Error message */}
              {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Select booking */}
              <div>
                <label htmlFor="booking" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Booking
                </label>
                <select
                  id="booking"
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a completed booking...</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.cleaner?.business_name || 'Service'} &mdash;{' '}
                      {new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                      aria-label={`Rate ${value} star${value !== 1 ? 's' : ''}`}
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          (hoverRating || rating) >= value
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        )}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="ml-3 text-sm text-gray-600">
                      {rating} / 5
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  placeholder="Tell others about your experience (50-500 characters)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className={cn(
                  'text-xs mt-1',
                  comment.trim().length < 50 ? 'text-gray-400' :
                  comment.trim().length > 500 ? 'text-red-500' : 'text-green-600'
                )}>
                  {comment.trim().length} / 500 characters
                  {comment.trim().length > 0 && comment.trim().length < 50 && ' (minimum 50)'}
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    'inline-flex items-center px-6 py-3 rounded-md font-medium transition',
                    submitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
