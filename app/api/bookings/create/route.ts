import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBookingConfirmationEmails } from '@/lib/email/booking-confirmation';

interface CreateBookingBody {
  cleanerId: string;
  serviceType: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  zipCode: string;
  address: string;
  specialInstructions?: string;
  estimatedPrice: number;
  estimatedHours: number;
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

  let body: CreateBookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    cleanerId,
    serviceType,
    propertyType,
    bedrooms,
    bathrooms,
    bookingDate,
    startTime,
    endTime,
    zipCode,
    address,
    specialInstructions,
    estimatedPrice,
    estimatedHours,
  } = body;

  // Validate required fields
  if (
    !cleanerId ||
    !serviceType ||
    !propertyType ||
    !bookingDate ||
    !startTime ||
    !endTime ||
    !zipCode ||
    !address ||
    !estimatedPrice ||
    !estimatedHours
  ) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Verify cleaner exists and has instant booking enabled
  const { data: cleaner, error: cleanerError } = await supabase
    .from('cleaners')
    .select('id, user_id, business_name, business_email, instant_booking, approval_status')
    .eq('id', cleanerId)
    .single();

  if (cleanerError || !cleaner) {
    return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
  }

  if (!cleaner.instant_booking) {
    return NextResponse.json(
      { error: 'This cleaner does not accept instant bookings' },
      { status: 400 }
    );
  }

  if (cleaner.approval_status !== 'approved') {
    return NextResponse.json(
      { error: 'This cleaner is not currently available' },
      { status: 400 }
    );
  }

  // Check for conflicting bookings
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('cleaner_id', cleanerId)
    .eq('booking_date', bookingDate)
    .eq('status', 'confirmed')
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'This time slot is no longer available' },
      { status: 409 }
    );
  }

  // Check blocked dates
  const { data: blocked } = await supabase
    .from('cleaner_blocked_dates')
    .select('id')
    .eq('cleaner_id', cleanerId)
    .eq('blocked_date', bookingDate);

  if (blocked && blocked.length > 0) {
    return NextResponse.json(
      { error: 'This date is not available' },
      { status: 409 }
    );
  }

  // Create the booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      cleaner_id: cleanerId,
      customer_id: user.id,
      service_type: serviceType,
      property_type: propertyType,
      bedrooms,
      bathrooms,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      zip_code: zipCode,
      address,
      special_instructions: specialInstructions || null,
      estimated_price: estimatedPrice,
      estimated_hours: estimatedHours,
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (bookingError) {
    console.error('Booking creation error:', bookingError);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }

  // Get customer info for email
  const { data: customer } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  // Get cleaner email
  const { data: cleanerUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', cleaner.user_id)
    .single();

  // Send confirmation emails (fire and forget)
  sendBookingConfirmationEmails({
    bookingId: booking.id,
    customerName: customer?.full_name || 'Customer',
    customerEmail: customer?.email || user.email || '',
    cleanerEmail: cleaner.business_email || cleanerUser?.email || '',
    businessName: cleaner.business_name,
    serviceType,
    propertyType,
    bedrooms,
    bathrooms,
    bookingDate,
    startTime,
    endTime,
    address,
    estimatedPrice,
    estimatedHours,
    specialInstructions: specialInstructions || undefined,
  }).catch((err) => console.error('Email send error:', err));

  return NextResponse.json({
    success: true,
    bookingId: booking.id,
  });
}
