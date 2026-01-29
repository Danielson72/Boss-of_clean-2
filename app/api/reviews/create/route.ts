import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimitRoute, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/reviews/create/route' });

interface CreateReviewBody {
  bookingId: string;
  rating: number;
  comment: string;
  photos?: string[];
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 reviews per hour per user
  const reviewRateLimited = rateLimitRoute('review-user', user.id, RATE_LIMITS.reviewCreate);
  if (reviewRateLimited) return reviewRateLimited;

  let body: CreateReviewBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { bookingId, rating, comment, photos } = body;

  // Validate required fields
  if (!bookingId || !rating || !comment) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Validate rating range
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json(
      { error: 'Rating must be an integer between 1 and 5' },
      { status: 400 }
    );
  }

  // Validate comment length
  const trimmedComment = comment.trim();
  if (trimmedComment.length < 50 || trimmedComment.length > 500) {
    return NextResponse.json(
      { error: 'Feedback must be between 50 and 500 characters' },
      { status: 400 }
    );
  }

  // Fetch the booking to verify ownership and status
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, customer_id, cleaner_id, status')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Verify the booking belongs to this user
  if (booking.customer_id !== user.id) {
    return NextResponse.json(
      { error: 'You are not authorized to review this booking' },
      { status: 403 }
    );
  }

  // Verify booking is completed
  if (booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'Reviews can only be submitted for completed bookings' },
      { status: 400 }
    );
  }

  // Check for existing review (one review per booking)
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('customer_id', user.id)
    .eq('cleaner_id', booking.cleaner_id)
    .eq('quote_request_id', bookingId)
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json(
      { error: 'You have already reviewed this booking' },
      { status: 409 }
    );
  }

  // Create the review
  // Using quote_request_id field to store booking reference
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      customer_id: user.id,
      cleaner_id: booking.cleaner_id,
      quote_request_id: bookingId,
      rating,
      comment: trimmedComment,
      photos: photos || [],
      verified_purchase: true,
    })
    .select('id')
    .single();

  if (reviewError) {
    logger.error('Review creation error', { function: 'POST' }, reviewError);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    reviewId: review.id,
  });
}
