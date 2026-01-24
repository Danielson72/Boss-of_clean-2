import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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

  const { data: booking, error } = await supabase
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
    .eq('id', params.id)
    .eq('customer_id', user.id)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

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

  let body: { action: string; bookingDate?: string; startTime?: string; endTime?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Fetch the booking to validate ownership and status
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .eq('customer_id', user.id)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json(
      { error: 'This booking has already been cancelled' },
      { status: 400 }
    );
  }

  if (booking.status === 'completed') {
    return NextResponse.json(
      { error: 'Cannot modify a completed booking' },
      { status: 400 }
    );
  }

  // Enforce 24-hour cancellation/reschedule policy
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilBooking < 24) {
    return NextResponse.json(
      { error: 'Changes must be made at least 24 hours before the scheduled service' },
      { status: 400 }
    );
  }

  if (body.action === 'cancel') {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: body.reason || null,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Cancel booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Booking cancelled' });
  }

  if (body.action === 'reschedule') {
    if (!body.bookingDate || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: 'New date and time are required for rescheduling' },
        { status: 400 }
      );
    }

    // Check for conflicts at the new time
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('cleaner_id', booking.cleaner_id)
      .eq('booking_date', body.bookingDate)
      .eq('status', 'confirmed')
      .neq('id', params.id)
      .lt('start_time', body.endTime)
      .gt('end_time', body.startTime);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'The selected time slot is not available' },
        { status: 409 }
      );
    }

    // Check blocked dates
    const { data: blocked } = await supabase
      .from('cleaner_blocked_dates')
      .select('id')
      .eq('cleaner_id', booking.cleaner_id)
      .eq('blocked_date', body.bookingDate);

    if (blocked && blocked.length > 0) {
      return NextResponse.json(
        { error: 'The selected date is not available' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: body.bookingDate,
        start_time: body.startTime,
        end_time: body.endTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Reschedule booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to reschedule booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Booking rescheduled' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
