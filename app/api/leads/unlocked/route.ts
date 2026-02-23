import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UnlockedLeadDTO } from '@/lib/types/lead-dto';

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
          property_type,
          property_size,
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

    // Check for existing refund requests in one batch query
    const unlockIds = (unlocks || []).map(u => u.id);
    const refundStatuses: Record<string, string> = {};

    if (unlockIds.length > 0) {
      const { data: refunds } = await supabase
        .from('lead_refund_requests')
        .select('lead_unlock_id, status')
        .in('lead_unlock_id', unlockIds);

      for (const r of (refunds || [])) {
        refundStatuses[r.lead_unlock_id] = r.status;
      }
    }

    // For marketplace leads, customer contact may come from quote_requests contact_* fields
    // (guests don't have a user record). Normalize the response.
    const leads: UnlockedLeadDTO[] = (unlocks || []).map(u => {
      // Supabase FK joins can return array or object
      const qr = Array.isArray(u.quote_request) ? u.quote_request[0] : u.quote_request;

      // Customer from user FK join
      const customerFromUser = qr?.customer
        ? (Array.isArray(qr.customer) ? qr.customer[0] : qr.customer)
        : null;

      return {
        id: u.id,
        fee_tier: u.fee_tier,
        amount_cents: u.amount_cents,
        status: u.status,
        unlocked_at: u.unlocked_at,
        created_at: u.created_at,
        refund_status: refundStatuses[u.id] || null,
        quote_request: {
          id: qr?.id || '',
          service_type: qr?.service_type || '',
          service_date: qr?.service_date || null,
          service_time: qr?.service_time || null,
          address: qr?.address || '',
          city: qr?.city || '',
          zip_code: qr?.zip_code || '',
          property_type: qr?.property_type || null,
          property_size: qr?.property_size || null,
          description: qr?.description || null,
          special_requests: qr?.special_requests || null,
          frequency: qr?.frequency || null,
          customer: {
            full_name: customerFromUser?.full_name || '',
            phone: customerFromUser?.phone || null,
            email: customerFromUser?.email || '',
          },
        },
      };
    });

    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Unhandled error in /api/leads/unlocked:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
