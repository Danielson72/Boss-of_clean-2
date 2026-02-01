'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { ReviewResponseForm } from '@/components/reviews/ReviewResponseForm';
import {
  Star,
  MessageSquare,
  ArrowLeft,
  CheckCircle,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/dashboard/cleaner/reviews/page.tsx' });

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer_name: string;
  created_at: string;
  cleaner_response: string | null;
  cleaner_response_at: string | null;
}

type ReviewFilter = 'all' | 'responded' | 'pending';

export default function CleanerReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = createClient();

  const loadReviews = useCallback(async () => {
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
        .from('reviews')
        .select('id, rating, comment, customer_name, created_at, cleaner_response, cleaner_response_at')
        .eq('cleaner_id', cleaner.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      logger.error('Error loading reviews', { function: 'loadReviews', error });
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      loadReviews();
    }
  }, [user, loadReviews]);

  const filteredReviews = reviews.filter((review) => {
    switch (filter) {
      case 'responded':
        return !!review.cleaner_response;
      case 'pending':
        return !review.cleaner_response;
      default:
        return true;
    }
  });

  const counts = {
    all: reviews.length,
    responded: reviews.filter((r) => r.cleaner_response).length,
    pending: reviews.filter((r) => !r.cleaner_response).length,
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  function handleResponseSuccess() {
    setMessage({ type: 'success', text: 'Response saved successfully!' });
    setRespondingTo(null);
    loadReviews();
    setTimeout(() => setMessage(null), 5000);
  }

  function toggleExpand(reviewId: string) {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  }

  function startResponding(reviewId: string) {
    setRespondingTo(reviewId);
    setExpandedReview(reviewId);
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/cleaner"
                className="mr-4 text-gray-400 hover:text-gray-600 transition"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              {message.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Average Rating</p>
                  <p className="text-xl font-bold text-yellow-600">{averageRating}</p>
                </div>
                <Star className="h-6 w-6 text-yellow-400 fill-current" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Reviews</p>
                  <p className="text-xl font-bold text-gray-900">{counts.all}</p>
                </div>
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Responded</p>
                  <p className="text-xl font-bold text-green-600">{counts.responded}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pending Response</p>
                  <p className="text-xl font-bold text-orange-600">{counts.pending}</p>
                </div>
                <Edit2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b">
              <nav className="flex">
                {(['all', 'pending', 'responded'] as ReviewFilter[]).map((tab) => (
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
                    {tab === 'all' ? 'All Reviews' : tab === 'pending' ? 'Pending Response' : 'Responded'}
                    <span className="ml-1.5 text-xs text-gray-400">({counts[tab]})</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Reviews list */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading reviews...</p>
                </div>
              ) : filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'all'
                      ? 'No reviews yet'
                      : filter === 'pending'
                      ? 'No pending reviews'
                      : 'No responded reviews'}
                  </h3>
                  <p className="text-gray-600">
                    {filter === 'all'
                      ? 'Customer reviews will appear here once they leave feedback.'
                      : filter === 'pending'
                      ? 'Great job! You have responded to all your reviews.'
                      : 'Start responding to reviews to build customer relationships.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReviews.map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-4 hover:shadow-sm transition"
                    >
                      {/* Review header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    'h-4 w-4',
                                    star <= review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  )}
                                />
                              ))}
                            </div>
                            <span className="font-medium text-gray-900">
                              {review.customer_name || 'Customer'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                            {review.cleaner_response && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                Responded
                              </span>
                            )}
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                        <button
                          onClick={() => toggleExpand(review.id)}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition"
                        >
                          {expandedReview === review.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {/* Expanded section */}
                      {expandedReview === review.id && (
                        <div className="mt-4 pt-4 border-t">
                          {respondingTo === review.id ? (
                            <ReviewResponseForm
                              reviewId={review.id}
                              existingResponse={review.cleaner_response}
                              onSuccess={handleResponseSuccess}
                              onCancel={() => setRespondingTo(null)}
                            />
                          ) : review.cleaner_response ? (
                            <div className="space-y-3">
                              <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-blue-900">
                                    Your Response
                                  </span>
                                  {review.cleaner_response_at && (
                                    <span className="text-xs text-blue-600">
                                      {new Date(review.cleaner_response_at).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-blue-800 text-sm">{review.cleaner_response}</p>
                              </div>
                              <button
                                onClick={() => startResponding(review.id)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit Response
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-600">
                                Responding to reviews helps build trust with potential customers.
                              </p>
                              <button
                                onClick={() => startResponding(review.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                              >
                                <MessageSquare className="h-4 w-4" />
                                Respond to Review
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
