'use server';

import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { getCustomerInvoices, InvoiceData } from '@/lib/stripe/invoices';
import { subscriptionService } from '@/lib/stripe/subscription-service';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/cleaner/billing/actions' });

// Types for billing data
export interface BillingSubscription {
  planName: string;
  planTier: 'free' | 'basic' | 'pro';
  price: number;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
  nextBillingDate?: string;
  cancelAt?: string;
}

export interface LeadCreditsData {
  used: number;
  total: number;
  isUnlimited: boolean;
  resetDate: string;
  recentUsage: number[];
}

export interface PaymentMethodData {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}

export interface InvoiceItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  invoiceUrl?: string;
  invoicePdf?: string;
}

export interface BillingData {
  subscription: BillingSubscription;
  leadCredits: LeadCreditsData;
  paymentMethod: PaymentMethodData | null;
  invoices: InvoiceItem[];
}

// Map tier names for display
const tierDisplayNames: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Professional',
  enterprise: 'Enterprise',
};

const tierPrices: Record<string, number> = {
  free: 0,
  basic: 79,
  pro: 199,
  enterprise: 149,
};

const planCredits: Record<string, number> = {
  free: 5,
  basic: -1, // unlimited
  pro: -1,   // unlimited
  enterprise: -1, // unlimited
};

/**
 * Get complete billing data for the current cleaner
 */
export async function getBillingData(): Promise<{ data: BillingData | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Authentication required' };
    }

    // Get cleaner profile with subscription info
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select(`
        id,
        subscription_tier,
        subscription_expires_at,
        stripe_customer_id,
        stripe_subscription_id,
        lead_credits_used,
        lead_credits_reset_at
      `)
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return { data: null, error: 'Cleaner profile not found' };
    }

    // Get Stripe subscription details if active
    let stripeSubscription = null;
    let paymentMethod: PaymentMethodData | null = null;

    if (cleaner.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        stripeSubscription = await stripe.subscriptions.retrieve(
          cleaner.stripe_subscription_id,
          { expand: ['default_payment_method'] }
        );

        // Extract payment method details
        if (stripeSubscription.default_payment_method &&
            typeof stripeSubscription.default_payment_method !== 'string') {
          const pm = stripeSubscription.default_payment_method;
          if (pm.card) {
            paymentMethod = {
              id: pm.id,
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
              isDefault: true,
            };
          }
        }
      } catch (stripeError) {
        logger.error('Error fetching Stripe subscription', { function: 'getBillingData' }, stripeError);
      }
    }

    // Get billing history (invoices) from Stripe
    let stripeInvoices: InvoiceData[] = [];
    if (cleaner.stripe_customer_id) {
      try {
        const { invoices: fetchedInvoices } = await getCustomerInvoices(
          cleaner.stripe_customer_id,
          { limit: 10 }
        );
        stripeInvoices = fetchedInvoices;
      } catch (invoiceError) {
        logger.error('Error fetching Stripe invoices', { function: 'getBillingData' }, invoiceError);
      }
    }

    // Get lead credits from cleaner record
    const usedCredits = cleaner.lead_credits_used || 0;
    const totalCredits = planCredits[cleaner.subscription_tier] || 5;
    const isUnlimited = totalCredits === -1;

    // Calculate reset date
    let resetDate = new Date();
    if (cleaner.lead_credits_reset_at) {
      resetDate = new Date(cleaner.lead_credits_reset_at);
    } else {
      // Default to first of next month
      resetDate = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
    }

    // Get recent usage for sparkline (last 7 days)
    const recentUsage: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { count } = await supabase
        .from('lead_matches')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', cleaner.id)
        .eq('lead_credit_deducted', true)
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());

      recentUsage.push(count || 0);
    }

    // Determine subscription status
    let status: BillingSubscription['status'] = 'none';
    if (stripeSubscription) {
      if (stripeSubscription.status === 'active') {
        status = stripeSubscription.cancel_at ? 'canceled' : 'active';
      } else if (stripeSubscription.status === 'past_due') {
        status = 'past_due';
      } else if (stripeSubscription.status === 'trialing') {
        status = 'trialing';
      }
    } else if (cleaner.subscription_tier !== 'free') {
      status = 'active';
    }

    // Format invoices from Stripe
    const invoices: InvoiceItem[] = stripeInvoices.map((invoice: InvoiceData) => ({
      id: invoice.id,
      date: invoice.date,
      description: invoice.description || 'Subscription payment',
      amount: invoice.amount,
      status: invoice.status as InvoiceItem['status'],
      invoiceUrl: invoice.invoiceUrl || undefined,
      invoicePdf: invoice.invoicePdf || undefined,
    }));

    const stripeSub = stripeSubscription as { current_period_end?: number; cancel_at?: number | null } | null;

    return {
      data: {
        subscription: {
          planName: tierDisplayNames[cleaner.subscription_tier] || 'Free',
          planTier: cleaner.subscription_tier as 'free' | 'basic' | 'pro',
          price: tierPrices[cleaner.subscription_tier] || 0,
          status,
          nextBillingDate: stripeSub?.current_period_end
            ? new Date(stripeSub.current_period_end * 1000).toISOString()
            : cleaner.subscription_expires_at || undefined,
          cancelAt: stripeSub?.cancel_at
            ? new Date(stripeSub.cancel_at * 1000).toISOString()
            : undefined,
        },
        leadCredits: {
          used: usedCredits,
          total: isUnlimited ? 0 : totalCredits,
          isUnlimited,
          resetDate: resetDate.toISOString(),
          recentUsage,
        },
        paymentMethod,
        invoices,
      },
      error: null,
    };
  } catch (error) {
    logger.error('getBillingData error', { function: 'getBillingData' }, error);
    return { data: null, error: 'Failed to fetch billing data' };
  }
}

