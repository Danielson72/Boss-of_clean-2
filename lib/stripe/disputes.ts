/**
 * Dispute Service
 *
 * Handles Stripe charge disputes: records disputes, flags cleaners,
 * and sends notifications to admin and cleaner.
 */

import { createClient } from '@/lib/supabase/server';
import {
  sendDisputeAdminAlert,
  sendDisputeCleanerNotification,
  sendDisputeResolvedNotification,
} from '@/lib/email/dispute-notification';
import { createLogger } from '../utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'lib/stripe/disputes' });

export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  const supabase = createClient();

  const chargeId = typeof dispute.charge === 'string'
    ? dispute.charge
    : dispute.charge?.id || null;

  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : dispute.payment_intent?.id || null;

  // Find the cleaner associated with this charge via payments table
  let cleanerId: string | null = null;
  let cleanerName = 'Unknown';
  let cleanerEmail = 'unknown';
  let cleanerUserId: string | null = null;

  if (paymentIntentId) {
    const { data: payment } = await supabase
      .from('payments')
      .select('cleaner_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (payment) {
      cleanerId = payment.cleaner_id;
    }
  }

  // Fallback: try to find via charge_id in payments table
  if (!cleanerId && chargeId) {
    const { data: payment } = await supabase
      .from('payments')
      .select('cleaner_id')
      .eq('stripe_payment_intent_id', chargeId)
      .single();

    if (payment) {
      cleanerId = payment.cleaner_id;
    }
  }

  // Fallback: try to find via Stripe customer ID on the dispute
  if (!cleanerId) {
    // Dispute may have customer info in expanded fields
    const disputeData = dispute as unknown as Record<string, unknown>;
    const customerField = disputeData.customer as string | { id: string } | null;

    if (customerField) {
      const customerId = typeof customerField === 'string'
        ? customerField
        : customerField.id;

      const { data: cleaner } = await supabase
        .from('cleaners')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (cleaner) {
        cleanerId = cleaner.id;
      }
    }
  }

  if (!cleanerId) {
    logger.error(`Could not find cleaner for dispute ${dispute.id}`);
    // Still record the dispute with null cleaner for admin review
    await sendDisputeAdminAlert({
      disputeId: dispute.id,
      cleanerName: 'UNKNOWN - Manual review required',
      cleanerEmail: 'N/A',
      cleanerId: 'unknown',
      amount: dispute.amount,
      currency: dispute.currency,
      reason: dispute.reason || 'unknown',
      chargeId: chargeId || 'unknown',
    });
    return;
  }

  // Get cleaner details
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('business_name, user_id, dispute_count')
    .eq('id', cleanerId)
    .single();

  if (cleaner) {
    cleanerName = cleaner.business_name || 'Unknown Business';
    cleanerUserId = cleaner.user_id;
  }

  // Get cleaner email
  if (cleanerUserId) {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', cleanerUserId)
      .single();

    if (user) {
      cleanerEmail = user.email;
    }
  }

  // Record the dispute
  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : null;

  await supabase.from('disputes').insert({
    stripe_dispute_id: dispute.id,
    cleaner_id: cleanerId,
    charge_id: chargeId,
    payment_intent_id: paymentIntentId,
    amount_cents: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason || 'unknown',
    status: dispute.status,
    evidence_due_by: evidenceDueBy,
  });

  // Flag the cleaner
  const newDisputeCount = (cleaner?.dispute_count || 0) + 1;
  await supabase
    .from('cleaners')
    .update({
      dispute_count: newDisputeCount,
      dispute_status: 'under_review',
    })
    .eq('id', cleanerId);

  // Notify admin
  await sendDisputeAdminAlert({
    disputeId: dispute.id,
    cleanerName,
    cleanerEmail,
    cleanerId,
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason || 'unknown',
    chargeId: chargeId || 'unknown',
  });

  // Notify cleaner
  await sendDisputeCleanerNotification({
    to: cleanerEmail,
    businessName: cleanerName,
    disputeId: dispute.id,
    amount: dispute.amount,
    currency: dispute.currency,
    reason: dispute.reason || 'unknown',
    evidenceDueBy,
  });

  logger.info(`Dispute ${dispute.id} recorded for cleaner ${cleanerId} (${cleanerName})`);
}

export async function handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
  const supabase = createClient();

  const outcome = dispute.status === 'won' ? 'won' : 'lost';

  // Update dispute record
  await supabase
    .from('disputes')
    .update({
      status: dispute.status,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_dispute_id', dispute.id);

  // Get dispute details for cleaner lookup
  const { data: disputeRecord } = await supabase
    .from('disputes')
    .select('cleaner_id, amount_cents, currency')
    .eq('stripe_dispute_id', dispute.id)
    .single();

  if (!disputeRecord) {
    logger.error(`Dispute record not found for ${dispute.id}`);
    return;
  }

  // Update cleaner dispute status
  // Check if they have any other open disputes
  const { count } = await supabase
    .from('disputes')
    .select('*', { count: 'exact', head: true })
    .eq('cleaner_id', disputeRecord.cleaner_id)
    .not('status', 'in', '("won","lost")');

  const newDisputeStatus = (count && count > 0) ? 'under_review' : 'none';

  await supabase
    .from('cleaners')
    .update({ dispute_status: newDisputeStatus })
    .eq('id', disputeRecord.cleaner_id);

  // Get cleaner email for notification
  const { data: cleaner } = await supabase
    .from('cleaners')
    .select('business_name, user_id')
    .eq('id', disputeRecord.cleaner_id)
    .single();

  if (cleaner?.user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', cleaner.user_id)
      .single();

    if (user) {
      await sendDisputeResolvedNotification({
        to: user.email,
        businessName: cleaner.business_name || 'Business Owner',
        disputeId: dispute.id,
        amount: disputeRecord.amount_cents,
        currency: disputeRecord.currency,
        outcome,
      });
    }
  }

  logger.info(`Dispute ${dispute.id} closed with outcome: ${outcome}`);
}
