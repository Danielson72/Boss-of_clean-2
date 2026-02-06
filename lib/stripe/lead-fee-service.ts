import { getStripe } from './config';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/stripe/lead-fee-service' });

// Per-lead fee structure (in cents)
export const LEAD_FEE_CENTS: Record<string, number> = {
  free: 1500,       // $15 per lead
  basic: 1000,      // $10 per additional lead (after monthly credits exhausted)
  pro: 0,           // Included in subscription
  enterprise: 0,    // Included in subscription
};

// Monthly credit limits by tier
export const LEAD_CREDIT_LIMITS: Record<string, number> = {
  free: 0,           // No free credits - always pay per lead
  basic: 20,         // 20 included per month
  pro: -1,           // Unlimited
  enterprise: -1,    // Unlimited
};

/**
 * Determine if a lead claim requires payment
 */
export function requiresPayment(tier: string, creditsUsed: number): boolean {
  const fee = LEAD_FEE_CENTS[tier] || LEAD_FEE_CENTS.free;
  if (fee === 0) return false;

  const creditLimit = LEAD_CREDIT_LIMITS[tier];
  if (creditLimit === -1) return false; // Unlimited
  if (creditLimit > 0 && creditsUsed < creditLimit) return false; // Still has credits

  return true;
}

/**
 * Get the lead fee for a tier (in cents)
 */
export function getLeadFeeCents(tier: string): number {
  return LEAD_FEE_CENTS[tier] || LEAD_FEE_CENTS.free;
}

/**
 * Charge a cleaner's saved payment method for a lead fee.
 * Returns the PaymentIntent ID on success, or an error object.
 */
export async function chargeLeadFee(
  cleanerId: string,
  leadId: string,
  tier: string
): Promise<{ success: true; paymentIntentId: string } | { success: false; error: string; needsPaymentMethod?: boolean }> {
  const stripe = getStripe();
  const supabase = await createClient();

  const feeCents = getLeadFeeCents(tier);
  if (feeCents === 0) {
    return { success: true, paymentIntentId: 'no_charge' };
  }

  try {
    // Get cleaner's Stripe customer ID
    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('stripe_customer_id, business_name')
      .eq('id', cleanerId)
      .single();

    if (!cleaner?.stripe_customer_id) {
      return {
        success: false,
        error: 'No payment method on file. Please add a card in Billing settings before claiming leads.',
        needsPaymentMethod: true,
      };
    }

    // Get the customer's default payment method
    const customer = await stripe.customers.retrieve(cleaner.stripe_customer_id) as import('stripe').default.Customer;
    if (customer.deleted) {
      return {
        success: false,
        error: 'Payment account not found. Please update your billing information.',
        needsPaymentMethod: true,
      };
    }

    const defaultPm = typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id || null;

    let paymentMethodId: string;

    if (!defaultPm) {
      // Try to find any payment method on file
      const methods = await stripe.paymentMethods.list({
        customer: cleaner.stripe_customer_id,
        type: 'card',
        limit: 1,
      });

      if (methods.data.length === 0) {
        return {
          success: false,
          error: 'No payment method on file. Please add a card in Billing settings before claiming leads.',
          needsPaymentMethod: true,
        };
      }

      // Use the first available card
      paymentMethodId = methods.data[0].id;
    } else {
      paymentMethodId = defaultPm;
    }

    // Create a pending lead_charge record
    const { data: charge, error: chargeError } = await supabase
      .from('lead_charges')
      .insert({
        cleaner_id: cleanerId,
        lead_id: leadId,
        amount_cents: feeCents,
        status: 'pending',
      })
      .select('id')
      .single();

    if (chargeError) {
      logger.error('Failed to create lead charge record', {}, chargeError);
      return { success: false, error: 'Failed to initiate payment' };
    }

    // Create and confirm PaymentIntent immediately (off-session)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: feeCents,
      currency: 'usd',
      customer: cleaner.stripe_customer_id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      description: `Lead fee - ${tier} tier`,
      metadata: {
        type: 'lead_fee',
        cleaner_id: cleanerId,
        lead_id: leadId,
        lead_charge_id: charge.id,
        tier: tier,
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Update lead_charge record
      await supabase
        .from('lead_charges')
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          status: 'succeeded',
        })
        .eq('id', charge.id);

      // Also record in the payments table for unified payment history
      await supabase.from('payments').insert({
        cleaner_id: cleanerId,
        stripe_payment_intent_id: paymentIntent.id,
        amount: feeCents / 100,
        currency: 'usd',
        status: 'succeeded',
        description: `Lead fee (${tier} tier)`,
        metadata: { lead_id: leadId, lead_charge_id: charge.id, type: 'lead_fee' },
        paid_at: new Date().toISOString(),
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    }

    // Payment requires action (3D Secure, etc.) - mark as failed for now
    await supabase
      .from('lead_charges')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'failed',
      })
      .eq('id', charge.id);

    return {
      success: false,
      error: 'Payment requires additional authentication. Please update your payment method in Billing settings.',
      needsPaymentMethod: true,
    };

  } catch (err: unknown) {
    const error = err as Error & { type?: string; code?: string };
    logger.error('Lead fee charge failed', { cleanerId, leadId, tier }, error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return {
        success: false,
        error: `Payment failed: ${error.message}. Please update your card in Billing settings.`,
        needsPaymentMethod: true,
      };
    }

    return { success: false, error: 'Payment processing failed. Please try again.' };
  }
}
