import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deriveFeeTier, FEE_TIER_CENTS } from '@/lib/types/lead-dto';
import type { AvailableLeadDTO } from '@/lib/types/lead-dto';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Get this pro's service area zip codes
    const { data: serviceAreas } = await supabase
      .from('service_areas')
      .select('zip_code')
      .eq('cleaner_id', cleaner.id);

    const zipCodes = (serviceAreas || []).map(sa => sa.zip_code);

    if (zipCodes.length === 0) {
      return NextResponse.json({ leads: [], message: 'No service areas configured' });
    }

    // Bulk query: marketplace leads (cleaner_id IS NULL) in pro's service areas
    // Explicit allow-list of columns — NEVER return PII fields
    const { data: quotes, error: quotesError } = await supabase
      .from('quote_requests')
      .select('id, service_type, zip_code, city, property_type, property_size, frequency, created_at')
      .eq('status', 'pending')
      .is('cleaner_id', null)
      .in('zip_code', zipCodes)
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ leads: [] });
    }

    // Batch: get unlock counts + this pro's existing unlocks in one query
    const quoteIds = quotes.map(q => q.id);

    const { data: unlocks } = await supabase
      .from('lead_unlocks')
      .select('quote_request_id, cleaner_id, status')
      .in('quote_request_id', quoteIds)
      .in('status', ['paid', 'credited', 'pending']);

    const unlockCounts: Record<string, number> = {};
    const myUnlocks = new Set<string>();

    for (const u of (unlocks || [])) {
      if (u.status === 'paid' || u.status === 'credited') {
        unlockCounts[u.quote_request_id] = (unlockCounts[u.quote_request_id] || 0) + 1;
      }
      if (u.cleaner_id === cleaner.id) {
        myUnlocks.add(u.quote_request_id);
      }
    }

    // Build safe DTOs: exclude already-unlocked leads and full leads
    const leads: AvailableLeadDTO[] = quotes
      .filter(q => !myUnlocks.has(q.id) && (unlockCounts[q.id] || 0) < 3)
      .map(q => {
        const count = unlockCounts[q.id] || 0;
        const feeTier = deriveFeeTier(q.service_type);
        return {
          id: q.id,
          service_type: q.service_type,
          zip_code: q.zip_code,
          city: q.city,
          property_type: q.property_type,
          property_size: q.property_size,
          frequency: q.frequency,
          created_at: q.created_at,
          unlock_count: count,
          competition_remaining: 3 - count,
          fee_tier: feeTier,
          unlock_price_cents: FEE_TIER_CENTS[feeTier],
        };
      });

    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
