'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CleanerBooking } from '@/components/booking/CleanerBookingList';

// Keep free text and contact out of the initial projection.
const bookingColumns = 'id, cleaner_id, customer_id, service_type, property_type, bedrooms, bathrooms, booking_date, start_time, end_time, zip_code, estimated_price, estimated_hours, status, cancelled_at, created_at, updated_at, stripe_payment_intent_id';
type BookingRow = Omit<CleanerBooking, 'customer' | 'address' | 'special_instructions' | 'cancellation_reason'> & {
  stripe_payment_intent_id: string | null;
};
type Quote = { id: string; cleaner_id: string; customer_id: string; status: string };
type Acceptance = {
  cleaner_id: string;
  quote_request_id: string;
  stripe_payment_intent_id: string;
  status: string;
  quote: Quote | Quote[] | null;
};

export async function getProBookings(): Promise<{
  success: boolean;
  bookings: CleanerBooking[];
  error?: string;
}> {
  let redacted: CleanerBooking[] = [];
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, bookings: [], error: 'Not authenticated.' };

    const { data: pro, error: proError } = await supabase
      .from('pros')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();
    if (proError || !pro || pro.user_id !== user.id) {
      return { success: false, bookings: [], error: 'Pro profile not found.' };
    }

    const admin = createServiceRoleClient();
    const { data, error: bookingsError } = await admin
      .from('bookings')
      .select(bookingColumns)
      .eq('cleaner_id', pro.id)
      .order('booking_date', { ascending: true });
    if (bookingsError) throw new Error('Booking lookup failed');
    const rows = ((data || []) as BookingRow[]).filter((b) => b.cleaner_id === pro.id);
    redacted = rows.map((b) => ({
      id: b.id,
      cleaner_id: b.cleaner_id,
      customer_id: b.customer_id,
      service_type: b.service_type,
      property_type: b.property_type,
      bedrooms: b.bedrooms,
      bathrooms: b.bathrooms,
      booking_date: b.booking_date,
      start_time: b.start_time,
      end_time: b.end_time,
      zip_code: b.zip_code,
      estimated_price: b.estimated_price,
      estimated_hours: b.estimated_hours,
      status: b.status,
      cancelled_at: b.cancelled_at,
      created_at: b.created_at,
      updated_at: b.updated_at,
      address: '',
      customer: { full_name: 'Customer', email: '' },
    }));
    if (rows.length === 0) return { success: true, bookings: redacted };

    const customerIds = Array.from(new Set(rows.map((b) => b.customer_id)));
    const { data: names, error: namesError } = await admin
      .from('users').select('id, full_name').in('id', customerIds);
    if (namesError) throw new Error('Name lookup failed');
    const namesById = new Map<string, string>(
      (names || []).map((c: { id: string; full_name: string | null }) =>
        [c.id, c.full_name?.trim().split(/\s+/)[0] || 'Customer'])
    );
    redacted = redacted.map((b) => ({
      ...b, customer: { full_name: namesById.get(b.customer_id) || 'Customer', email: '' },
    }));

    // No quote FK exists on bookings. Only an exact, unambiguous payment
    // reference can link a booking here; customer/schedule similarity cannot.
    const paymentIds = rows.map((b) => b.stripe_payment_intent_id).filter((id): id is string => !!id);
    if (paymentIds.length === 0) return { success: true, bookings: redacted };
    const { data: acceptances, error: acceptanceError } = await admin
      .from('lead_acceptances')
      .select('cleaner_id, quote_request_id, stripe_payment_intent_id, status, quote:quote_requests!inner(id, cleaner_id, customer_id, status)')
      .eq('cleaner_id', pro.id)
      .eq('status', 'captured')
      .eq('quote.status', 'accepted')
      .in('stripe_payment_intent_id', paymentIds);
    if (acceptanceError) throw new Error('Payment lookup failed');

    const unlocked = rows.filter((b) => {
      const paymentId = b.stripe_payment_intent_id;
      if (!paymentId || paymentIds.filter((id) => id === paymentId).length !== 1) return false;
      const matches = ((acceptances || []) as Acceptance[])
        .filter((a) => a.stripe_payment_intent_id === paymentId);
      if (matches.length !== 1) return false;
      const a = matches[0];
      const q = Array.isArray(a.quote) ? (a.quote.length === 1 ? a.quote[0] : null) : a.quote;
      return a.cleaner_id === pro.id && a.status === 'captured' &&
        !!q && q.id === a.quote_request_id && q.status === 'accepted' &&
        q.cleaner_id === pro.id && q.customer_id === b.customer_id;
    });
    if (unlocked.length === 0) return { success: true, bookings: redacted };

    const [contacts, details] = await Promise.all([
      admin.from('users').select('id, full_name, email, phone')
        .in('id', unlocked.map((b) => b.customer_id)),
      admin.from('bookings').select('id, cleaner_id, customer_id, stripe_payment_intent_id, address, special_instructions, cancellation_reason')
        .eq('cleaner_id', pro.id).in('id', unlocked.map((b) => b.id)),
    ]);
    if (contacts.error || details.error) throw new Error('Contact lookup failed');

    const bookings = redacted.map((b) => {
      const link = unlocked.find((row) => row.id === b.id);
      if (!link) return b;
      const contact = contacts.data?.find((c: { id: string }) => c.id === b.customer_id);
      const detail = details.data?.find((d: { id: string }) => d.id === b.id);
      if (!contact || !detail || detail.cleaner_id !== pro.id ||
          detail.customer_id !== b.customer_id || detail.stripe_payment_intent_id !== link.stripe_payment_intent_id) return b;
      return {
        ...b,
        address: detail.address || '',
        special_instructions: detail.special_instructions || undefined,
        cancellation_reason: detail.cancellation_reason || undefined,
        customer: {
          full_name: contact.full_name || b.customer.full_name,
          email: contact.email || '',
          phone: contact.phone || undefined,
        },
      };
    });
    return { success: true, bookings };
  } catch {
    // Never serialize a database error or a partially enriched result.
    return { success: false, bookings: redacted, error: 'Some booking details could not be loaded.' };
  }
}
