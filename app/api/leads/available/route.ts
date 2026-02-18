import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cleaner profile + service areas
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const { data: serviceAreas } = await supabase
      .from('service_areas')
      .select('zip_code')
      .eq('cleaner_id', cleaner.id);

    const zipCodes = (serviceAreas || []).map(sa => sa.zip_code);

    if (zipCodes.length === 0) {
      return NextResponse.json({ leads: [], message: 'No service areas configured' });
    }

    // Get pending quote requests in service areas
    const { data: quotes, error: quotesError } = await supabase
      .from('quote_requests')
      .select('id, service_type, zip_code, city, property_size, property_type, service_date, created_at, frequency')
      .eq('status', 'pending')
      .in('zip_code', zipCodes)
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    // Get unlock counts for each quote (for competition indicator)
    const quoteIds = (quotes || []).map(q => q.id);
    let unlockCounts: Record<string, number> = {};
    let myUnlocks = new Set<string>();

    if (quoteIds.length > 0) {
      const { data: unlocks } = await supabase
        .from('lead_unlocks')
        .select('quote_request_id, cleaner_id, status')
        .in('quote_request_id', quoteIds)
        .in('status', ['paid', 'credited']);

      for (const u of (unlocks || [])) {
        unlockCounts[u.quote_request_id] = (unlockCounts[u.quote_request_id] || 0) + 1;
        if (u.cleaner_id === cleaner.id) {
          myUnlocks.add(u.quote_request_id);
        }
      }
    }

    // Build response with competition indicator, exclude already unlocked
    const leads = (quotes || [])
      .filter(q => !myUnlocks.has(q.id))
      .map(q => ({
        id: q.id,
        service_type: q.service_type,
        zip_code: q.zip_code,
        city: q.city,
        property_size: q.property_size,
        property_type: q.property_type,
        service_date: q.service_date,
        frequency: q.frequency,
        created_at: q.created_at,
        competition_count: unlockCounts[q.id] || 0,
        competition_remaining: 3 - (unlockCounts[q.id] || 0),
      }));

    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
