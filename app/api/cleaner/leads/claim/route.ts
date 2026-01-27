import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Use atomic RPC to check credits and claim lead
    const { data, error } = await supabase.rpc('claim_lead_with_credit', {
      p_cleaner_id: cleaner.id,
      p_lead_id: leadId,
      p_tier: cleaner.subscription_tier || 'free',
    });

    if (error) {
      console.error('Error claiming lead:', error);
      return NextResponse.json({ error: 'Failed to claim lead' }, { status: 500 });
    }

    const result = data as { success: boolean; error?: string; credits_used?: number; credit_limit?: number };

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, credits_used: result.credits_used, credit_limit: result.credit_limit },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      credits_used: result.credits_used,
      credit_limit: result.credit_limit,
    });
  } catch (error) {
    console.error('Claim lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
