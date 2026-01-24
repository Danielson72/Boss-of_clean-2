import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { action: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify the user is the cleaner for this booking
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!cleaner) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 403 });
  }

  // Fetch the booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .eq('cleaner_id', cleaner.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (body.action === 'confirm') {
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be acknowledged' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Booking confirmed' });
  }

  if (body.action === 'decline') {
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot decline a cancelled or completed booking' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: body.reason || 'Declined by cleaner',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Decline booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to decline booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Booking declined' });
  }

  if (body.action === 'complete') {
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be marked as completed' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Complete booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete booking' },
        { status: 500 }
      );
    }

    // Auto-request review: create a review request entry
    try {
      await supabase.from('review_requests').insert({
        booking_id: params.id,
        cleaner_id: cleaner.id,
        customer_id: booking.customer_id,
        status: 'pending',
      });
    } catch {
      // Non-critical: review request table may not exist yet
      console.log('Review request not created (table may not exist)');
    }

    return NextResponse.json({ success: true, message: 'Booking marked as completed' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
