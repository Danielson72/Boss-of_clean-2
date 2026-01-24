'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { createClient } from '@/lib/supabase/client';

interface BookingData {
  id: string;
  status: string;
  cleaner_id: string;
  customer_id: string;
  service_type: string;
  booking_date: string;
  cleaner: {
    id: string;
    business_name: string;
    profile_image_url: string | null;
  };
}

function ReviewPageContent() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const bookingId = params?.bookingId ?? '';

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be logged in to leave a review.');
        setLoading(false);
        return;
      }

      // Fetch booking with cleaner info
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          cleaner_id,
          customer_id,
          service_type,
          booking_date,
          cleaner:cleaners!bookings_cleaner_id_fkey(
            id,
            business_name,
            profile_image_url
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !bookingData) {
        setError('Booking not found.');
        setLoading(false);
        return;
      }

      // Verify this booking belongs to the current user
      if (bookingData.customer_id !== user.id) {
        setError('You are not authorized to review this booking.');
        setLoading(false);
        return;
      }

      // Check if booking is completed
      if (bookingData.status !== 'completed') {
        setError('Reviews can only be submitted for completed bookings.');
        setLoading(false);
        return;
      }

      // Check for existing review
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('customer_id', user.id)
        .eq('cleaner_id', bookingData.cleaner_id)
        .eq('quote_request_id', bookingId)
        .maybeSingle();

      if (existingReview) {
        setAlreadyReviewed(true);
        setLoading(false);
        return;
      }

      setBooking(bookingData as unknown as BookingData);
      setLoading(false);
    }

    loadBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-xl shadow-sm text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You!
          </h1>
          <p className="text-gray-600 mb-6">
            Your review has been submitted successfully. It helps other customers
            make informed decisions.
          </p>
          <button
            onClick={() => router.push('/dashboard/customer')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-xl shadow-sm text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Unable to Submit Review
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/customer')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-xl shadow-sm text-center">
          <CheckCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Already Reviewed
          </h1>
          <p className="text-gray-600 mb-6">
            You have already submitted a review for this booking.
          </p>
          <button
            onClick={() => router.push('/dashboard/customer')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Leave a Review
            </h1>
            <p className="text-gray-600">
              Share your experience with{' '}
              <span className="font-medium">{booking.cleaner.business_name}</span>
            </p>
          </div>

          <ReviewForm
            bookingId={booking.id}
            cleanerName={booking.cleaner.business_name}
            onSuccess={() => setSubmitted(true)}
          />
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <ProtectedRoute requireRole="customer">
      <ReviewPageContent />
    </ProtectedRoute>
  );
}