/**
 * Get invoice history for the current cleaner
 */
export async function getInvoices(options?: {
  limit?: number;
  startingAfter?: string;
}): Promise<{ invoices: InvoiceItem[]; hasMore: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { invoices: [], hasMore: false, error: 'Authentication required' };
    }

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!cleaner?.stripe_customer_id) {
      return { invoices: [], hasMore: false, error: null };
    }

    const { invoices, hasMore } = await getCustomerInvoices(
      cleaner.stripe_customer_id,
      {
        limit: options?.limit || 20,
        startingAfter: options?.startingAfter,
      }
    );

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        date: inv.date,
        description: inv.description || 'Subscription payment',
        amount: inv.amount,
        status: inv.status as InvoiceItem['status'],
        invoiceUrl: inv.invoiceUrl || undefined,
        invoicePdf: inv.invoicePdf || undefined,
      })),
      hasMore,
      error: null,
    };
  } catch (error) {
    logger.error('getInvoices error', { function: 'getInvoices' }, error);
    return { invoices: [], hasMore: false, error: 'Failed to fetch invoices' };
  }
}

/**
 * Cancel the current subscription (at period end)
 */
export async function cancelSubscription(): Promise<{ success: boolean; cancelAt?: string; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id, stripe_subscription_id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (!cleaner) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    if (!cleaner.stripe_subscription_id) {
      return { success: false, error: 'No active subscription to cancel' };
    }

    if (cleaner.subscription_tier === 'free') {
      return { success: false, error: 'Free plan cannot be canceled' };
    }

    const stripe = getStripe();

    // Cancel at period end (not immediately)
    const subscription = await stripe.subscriptions.update(
      cleaner.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    // Update subscription record in database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        status: 'active', // Still active until period end
      })
      .eq('stripe_subscription_id', cleaner.stripe_subscription_id);

    return {
      success: true,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : undefined,
      error: null,
    };
  } catch (error) {
    logger.error('cancelSubscription error', { function: 'cancelSubscription' }, error);
    return { success: false, error: 'Failed to cancel subscription' };
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: cleaner } = await supabase
      .from('cleaners')
      .select('id, stripe_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (!cleaner?.stripe_subscription_id) {
      return { success: false, error: 'No subscription to reactivate' };
    }

    const stripe = getStripe();

    // Remove the cancel_at_period_end flag
    await stripe.subscriptions.update(
      cleaner.stripe_subscription_id,
      { cancel_at_period_end: false }
    );

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({ cancel_at: null })
      .eq('stripe_subscription_id', cleaner.stripe_subscription_id);

    return { success: true, error: null };
  } catch (error) {
    logger.error('reactivateSubscription error', { function: 'reactivateSubscription' }, error);
    return { success: false, error: 'Failed to reactivate subscription' };
  }
}
