import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/quotes/[id]/accept/route' });

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const quoteId = params.id;

  // Fetch the quote request — must belong to this customer and be in 'responded' status
  const { data: quote, error: fetchError } = await supabase
    .from('quote_requests')
    .select('*, cleaner:cleaners(id, user_id, business_name, approval_status)')
    .eq('id', quoteId)
    .single();

  if (fetchError || !quote) {
    return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
  }

  // Verify ownership
  if (quote.customer_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized to accept this quote' }, { status: 403 });
  }

  // Must be in 'responded' status to accept
  if (quote.status !== 'responded') {
    return NextResponse.json(
      { error: `Cannot accept a quote with status "${quote.status}". Only responded quotes can be accepted.` },
      { status: 400 }
    );
  }

  if (!quote.cleaner_id || !quote.cleaner) {
    return NextResponse.json({ error: 'No cleaner assigned to this quote' }, { status: 400 });
  }

  // Update quote status to 'accepted'
  const { error: updateError } = await supabase
    .from('quote_requests')
    .update({
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  if (updateError) {
    logger.error('Error accepting quote', { function: 'POST' }, updateError);
    return NextResponse.json({ error: 'Failed to accept quote' }, { status: 500 });
  }

  // Create a booking from the accepted quote
  const bookingDate = quote.service_date || quote.preferred_date || new Date().toISOString().split('T')[0];
  const startTime = quote.service_time || quote.preferred_time || '09:00';
  const estimatedHours = quote.estimated_hours || 3;
  const endHour = parseInt(startTime.split(':')[0]) + estimatedHours;
  const endTime = `${String(Math.min(endHour, 23)).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      cleaner_id: quote.cleaner_id,
      customer_id: user.id,
      service_type: quote.service_type || 'residential',
      property_type: quote.property_type || 'house',
      bedrooms: 0,
      bathrooms: 0,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      zip_code: quote.zip_code || '',
      address: quote.address || quote.city || '',
      special_instructions: quote.description || quote.special_instructions || null,
      estimated_price: quote.quoted_price || 0,
      estimated_hours: estimatedHours,
      status: 'confirmed',
    })
    .select('id')
    .single();

  if (bookingError) {
    logger.error('Error creating booking from quote', { function: 'POST' }, bookingError);
    // Revert quote status on booking failure
    await supabase
      .from('quote_requests')
      .update({ status: 'responded', updated_at: new Date().toISOString() })
      .eq('id', quoteId);

    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }

  // Create notification for the cleaner
  try {
    const adminSupabase = createServiceRoleClient();
    await adminSupabase.from('notifications').insert({
      user_id: quote.cleaner.user_id,
      type: 'quote_accepted',
      title: 'Quote Accepted!',
      message: `Your quote of $${quote.quoted_price} has been accepted. A booking has been created.`,
      action_url: '/dashboard/pro/bookings',
    });
  } catch (notifErr) {
    logger.error('Failed to create cleaner notification', { function: 'POST' }, notifErr);
  }

  logger.info('Quote accepted and booking created', {
    function: 'POST',
    quoteId,
    bookingId: booking.id,
    cleanerId: quote.cleaner_id,
  });

  return NextResponse.json({
    success: true,
    bookingId: booking.id,
    message: 'Quote accepted and booking confirmed!',
  });
}
