import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chargeLeadFee, requiresPayment, getLeadFeeCents } from '@/lib/stripe/lead-fee-service';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/leads/claim/route' });

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
      .select('id, subscription_tier, lead_credits_used, lead_credits_reset_at')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    const tier = cleaner.subscription_tier || 'free';
    const creditsUsed = cleaner.lead_credits_used || 0;
    const needsPayment = requiresPayment(tier, creditsUsed);

    // If payment is required, charge the cleaner's card first
    if (needsPayment) {
      const feeCents = getLeadFeeCents(tier);
      logger.info('Charging lead fee', { cleanerId: cleaner.id, leadId, tier, feeCents });

      const chargeResult = await chargeLeadFee(cleaner.id, leadId, tier);

      if (!chargeResult.success) {
        return NextResponse.json(
          {
            error: chargeResult.error,
            needsPaymentMethod: chargeResult.needsPaymentMethod || false,
            feeCents,
          },
          { status: 402 }
        );
      }

      logger.info('Lead fee charged successfully', {
        cleanerId: cleaner.id,
        leadId,
        paymentIntentId: chargeResult.paymentIntentId,
      });
    }

    // Use atomic RPC to check credits and claim lead
    const { data, error } = await supabase.rpc('claim_lead_with_credit', {
      p_cleaner_id: cleaner.id,
      p_lead_id: leadId,
      p_tier: tier,
    });

    if (error) {
      logger.error('Error claiming lead', { function: 'POST' }, error);
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
      charged: needsPayment,
      feeCents: needsPayment ? getLeadFeeCents(tier) : 0,
    });
  } catch (error) {
    logger.error('Claim lead error', { function: 'POST' }, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
