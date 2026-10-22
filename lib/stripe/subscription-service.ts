import { stripe, PLAN_DETAILS, VENTURE_KEY, VENTURE_BOC, type SubscriptionTier } from './config';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { processDunningEvent, resetDunningState } from '@/lib/stripe/dunning';
import { sendAdminOpsAlert } from '@/lib/email/lead-unlock';
import { createLogger } from '../utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'lib/stripe/subscription-service' });

export class SubscriptionService {
  private async getSupabase() {
    // Webhook handlers run with no user session — the cookie/anon client is
    // blocked by RLS on subscriptions/payments/pros writes, so rows silently
    // never land. Service role matches the lead-unlock pattern in
    // app/api/webhooks/stripe/route.ts.
    return createServiceRoleClient();
  }

  // Basil (2025+ Stripe API): invoice.subscription was removed; the link now
  // lives at invoice.parent.subscription_details.subscription. Keep the legacy
  // top-level field as a fallback for older payloads.
  private resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    const inv = invoice as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      parent?: {
        subscription_details?: { subscription?: string | { id: string } | null } | null;
      } | null;
    };
    const sub = inv.parent?.subscription_details?.subscription ?? inv.subscription;
    if (!sub) return null;
    return typeof sub === 'string' ? sub : sub.id;
  }

  /**
   * Read the venture stamp off the subscription an invoice belongs to.
   *
   * Basil exposes the subscription's metadata inline at
   * invoice.parent.subscription_details.metadata; when that is absent we
   * retrieve the Subscription itself. A retrieval failure resolves to null
   * rather than throwing — an unreadable stamp must not fail the webhook.
   *
   * Returns null when no stamp could be read, which callers treat as
   * "undetermined", NOT as "not ours". See handleInvoiceVentureCheck.
   */
  private async resolveInvoiceVenture(
    invoice: Stripe.Invoice,
    subscriptionId: string
  ): Promise<string | null> {
    const inv = invoice as Stripe.Invoice & {
      parent?: {
        subscription_details?: { metadata?: Record<string, string> | null } | null;
      } | null;
    };

    const inlineVenture = inv.parent?.subscription_details?.metadata?.[VENTURE_KEY];
    if (inlineVenture) {
      return inlineVenture;
    }

    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      return sub.metadata?.[VENTURE_KEY] ?? null;
    } catch (error) {
      logger.warn(
        `Could not retrieve subscription ${subscriptionId} to read its venture stamp`,
        { function: 'resolveInvoiceVenture', subscriptionId },
        error
      );
      return null;
    }
  }

  /**
   * Ownership decision for invoice events. Deliberately asymmetric:
   *
   *   'boc'        -> ours, process
   *   other value  -> a sibling brand on the shared account, skip
   *   absent/null  -> UNDETERMINED. Do not skip. Fall through to the
   *                   subscriptions lookup and let the database decide,
   *                   exactly as this behaved before the stamp existed.
   *
   * The absent case stays permissive because subscriptions created before
   * the venture writers shipped carry no stamp, and the writer that puts the
   * stamp on the Subscription object has not yet been seen on a completed
   * checkout — only on an open session. Rejecting on absence could lock out
   * our own traffic. Once a Boss of Clean subscription carrying the stamp has
   * been observed end to end, this can tighten to a strict equality check and
   * the null branch can start skipping too.
   *
   * Returns true when processing should continue.
   */
  private shouldProcessInvoice(
    venture: string | null,
    subscriptionId: string,
    fn: string
  ): boolean {
    if (venture === VENTURE_BOC) {
      return true;
    }
    if (venture === null || venture === undefined) {
      return true; // undetermined — let the database lookup decide
    }
    logger.info(
      `Ignoring invoice for subscription ${subscriptionId} from another venture`,
      { function: fn, subscriptionId, venture }
    );
    return false;
  }

  async createCheckoutSession(
    cleanerId: string,
    tier: SubscriptionTier,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string
  ) {
    if (tier === 'free') {
      throw new Error('Free tier does not require payment');
    }

    const tierConfig = PLAN_DETAILS[tier];
    
    try {
      // Create or retrieve Stripe customer
      const customer = await this.getOrCreateStripeCustomer(cleanerId, customerEmail);
      
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: tierConfig.priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          [VENTURE_KEY]: VENTURE_BOC,
          cleaner_id: cleanerId,
          tier: tier,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
        },
        subscription_data: {
          metadata: {
            [VENTURE_KEY]: VENTURE_BOC,
            cleaner_id: cleanerId,
            tier: tier,
          },
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (error) {
      logger.error('Error creating checkout session:', {}, error);
      throw new Error('Failed to create checkout session');
    }
  }

  async getOrCreateStripeCustomer(cleanerId: string, email: string) {
    // Check if cleaner already has a Stripe customer ID
    const supabase = await this.getSupabase();
    const { data: cleaner } = await supabase
      .from('pros')
      .select('stripe_customer_id, business_name')
      .eq('id', cleanerId)
      .single();

    if (cleaner?.stripe_customer_id) {
      const customer = await stripe.customers.retrieve(cleaner.stripe_customer_id);
      // A deleted customer cannot be used; treat as if no customer exists
      if (customer.deleted) {
        // Continue to create a new customer
      } else {
        return customer;
      }
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: cleaner?.business_name || 'Business Owner',
      metadata: {
        cleaner_id: cleanerId,
      },
    });

    // Update cleaner with Stripe customer ID
    const { error: updateError } = await supabase
      .from('pros')
      .update({ stripe_customer_id: customer.id })
      .eq('id', cleanerId);
    if (updateError) {
      logger.error(`Failed to save stripe_customer_id for cleaner ${cleanerId}:`, {}, updateError);
    }

    return customer;
  }

  /**
   * Shared Stripe account: subscription events for our sibling brands on
   * acct_1TNEvGRxaMzY49UQ are delivered to this endpoint too. Returns false
   * (and logs) when the subscription was not stamped by us.
   */
  private isOwnSubscription(subscription: Stripe.Subscription, fn: string): boolean {
    const venture = subscription.metadata?.[VENTURE_KEY];
    if (venture === VENTURE_BOC) {
      return true;
    }
    logger.info(
      `Ignoring subscription ${subscription.id} from another venture`,
      { function: fn, subscriptionId: subscription.id, venture: venture ?? null }
    );
    return false;
  }

  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    if (!this.isOwnSubscription(subscription, 'handleSubscriptionCreated')) {
      return;
    }

    const { customer, id, status, metadata } = subscription;
    const cleanerId = metadata.cleaner_id;
    const tier = metadata.tier as SubscriptionTier;

    if (!cleanerId || !tier) {
      logger.warn(
        `Missing cleaner_id or tier in metadata for subscription ${id} — cannot record it`,
        { subscriptionId: id, metadata }
      );
      return;
    }

    try {
      const tierConfig = PLAN_DETAILS[tier];

      // Basil (2025+ Stripe API): current_period_start/end moved from the
      // subscription to each subscription item. Fall back to the legacy
      // top-level fields for older payloads.
      const item = subscription.items?.data?.[0] as
        | (Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number })
        | undefined;
      const legacy = subscription as Stripe.Subscription & {
        current_period_start?: number;
        current_period_end?: number;
      };
      const periodStartUnix = item?.current_period_start ?? legacy.current_period_start;
      const periodEndUnix = item?.current_period_end ?? legacy.current_period_end;
      if (!periodStartUnix || !periodEndUnix) {
        throw new Error(`Missing current_period_start/end on subscription ${id}`);
      }
      const periodStart = new Date(periodStartUnix * 1000).toISOString();
      const periodEnd = new Date(periodEndUnix * 1000).toISOString();

      const supabase = await this.getSupabase();
      // Insert subscription record
      const { error: insertError } = await supabase.from('subscriptions').insert({
        cleaner_id: cleanerId,
        stripe_subscription_id: id,
        stripe_customer_id: typeof customer === 'string' ? customer : customer?.id,
        tier,
        status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        monthly_price: tierConfig.price,
        features: tierConfig.features,
      });
      if (insertError) {
        throw new Error(`subscriptions insert failed for ${id}: ${insertError.message}`);
      }

      // Update cleaner subscription info and billing dates
      const { error: prosError } = await supabase
        .from('pros')
        .update({
          subscription_tier: tier,
          subscription_expires_at: periodEnd,
          stripe_subscription_id: id,
          next_billing_date: periodEnd,
          payment_failed_count: 0, // Reset on new subscription
        })
        .eq('id', cleanerId);
      if (prosError) {
        throw new Error(`pros update failed for subscription ${id}: ${prosError.message}`);
      }

      logger.info(`Subscription created for cleaner ${cleanerId}: ${tier}`);
    } catch (error) {
      logger.error('Error handling subscription created:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    if (!this.isOwnSubscription(subscription, 'handleSubscriptionUpdated')) {
      return;
    }

    const { id, status, cancel_at } = subscription;

    try {
      // Basil: period fields live on the subscription item (legacy fallback below).
      const item = subscription.items?.data?.[0] as
        | (Stripe.SubscriptionItem & { current_period_end?: number })
        | undefined;
      const legacy = subscription as Stripe.Subscription & { current_period_end?: number };
      const periodEndUnix = item?.current_period_end ?? legacy.current_period_end;
      if (!periodEndUnix) {
        throw new Error(`Missing current_period_end on subscription ${id}`);
      }
      const periodEnd = new Date(periodEndUnix * 1000).toISOString();

      const supabase = await this.getSupabase();
      // Update subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_end: periodEnd,
          cancel_at: cancel_at ? new Date(cancel_at * 1000).toISOString() : null,
        })
        .eq('stripe_subscription_id', id);
      if (subError) {
        throw new Error(`subscriptions update failed for ${id}: ${subError.message}`);
      }

      // Update cleaner subscription expiry and next billing date
      const { error: prosError } = await supabase
        .from('pros')
        .update({
          subscription_expires_at: periodEnd,
          next_billing_date: periodEnd,
        })
        .eq('stripe_subscription_id', id);
      if (prosError) {
        throw new Error(`pros update failed for subscription ${id}: ${prosError.message}`);
      }

      logger.info(`Subscription updated: ${id}`);
    } catch (error) {
      logger.error('Error handling subscription updated:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    if (!this.isOwnSubscription(subscription, 'handleSubscriptionDeleted')) {
      return;
    }

    const { id } = subscription;

    try {
      const supabase = await this.getSupabase();
      // Update cleaner to free tier and clear billing dates
      const { error: prosError } = await supabase
        .from('pros')
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          stripe_subscription_id: null,
          next_billing_date: null,
        })
        .eq('stripe_subscription_id', id);
      if (prosError) {
        throw new Error(`pros update failed for subscription ${id}: ${prosError.message}`);
      }

      // Update subscription status
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', id);
      if (subError) {
        throw new Error(`subscriptions update failed for ${id}: ${subError.message}`);
      }

      logger.info(`Subscription canceled: ${id}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  /**
   * Boss of Clean and AI Command Lab share Stripe account
   * acct_1TNEvGRxaMzY49UQ, and Stripe delivers account-wide events to every
   * endpoint registered on it. So invoices belonging to another brand's
   * subscription arrive here routinely. They have no row in our
   * `subscriptions` table, and that is expected traffic — not an error.
   * Ignore them quietly; do not throw, or Stripe retries a foreign invoice
   * against us for three days.
   */
  async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const inv = invoice as Stripe.Invoice & {
      payment_intent?: string | { id: string } | null;
    };
    const { amount_paid, currency } = inv;

    const subscriptionId = this.resolveInvoiceSubscriptionId(invoice);
    if (!subscriptionId) {
      logger.debug('No subscription associated with invoice, skipping');
      return;
    }

    const venture = await this.resolveInvoiceVenture(invoice, subscriptionId);
    if (!this.shouldProcessInvoice(venture, subscriptionId, 'handlePaymentSucceeded')) {
      return;
    }

    try {
      const supabase = await this.getSupabase();
      // Record successful payment
      // maybeSingle(): zero rows is a normal outcome here (another brand's
      // invoice, see the note above), so it returns null data with no error
      // instead of PGRST116. A genuine database fault still populates
      // lookupError and still throws.
      const { data: subscriptionData, error: lookupError } = await supabase
        .from('subscriptions')
        .select('cleaner_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      if (lookupError) {
        throw new Error(`subscriptions lookup failed for ${subscriptionId}: ${lookupError.message}`);
      }

      if (!subscriptionData) {
        if (venture === VENTURE_BOC) {
          // Stamped as ours, but we have no row for it. That is our own
          // subscriber going unrecorded — a real failure, not shared-account
          // noise. Surface it; the payment itself still stands in Stripe.
          logger.error(
            `Subscription ${subscriptionId} is stamped as ours but has no row in subscriptions — payment not recorded`,
            { function: 'handlePaymentSucceeded', subscriptionId, invoiceId: invoice.id }
          );
          // Fire-and-forget: alerting must never throw or block the 200.
          sendAdminOpsAlert({
            title: 'Paid subscription has no local record',
            summary:
              'An invoice was paid for a Boss of Clean subscription, but no matching row exists in the subscriptions table, so the payment was not recorded. The charge stands in Stripe and needs reconciling by hand.',
            details: [
              { label: 'Stripe subscription', value: subscriptionId },
              { label: 'Invoice', value: invoice.id },
              { label: 'Amount paid (cents)', value: String(amount_paid ?? '') },
              { label: 'Currency', value: currency ?? '' },
            ],
          }).catch((err) =>
            logger.error('Missing-subscription ops alert failed', { function: 'handlePaymentSucceeded' }, err)
          );
          return;
        }

        logger.info(
          `No Boss of Clean subscription matches ${subscriptionId} — invoice belongs to another brand on the shared Stripe account, ignoring`,
          { function: 'handlePaymentSucceeded', subscriptionId, invoiceId: invoice.id }
        );
        return;
      }

      {
        // Dedupe: invoice.paid and invoice.payment_succeeded both fire for the
        // same invoice on current API versions — only record it once.
        const { data: existingPayment, error: dedupeError } = await supabase
          .from('payments')
          .select('id')
          .eq('cleaner_id', subscriptionData.cleaner_id)
          .eq('status', 'succeeded')
          .contains('metadata', { invoice_id: invoice.id })
          .limit(1)
          .maybeSingle();
        if (dedupeError) {
          throw new Error(`payments dedupe lookup failed for ${subscriptionId}: ${dedupeError.message}`);
        }
        if (existingPayment) {
          logger.info(`Payment for invoice ${invoice.id} already recorded, skipping duplicate event`);
          return;
        }

        const paymentIntentId = typeof inv.payment_intent === 'string'
          ? inv.payment_intent
          : inv.payment_intent?.id || null;

        // Record payment
        const { error: paymentError } = await supabase.from('payments').insert({
          cleaner_id: subscriptionData.cleaner_id,
          stripe_payment_intent_id: paymentIntentId,
          amount: (amount_paid || 0) / 100, // Convert cents to dollars
          currency: currency || 'usd',
          status: 'succeeded',
          description: 'Monthly subscription payment',
          // DLD-566: hosted_invoice_url is the invoice-world receipt link —
          // stored under the same receipt_url key the Payment History reads.
          metadata: invoice.hosted_invoice_url
            ? { invoice_id: invoice.id, receipt_url: invoice.hosted_invoice_url }
            : { invoice_id: invoice.id },
          paid_at: new Date().toISOString(),
        });
        if (paymentError) {
          throw new Error(`payments insert failed for ${subscriptionId}: ${paymentError.message}`);
        }

        // Update last payment date, reset failed count, and reset monthly lead acceptance counter
        const { error: prosError } = await supabase
          .from('pros')
          .update({
            last_payment_date: new Date().toISOString(),
            payment_failed_count: 0,
            monthly_accepted_lead_count: 0,
          })
          .eq('id', subscriptionData.cleaner_id);
        if (prosError) {
          throw new Error(`pros update failed for ${subscriptionId}: ${prosError.message}`);
        }

        // Reset dunning state (grace period, subscription status)
        await resetDunningState(subscriptionData.cleaner_id);
      }

      logger.info(`Payment succeeded for subscription: ${subscriptionId}`);
    } catch (error) {
      logger.error('Error handling payment succeeded:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handlePaymentFailed(invoice: Stripe.Invoice) {
    const inv = invoice as Stripe.Invoice & {
      payment_intent?: string | { id: string } | null;
    };

    const subscriptionId = this.resolveInvoiceSubscriptionId(invoice);
    if (!subscriptionId) {
      logger.debug('No subscription associated with failed invoice, skipping');
      return;
    }

    const venture = await this.resolveInvoiceVenture(invoice, subscriptionId);
    if (!this.shouldProcessInvoice(venture, subscriptionId, 'handlePaymentFailed')) {
      return;
    }

    try {
      const supabase = await this.getSupabase();
      // Get cleaner ID from subscription
      // maybeSingle(): same shared-account reasoning as handlePaymentSucceeded
      // — a foreign brand's failed invoice has no row here and must not throw.
      // A genuine database fault still populates lookupError and still throws.
      const { data: subscriptionData, error: lookupError } = await supabase
        .from('subscriptions')
        .select('cleaner_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();
      if (lookupError) {
        throw new Error(`subscriptions lookup failed for ${subscriptionId}: ${lookupError.message}`);
      }

      if (!subscriptionData) {
        logger.info(
          `No Boss of Clean subscription matches ${subscriptionId} — failed invoice belongs to another brand on the shared Stripe account, ignoring`,
          { function: 'handlePaymentFailed', subscriptionId, invoiceId: invoice.id }
        );
        return;
      }

      {
        // Increment failed payment count using RPC
        const { error: rpcError } = await supabase.rpc('increment_payment_failed_count', {
          p_cleaner_id: subscriptionData.cleaner_id,
        });
        if (rpcError) {
          throw new Error(`increment_payment_failed_count failed for ${subscriptionId}: ${rpcError.message}`);
        }

        const paymentIntentId = typeof inv.payment_intent === 'string'
          ? inv.payment_intent
          : inv.payment_intent?.id || null;

        // Record failed payment
        const { error: paymentError } = await supabase.from('payments').insert({
          cleaner_id: subscriptionData.cleaner_id,
          stripe_payment_intent_id: paymentIntentId,
          amount: (invoice.amount_due || 0) / 100,
          currency: invoice.currency || 'usd',
          status: 'failed',
          description: 'Failed subscription payment',
          metadata: { invoice_id: invoice.id },
          failed_at: new Date().toISOString(),
        });
        if (paymentError) {
          throw new Error(`payments insert failed for ${subscriptionId}: ${paymentError.message}`);
        }
      }

      logger.info(`Payment failed for subscription: ${subscriptionId}`);

      // Process dunning: send emails, manage grace period, downgrade if needed
      if (subscriptionData && invoice.id) {
        await processDunningEvent(subscriptionData.cleaner_id, invoice.id);
      }
    } catch (error) {
      logger.error('Error handling payment failed:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async cancelSubscription(cleanerId: string) {
    try {
      const supabase = await this.getSupabase();
      const { data: cleaner } = await supabase
        .from('pros')
        .select('stripe_subscription_id')
        .eq('id', cleanerId)
        .single();

      if (!cleaner?.stripe_subscription_id) {
        throw new Error('No active subscription found');
      }

      await stripe.subscriptions.cancel(cleaner.stripe_subscription_id);

      return { success: true };
    } catch (error) {
      logger.error('Error canceling subscription:', {}, error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async getSubscriptionDetails(cleanerId: string) {
    try {
      const supabase = await this.getSupabase();
      // maybeSingle(): a pro with no active subscription is a normal state,
      // and this returns null for them either way — the error was already
      // discarded here. Switching stops generating a PGRST116 for it.
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .eq('status', 'active')
        .maybeSingle();

      return data;
    } catch (error) {
      logger.error('Error getting subscription details:', {}, error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();