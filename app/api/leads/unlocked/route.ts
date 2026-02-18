import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get unlocked leads with full customer details
    const { data: unlocks, error: unlocksError } = await supabase
      .from('lead_unlocks')
      .select(`
        id,
        fee_tier,
        amount_cents,
        status,
        unlocked_at,
        created_at,
        quote_request:quote_requests(
          id,
          service_type,
          service_date,
          service_time,
          address,
          city,
          zip_code,
          property_size,
          property_type,
          description,
          special_requests,
          frequency,
          customer_id,
          customer:users!quote_requests_customer_id_fkey(
            full_name,
            phone,
            email
          )
        )
      `)
      .eq('cleaner_id', cleaner.id)
      .in('status', ['paid', 'credited'])
      .order('unlocked_at', { ascending: false });

    if (unlocksError) throw unlocksError;

    // Check for existing refund requests
    const unlockIds = (unlocks || []).map(u => u.id);
    let refundStatuses: Record<string, string> = {};

    if (unlockIds.length > 0) {
      const { data: refunds } = await supabase
        .from('lead_refund_requests')
        .select('lead_unlock_id, status')
        .in('lead_unlock_id', unlockIds);

      for (const r of (refunds || [])) {
        refundStatuses[r.lead_unlock_id] = r.status;
      }
    }

    const leads = (unlocks || []).map(u => ({
      ...u,
      refund_status: refundStatuses[u.id] || null,
    }));

    return NextResponse.json({ leads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
