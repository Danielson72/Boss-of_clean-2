import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '@/lib/utils/logger';
import { proHasCapturedQuote } from '@/lib/lead-pii';
import { scrubText } from '@/lib/pii-filter';
import { sendQuoteAcceptedProEmail, sendQuoteAcceptedCustomerEmail } from '@/lib/email/notifications';
import { notifyProQuoteAccepted, sendSMSIfEnabled } from '@/lib/sms/notifications';

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
    .select('*, cleaner:pros(id, user_id, business_name, approval_status)')
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

  // A7 Slice 1 — persist the accept with the service-role client.
  //
  // RLS on quote_requests intentionally restricts a customer's own UPDATE to
  // status='pending' (live policy quote_requests_customers_update_own:
  // USING customer_id = auth.uid() AND status = 'pending'). Once a pro responds
  // the row is 'responded', so a customer-credentialed UPDATE matches ZERO rows
  // — no error, phantom success, quote frozen. Ownership and the 'responded'
  // precondition are already enforced above (lines 36-46); we re-assert BOTH in
  // the .eq() filters here as a TOCTOU guard and require the row to actually
  // change, so we can never report phantom success. RLS itself stays untouched.
  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();
  const { data: accepted, error: updateError } = await admin
    .from('quote_requests')
    .update({
      status: 'accepted',
      accepted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', quoteId)
    .eq('customer_id', user.id)   // re-assert ownership at write time
    .eq('status', 'responded')    // re-assert precondition (blocks double-accept)
    .select('id')
    .maybeSingle();

  if (updateError) {
    logger.error('Error accepting quote', { function: 'POST' }, updateError);
    return NextResponse.json({ error: 'Failed to accept quote' }, { status: 500 });
  }

  if (!accepted) {
    // Zero rows changed => the row was not (owner, 'responded') at write time,
    // e.g. a concurrent accept already moved it. Surface it instead of pretending.
    return NextResponse.json(
      { error: 'Quote could not be accepted; it may have already been accepted.' },
      { status: 409 }
    );
  }

  // Create a booking from the accepted quote.
  const bookingDate = quote.service_date || quote.preferred_date || new Date().toISOString().split('T')[0];
  const startTime = quote.service_time || quote.preferred_time || '09:00';
  const estimatedHours = quote.estimated_hours || 3;

  // end_time = start + estimatedHours, clamped so the bookings CHECK
  // valid_booking_time (end_time > start_time) can never fail on the equal edge.
  // Naively capping the hour at 23 while keeping the start minutes can yield
  // end_time === start_time (e.g. start 23:30 -> 23:30). Compute in minutes,
  // cap at 23:59, and if that still isn't strictly after start, fall back to
  // 23:59 / push start back by a minute so end > start always holds.
  const [startH, startM] = startTime.split(':').map((n) => parseInt(n, 10) || 0);
  const startTotal = startH * 60 + startM;
  const DAY_MAX = 23 * 60 + 59; // 23:59
  let endTotal = Math.min(startTotal + estimatedHours * 60, DAY_MAX);
  let safeStartTotal = startTotal;
  if (endTotal <= startTotal) {
    // start is so late the window collapses; guarantee a 1-minute slot at EOD.
    endTotal = DAY_MAX;
    safeStartTotal = Math.min(startTotal, DAY_MAX - 1);
  }
  const fmt = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const safeStartTime = fmt(safeStartTotal);
  const endTime = fmt(endTotal);

  // Slice 1b — idempotency: one booking per accepted quote. bookings has no
  // quote_request_id column (no schema change in this slice), so we key off the
  // deterministic natural tuple this quote produces. A retry of the same accept
  // yields identical values and is a no-op instead of a duplicate booking.
  // CAVEAT: two *distinct* quotes with identical cleaner+customer+date+start
  // would also collapse to one booking — rare; the clean fix is a
  // bookings.quote_request_id FK + unique index (follow-up, schema-touching).
  const { data: existingBooking } = await admin
    .from('bookings')
    .select('id')
    .eq('cleaner_id', quote.cleaner_id)
    .eq('customer_id', user.id)
    .eq('booking_date', bookingDate)
    .eq('start_time', safeStartTime)
    .maybeSingle();

  let booking = existingBooking;
  let bookingError = null;
  if (!existingBooking) {
    // SEC-02 (DLD-555): PII wall at write time. The street address and raw
    // notes only go on the booking once this pro has PAID for the lead (a
    // captured lead_acceptance on this quote). Until then the booking carries
    // the quote_requests_pro_view exposure: city + zip only, with the notes
    // scrubbed of embedded contact info. Gating the write (not just the pro
    // read path) also covers direct RLS-scoped client reads of bookings. The
    // full address reaches the pro through the paid unlock handoff instead.
    const hasCaptured = await proHasCapturedQuote(admin, quote.cleaner_id, quoteId);
    const rawInstructions = quote.description || quote.special_requests || null;
    const safeInstructions = hasCaptured
      ? rawInstructions
      : rawInstructions
        ? scrubText(rawInstructions).scrubbed
        : null;
    if (!hasCaptured) {
      logger.info('Booking created with PII-walled fields (lead not captured)', {
        function: 'POST',
        quoteId,
        cleanerId: quote.cleaner_id,
      });
    }

    const insertRes = await admin
      .from('bookings')
      .insert({
        cleaner_id: quote.cleaner_id,
        customer_id: user.id,
        service_type: quote.service_type || 'residential',
        property_type: quote.property_type || 'house',
        bedrooms: 0,
        bathrooms: 0,
        booking_date: bookingDate,
        start_time: safeStartTime,
        end_time: endTime,
        zip_code: quote.zip_code || '',
        address: hasCaptured ? (quote.address || quote.city || '') : (quote.city || ''),
        special_instructions: safeInstructions,
        estimated_price: quote.quoted_price || 0,
        estimated_hours: estimatedHours,
        status: 'confirmed',
      })
      .select('id')
      .single();
    booking = insertRes.data;
    bookingError = insertRes.error;
  }

  if (bookingError) {
    // §3 DECOUPLE — the accept is already durably committed above. A booking
    // hiccup must NEVER silently revert the acceptance (that was the old bug:
    // a failed insert reverted status to 'responded'). Log, and return a
    // non-fatal success so the quote stays 'accepted'.
    //
    // Distinguish the common, actionable case — a stale quote whose
    // service_date has passed (bookings CHECK future_booking:
    // booking_date >= CURRENT_DATE, Postgres error 23514) — from generic
    // failures, so the UI can tell the pro to pick a new date.
    const isPastDate = (bookingError as { code?: string }).code === '23514';
    logger.error('Quote accepted but booking creation failed', {
      function: 'POST',
      quoteId,
      isPastDate,
    }, bookingError);

    return NextResponse.json({
      success: true,
      bookingId: null,
      bookingCreated: false,
      warning: isPastDate
        ? 'Quote accepted, but a booking was not created because the service date has passed — pick a new date.'
        : 'Quote accepted, but the booking could not be created automatically.',
      message: 'Quote accepted.',
    });
  }

  // Booking exists (created now or already present from a prior accept). Reuse
  // the `admin` client from the accept write — no second service client needed.
  const quotedPrice = Number(quote.quoted_price) || 0;
  const businessName = (quote.cleaner.business_name as string) || 'Your pro';

  // Pro in-app notification.
  try {
    await admin.from('notifications').insert({
      user_id: quote.cleaner.user_id,
      type: 'quote_accepted',
      title: 'Quote Accepted!',
      message: `Your quote of $${quotedPrice} has been accepted. A booking has been created.`,
      action_url: '/dashboard/pro/bookings',
    });
  } catch (notifErr) {
    logger.error('Failed to create cleaner notification', { function: 'POST' }, notifErr);
  }

  // Fetch contact details (service-role) for pro email/SMS and customer email.
  const [{ data: proContact }, { data: customer }] = await Promise.all([
    admin.from('pros').select('business_email, business_phone').eq('id', quote.cleaner_id).single(),
    admin.from('users').select('full_name, email').eq('id', quote.customer_id).single(),
  ]);

  // Pro: email + consent-gated SMS. This is the moment before they pay the $30
  // lead fee, so notify immediately. All non-blocking.
  if (proContact?.business_email) {
    sendQuoteAcceptedProEmail({
      to: proContact.business_email,
      businessName,
      quoteAmount: quotedPrice,
      quoteId,
    }).catch((err) => logger.error('Failed pro quote-accepted email', { function: 'POST' }, err));
  }
  if (proContact?.business_phone) {
    // Routes through the #89 consent gate (fail-closed): no consent → no text.
    sendSMSIfEnabled(() =>
      notifyProQuoteAccepted(quote.cleaner.user_id, proContact.business_phone, quotedPrice)
    ).catch((err) => logger.error('Pro quote-accepted SMS error', { function: 'POST' }, err));
  }

  // Customer: in-app + email confirmation explaining what happens next.
  try {
    await admin.from('notifications').insert({
      user_id: quote.customer_id,
      type: 'quote_accepted',
      title: 'Quote accepted',
      message: `You accepted ${businessName}'s $${quotedPrice} quote. They'll receive your contact info and reach out to arrange the details.`,
      action_url: '/dashboard/customer',
    });
  } catch (notifErr) {
    logger.error('Failed to create customer notification', { function: 'POST' }, notifErr);
  }
  const customerEmail = customer?.email;
  if (customerEmail) {
    sendQuoteAcceptedCustomerEmail({
      to: customerEmail,
      customerName: (customer?.full_name as string) || 'there',
      businessName,
      quoteAmount: quotedPrice,
    }).catch((err) => logger.error('Failed customer quote-accepted email', { function: 'POST' }, err));
  }

  logger.info('Quote accepted and booking confirmed', {
    function: 'POST',
    quoteId,
    bookingId: booking?.id ?? null,
    cleanerId: quote.cleaner_id,
  });

  return NextResponse.json({
    success: true,
    bookingId: booking?.id ?? null,
    bookingCreated: true,
    message: 'Quote accepted and booking confirmed!',
  });
}
