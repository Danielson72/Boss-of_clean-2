import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_RESPONSE_LENGTH = 500;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reviewId, response } = body;

    if (!reviewId || typeof reviewId !== 'string') {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      );
    }

    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        { error: 'Response text is required' },
        { status: 400 }
      );
    }

    const trimmedResponse = response.trim();

    if (trimmedResponse.length === 0) {
      return NextResponse.json(
        { error: 'Response cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedResponse.length > MAX_RESPONSE_LENGTH) {
      return NextResponse.json(
        { error: `Response must be ${MAX_RESPONSE_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Verify this review belongs to the cleaner
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, cleaner_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    if (review.cleaner_id !== cleaner.id) {
      return NextResponse.json(
        { error: 'You can only respond to reviews for your business' },
        { status: 403 }
      );
    }

    // Update the review with the cleaner's response
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        cleaner_response: trimmedResponse,
        cleaner_response_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating review response:', updateError);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Response saved successfully',
    });
  } catch (error) {
    console.error('Review response API error:', error);
    return NextResponse.json(
      { error: 'Failed to process response' },
      { status: 500 }
    );
  }
}
