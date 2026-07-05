import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { capturedCustomerIdsForPro, redactCustomerForPro } from '@/lib/lead-pii';

const logger = createLogger({ file: 'api/cleaner/bookings/route' });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the cleaner profile
  const { data: cleaner, error: cleanerError } = await supabase
    .from('pros')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (cleanerError || !cleaner) {
    return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 403 });
  }

  // Fetch all bookings for this cleaner with customer info
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:users!bookings_customer_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq('cleaner_id', cleaner.id)
    .order('booking_date', { ascending: true });

  if (bookingsError) {
    logger.error('Error fetching cleaner bookings', { function: 'GET' }, bookingsError);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }

  // SEC-02 (DLD-555): PII wall. Until this pro has a captured (paid)
  // lead_acceptance for the customer, redact contact fields to the
  // quote_requests_pro_view exposure: first name, no email, no street
  // address, scrub-safe fields only. Also covers legacy rows written with a
  // full address before the write-time wall existed.
  const rows = bookings || [];
  const unlockedCustomerIds = await capturedCustomerIdsForPro(
    supabase,
    cleaner.id,
    rows.map((b: { customer_id: string }) => b.customer_id)
  );

  const walledBookings = rows.map((b: Record<string, unknown>) => {
    const isUnlocked = unlockedCustomerIds.has(b.customer_id as string);
    const customerRaw = b.customer as unknown;
    const customerObj = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
      | { id: string; full_name: string | null; email: string | null }
      | null;

    if (isUnlocked) {
      return { ...b, customer: customerObj };
    }
    return {
      ...b,
      customer: redactCustomerForPro(customerObj, false),
      address: '', // zip_code stays — same exposure as quote_requests_pro_view
      special_instructions: null,
    };
  });

  return NextResponse.json({ bookings: walledBookings });
}
