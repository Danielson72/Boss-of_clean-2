import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requiresPayment, getLeadFeeCents, LEAD_CREDIT_LIMITS } from '@/lib/stripe/lead-fee-service';

/**
 * GET /api/cleaner/leads/fee
 * Returns lead fee info for the current cleaner's tier and credit status
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id, subscription_tier, lead_credits_used, lead_credits_reset_at, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const tier = cleaner.subscription_tier || 'free';
    const creditsUsed = cleaner.lead_credits_used || 0;
    const creditLimit = LEAD_CREDIT_LIMITS[tier] ?? 0;
    const needsPayment = requiresPayment(tier, creditsUsed);
    const feeCents = needsPayment ? getLeadFeeCents(tier) : 0;
    const hasPaymentMethod = !!cleaner.stripe_customer_id;

    return NextResponse.json({
      tier,
      creditsUsed,
      creditLimit,
      needsPayment,
      feeCents,
      feeFormatted: feeCents > 0 ? `$${(feeCents / 100).toFixed(2)}` : '$0.00',
      hasPaymentMethod,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
