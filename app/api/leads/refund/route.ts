import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lead_unlock_id, reason, evidence } = await request.json();

    if (!lead_unlock_id || !reason) {
      return NextResponse.json({ error: 'lead_unlock_id and reason are required' }, { status: 400 });
    }

    const validReasons = [
      'wrong_contact_info',
      'outside_service_area',
      'not_a_real_lead',
      'duplicate_lead',
      'customer_cancelled_before_contact',
      'other',
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
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

    // Verify the unlock belongs to this cleaner
    const { data: unlock, error: unlockError } = await supabase
      .from('lead_unlocks')
      .select('id, amount_cents')
      .eq('id', lead_unlock_id)
      .eq('cleaner_id', cleaner.id)
      .in('status', ['paid', 'credited'])
      .single();

    if (unlockError || !unlock) {
      return NextResponse.json({ error: 'Lead unlock not found or not eligible for refund' }, { status: 404 });
    }

    // Check for existing refund request
    const { data: existingRefund } = await supabase
      .from('lead_refund_requests')
      .select('id')
      .eq('lead_unlock_id', lead_unlock_id)
      .single();

    if (existingRefund) {
      return NextResponse.json({ error: 'Refund already requested for this lead' }, { status: 409 });
    }

    // Create refund request
    const { data: refund, error: refundError } = await supabase
      .from('lead_refund_requests')
      .insert({
        lead_unlock_id,
        cleaner_id: cleaner.id,
        reason,
        evidence: evidence || null,
        refund_amount_cents: unlock.amount_cents,
      })
      .select('id')
      .single();

    if (refundError) throw refundError;

    return NextResponse.json({ refund_id: refund.id, status: 'pending' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
