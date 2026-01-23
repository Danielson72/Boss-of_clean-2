import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cleanerId = searchParams.get('cleanerId');

  if (!cleanerId) {
    return NextResponse.json(
      { error: 'cleanerId is required' },
      { status: 400 }
    );
  }

  const supabase = createClient();

  // Fetch weekly availability slots
  const { data: availability, error: availError } = await supabase
    .from('cleaner_availability')
    .select('day_of_week, start_time, end_time, is_available')
    .eq('cleaner_id', cleanerId)
    .eq('is_available', true);

  if (availError) {
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }

  // Fetch blocked dates (from today onwards)
  const today = new Date().toISOString().split('T')[0];
  const { data: blockedDates, error: blockedError } = await supabase
    .from('cleaner_blocked_dates')
    .select('blocked_date')
    .eq('cleaner_id', cleanerId)
    .gte('blocked_date', today);

  if (blockedError) {
    return NextResponse.json(
      { error: 'Failed to fetch blocked dates' },
      { status: 500 }
    );
  }

  // Fetch existing bookings for this cleaner (confirmed, from today onwards)
  const { data: existingBookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('booking_date, start_time, end_time')
    .eq('cleaner_id', cleanerId)
    .eq('status', 'confirmed')
    .gte('booking_date', today);

  if (bookingsError) {
    // Bookings table might not exist yet, return empty
    return NextResponse.json({
      availability: availability || [],
      blockedDates: blockedDates || [],
      existingBookings: [],
    });
  }

  return NextResponse.json({
    availability: availability || [],
    blockedDates: blockedDates || [],
    existingBookings: existingBookings || [],
  });
}
