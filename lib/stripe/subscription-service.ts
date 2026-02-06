import { stripe, PLAN_DETAILS, type SubscriptionTier } from './config';
import { createClient } from '@/lib/supabase/server';
import { processDunningEvent, resetDunningState } from '@/lib/stripe/dunning';
import { createLogger } from '../utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'lib/stripe/subscription-service' });

export class SubscriptionService {
  private getSupabase() {
    return createClient();
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
    const { data: cleaner } = await this.getSupabase()
      .from('cleaners')
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
    await this.getSupabase()
      .from('cleaners')
      .update({ stripe_customer_id: customer.id })
      .eq('id', cleanerId);

    return customer;
  }

  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    // Use bracket notation for properties that may not be in strict types
    const sub = subscription as Stripe.Subscription & {
      current_period_start: number;
      current_period_end: number;
    };
    const { customer, id, status, current_period_start, current_period_end, metadata } = sub;
    const cleanerId = metadata.cleaner_id;
    const tier = metadata.tier as SubscriptionTier;

    if (!cleanerId || !tier) {
      logger.error('Missing cleaner_id or tier in subscription metadata');
      return;
    }

    const tierConfig = PLAN_DETAILS[tier];
    const periodStart = new Date(current_period_start * 1000).toISOString();
    const periodEnd = new Date(current_period_end * 1000).toISOString();

    try {
      // Insert subscription record
      await this.getSupabase().from('subscriptions').insert({
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

      // Update cleaner subscription info and billing dates
      await this.getSupabase()
        .from('cleaners')
        .update({
          subscription_tier: tier,
          subscription_expires_at: periodEnd,
          stripe_subscription_id: id,
          next_billing_date: periodEnd,
          payment_failed_count: 0, // Reset on new subscription
        })
        .eq('id', cleanerId);

      logger.info(`Subscription created for cleaner ${cleanerId}: ${tier}`);
    } catch (error) {
      logger.error('Error handling subscription created:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = subscription as Stripe.Subscription & {
      current_period_end: number;
    };
    const { id, status, current_period_end, cancel_at } = sub;
    const periodEnd = new Date(current_period_end * 1000).toISOString();

    try {
      // Update subscription record
      await this.getSupabase()
        .from('subscriptions')
        .update({
          status,
          current_period_end: periodEnd,
          cancel_at: cancel_at ? new Date(cancel_at * 1000).toISOString() : null,
        })
        .eq('stripe_subscription_id', id);

      // Update cleaner subscription expiry and next billing date
      await this.getSupabase()
        .from('cleaners')
        .update({
          subscription_expires_at: periodEnd,
          next_billing_date: periodEnd,
        })
        .eq('stripe_subscription_id', id);

      logger.info(`Subscription updated: ${id}`);
    } catch (error) {
      logger.error('Error handling subscription updated:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { id } = subscription;

    try {
      // Update cleaner to free tier and clear billing dates
      await this.getSupabase()
        .from('cleaners')
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          stripe_subscription_id: null,
          next_billing_date: null,
        })
        .eq('stripe_subscription_id', id);

      // Update subscription status
      await this.getSupabase()
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', id);

      logger.info(`Subscription canceled: ${id}`);
    } catch (error) {
      logger.error('Error handling subscription deleted:', {}, error);
      throw error; // Re-throw for retry logic
    }
  }

  async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    // Extended type for invoice properties that may not be in strict types
    const inv = invoice as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      payment_intent?: string | { id: string } | null;
    };
    const { subscription, amount_paid, currency } = inv;

    if (!subscription) {
      logger.debug('No subscription associated with invoice, skipping');
      return;
    }

    const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;

    try {
      // Record successful payment
      const { data: subscriptionData } = await this.getSupabase()
        .from('subscriptions')
        .select('cleaner_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (subscriptionData) {
        const paymentIntentId = typeof inv.payment_intent === 'string'
          ? inv.payment_intent
          : inv.payment_intent?.id || null;

        // Record payment
        await this.getSupabase().from('payments').insert({
          cleaner_id: subscriptionData.cleaner_id,
          stripe_payment_intent_id: paymentIntentId,
          amount: (amount_paid || 0) / 100, // Convert cents to dollars
          currency: currency || 'usd',
          status: 'succeeded',
          description: 'Monthly subscription payment',
          metadata: { invoice_id: invoice.id },
          paid_at: new Date().toISOString(),
        });

        // Update last payment date, reset failed count, and reset lead credits
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);

        await this.getSupabase()
          .from('cleaners')
          .update({
            last_payment_date: new Date().toISOString(),
            payment_failed_count: 0,
            lead_credits_used: 0,
            lead_credits_reset_at: nextMonth.toISOString(),
          })
          .eq('id', subscriptionData.cleaner_id);

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
    // Extended type for invoice properties that may not be in strict types
    const inv = invoice as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      payment_intent?: string | { id: string } | null;
    };
    const { subscription } = inv;

    if (!subscription) {
      logger.debug('No subscription associated with failed invoice, skipping');
      return;
    }

    const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;

    try {
      // Get cleaner ID from subscription
      const { data: subscriptionData } = await this.getSupabase()
        .from('subscriptions')
        .select('cleaner_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (subscriptionData) {
        // Increment failed payment count using RPC
        await this.getSupabase().rpc('increment_payment_failed_count', {
          p_cleaner_id: subscriptionData.cleaner_id,
        });

        const paymentIntentId = typeof inv.payment_intent === 'string'
          ? inv.payment_intent
          : inv.payment_intent?.id || null;

        // Record failed payment
        await this.getSupabase().from('payments').insert({
          cleaner_id: subscriptionData.cleaner_id,
          stripe_payment_intent_id: paymentIntentId,
          amount: (invoice.amount_due || 0) / 100,
          currency: invoice.currency || 'usd',
          status: 'failed',
          description: 'Failed subscription payment',
          metadata: { invoice_id: invoice.id },
          failed_at: new Date().toISOString(),
        });
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
      const { data: cleaner } = await this.getSupabase()
        .from('cleaners')
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
      const { data } = await this.getSupabase()
        .from('subscriptions')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .eq('status', 'active')
        .single();

      return data;
    } catch (error) {
      logger.error('Error getting subscription details:', {}, error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();