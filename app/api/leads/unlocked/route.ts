import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UnlockedLeadDTO } from '@/lib/types/lead-dto';

export const dynamic = 'force-dynamic';

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
    const { data: acceptances, error: acceptancesError } = await supabase
      .from('lead_acceptances')
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
      .in('status', ['captured'])
      .order('unlocked_at', { ascending: false });

    if (acceptancesError) throw acceptancesError;

    // Check for existing refund decisions in one batch query
    const acceptanceIds = (acceptances || []).map(a => a.id);
    const refundStatuses: Record<string, string> = {};

    if (acceptanceIds.length > 0) {
      const { data: refunds } = await supabase
        .from('refund_decisions')
        .select('lead_acceptance_id, state')
        .in('lead_acceptance_id', acceptanceIds);

      for (const r of (refunds || [])) {
        refundStatuses[r.lead_acceptance_id] = r.state;
      }
    }

    // For marketplace leads, customer contact may come from quote_requests contact_* fields
    // (guests don't have a user record). Normalize the response.
    const leads: UnlockedLeadDTO[] = (acceptances || []).map(a => {
      // Supabase FK joins can return array or object
      const qr = Array.isArray(a.quote_request) ? a.quote_request[0] : a.quote_request;

      // Customer from user FK join
      const customerFromUser = qr?.customer
        ? (Array.isArray(qr.customer) ? qr.customer[0] : qr.customer)
        : null;

      return {
        id: a.id,
        fee_tier: a.fee_tier,
        amount_cents: a.amount_cents,
        status: a.status,
        unlocked_at: a.unlocked_at,
        created_at: a.created_at,
        refund_status: refundStatuses[a.id] || null,
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
