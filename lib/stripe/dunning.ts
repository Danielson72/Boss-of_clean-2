/**
 * Dunning Service
 *
 * Manages failed payment retry logic, grace periods, and
 * subscription downgrades after exhausting retries.
 *
 * Retry schedule: 3 attempts over 7 days
 *  - Attempt 1: Immediate (handled by Stripe)
 *  - Attempt 2: Day 3
 *  - Attempt 3: Day 5
 *  - Downgrade: Day 7 (grace period expires)
 */

import { createClient } from '@/lib/supabase/server';
import { sendPaymentFailedEmail, sendFinalWarningEmail, sendDowngradeEmail } from '@/lib/email/payment-failed';
import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/stripe/dunning' });
const MAX_RETRY_ATTEMPTS = 3;
const GRACE_PERIOD_DAYS = 7;

export interface DunningState {
  cleanerId: string;
  failedCount: number;
  gracePeriodEnd: string | null;
  isInGracePeriod: boolean;
  shouldDowngrade: boolean;
}

/**
 * Process a payment failure event and determine the appropriate action.
 * Called by the webhook handler after recording the failed payment.
 */
export async function processDunningEvent(
  cleanerId: string,
  invoiceId: string
): Promise<DunningState> {
  const supabase = createClient();

  // Get current cleaner state
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('payment_failed_count, business_name, grace_period_end, user_id, subscription_tier')
    .eq('id', cleanerId)
    .single();

  if (!cleaner) {
    throw new Error(`Cleaner not found: ${cleanerId}`);
  }

  // Get cleaner email from users table
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('id', cleaner.user_id)
    .single();

  if (!user) {
    throw new Error(`User not found for cleaner: ${cleanerId}`);
  }

  const failedCount = cleaner.payment_failed_count || 0;
  const now = new Date();

  // Determine dunning state
  const state: DunningState = {
    cleanerId,
    failedCount,
    gracePeriodEnd: cleaner.grace_period_end || null,
    isInGracePeriod: false,
    shouldDowngrade: false,
  };

  if (failedCount === 1) {
    // First failure: Start grace period, send first warning
    const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await supabase
      .from('cleaners')
      .update({
        grace_period_end: gracePeriodEnd.toISOString(),
      })
      .eq('id', cleanerId);

    // Update subscription status to past_due
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('cleaner_id', cleanerId)
      .neq('status', 'canceled');

    state.gracePeriodEnd = gracePeriodEnd.toISOString();
    state.isInGracePeriod = true;

    await sendPaymentFailedEmail({
      to: user.email,
      businessName: cleaner.business_name || 'Business Owner',
      attemptNumber: 1,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      gracePeriodEnd: gracePeriodEnd.toISOString(),
      invoiceId,
    });
  } else if (failedCount === 2) {
    // Second failure: Send escalated warning
    state.isInGracePeriod = true;

    await sendPaymentFailedEmail({
      to: user.email,
      businessName: cleaner.business_name || 'Business Owner',
      attemptNumber: 2,
      maxAttempts: MAX_RETRY_ATTEMPTS,
      gracePeriodEnd: state.gracePeriodEnd || '',
      invoiceId,
    });
  } else if (failedCount >= MAX_RETRY_ATTEMPTS) {
    // Final failure: Send final warning, check if grace period expired
    const gracePeriodEnd = cleaner.grace_period_end
      ? new Date(cleaner.grace_period_end)
      : null;

    if (!gracePeriodEnd || now >= gracePeriodEnd) {
      // Grace period expired - downgrade
      state.shouldDowngrade = true;
      await downgradeToFree(cleanerId);

      await sendDowngradeEmail({
        to: user.email,
        businessName: cleaner.business_name || 'Business Owner',
        previousTier: cleaner.subscription_tier || 'pro',
      });
    } else {
      // Grace period still active - send final warning
      state.isInGracePeriod = true;

      await sendFinalWarningEmail({
        to: user.email,
        businessName: cleaner.business_name || 'Business Owner',
        gracePeriodEnd: gracePeriodEnd.toISOString(),
      });
    }
  }

  return state;
}

/**
 * Downgrade a cleaner to the free tier after grace period expiration.
 */
async function downgradeToFree(cleanerId: string): Promise<void> {
  const supabase = createClient();

  // Update cleaner to free tier
  await supabase
    .from('cleaners')
    .update({
      subscription_tier: 'free',
      grace_period_end: null,
      payment_failed_count: 0,
    })
    .eq('id', cleanerId);

  // Mark subscription as canceled
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('cleaner_id', cleanerId)
    .neq('status', 'canceled');

  logger.info(`Cleaner ${cleanerId} downgraded to free tier after failed payments`);
}

/**
 * Check if a cleaner is currently in a grace period.
 * Used by the dashboard to show payment failure alerts.
 */
export async function getGracePeriodStatus(cleanerId: string): Promise<{
  inGracePeriod: boolean;
  failedCount: number;
  gracePeriodEnd: string | null;
  daysRemaining: number | null;
}> {
  const supabase = createClient();

  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('payment_failed_count, grace_period_end')
    .eq('id', cleanerId)
    .single();

  if (!cleaner) {
    return { inGracePeriod: false, failedCount: 0, gracePeriodEnd: null, daysRemaining: null };
  }

  const failedCount = cleaner.payment_failed_count || 0;
  const gracePeriodEnd = cleaner.grace_period_end;

  if (!gracePeriodEnd || failedCount === 0) {
    return { inGracePeriod: false, failedCount: 0, gracePeriodEnd: null, daysRemaining: null };
  }

  const now = new Date();
  const endDate = new Date(gracePeriodEnd);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    inGracePeriod: now < endDate,
    failedCount,
    gracePeriodEnd,
    daysRemaining,
  };
}

/**
 * Reset dunning state when a payment succeeds.
 * Called by the payment succeeded handler.
 */
export async function resetDunningState(cleanerId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('cleaners')
    .update({
      payment_failed_count: 0,
      grace_period_end: null,
    })
    .eq('id', cleanerId);

  // Restore subscription status to active
  await supabase
    .from('subscriptions')
    .update({ status: 'active' })
    .eq('cleaner_id', cleanerId)
    .eq('status', 'past_due');

  logger.info(`Dunning state reset for cleaner ${cleanerId}`);
}
