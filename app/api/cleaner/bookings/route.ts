import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/bookings/route' });

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the cleaner profile
  const { data: cleaner, error: cleanerError } = await supabase
    .from('cleaners')
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

  return NextResponse.json({ bookings: bookings || [] });
}
