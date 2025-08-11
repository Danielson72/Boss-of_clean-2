import { stripe, SUBSCRIPTION_TIERS, type SubscriptionTier } from './config';
import { createClient } from '@/lib/supabase/server';

export class SubscriptionService {
  private supabase = createClient();

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

    const tierConfig = SUBSCRIPTION_TIERS[tier];
    
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
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async getOrCreateStripeCustomer(cleanerId: string, email: string) {
    // Check if cleaner already has a Stripe customer ID
    const { data: cleaner } = await this.supabase
      .from('cleaners')
      .select('stripe_customer_id, business_name')
      .eq('id', cleanerId)
      .single();

    if (cleaner?.stripe_customer_id) {
      return await stripe.customers.retrieve(cleaner.stripe_customer_id) as any;
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
    await this.supabase
      .from('cleaners')
      .update({ stripe_customer_id: customer.id })
      .eq('id', cleanerId);

    return customer;
  }

  async handleSubscriptionCreated(subscription: any) {
    const { customer, id, status, current_period_start, current_period_end, metadata } = subscription;
    const cleanerId = metadata.cleaner_id;
    const tier = metadata.tier as SubscriptionTier;

    if (!cleanerId || !tier) {
      console.error('Missing cleaner_id or tier in subscription metadata');
      return;
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier];

    try {
      // Insert subscription record
      await this.supabase.from('subscriptions').insert({
        cleaner_id: cleanerId,
        stripe_subscription_id: id,
        stripe_customer_id: customer,
        tier,
        status,
        current_period_start: new Date(current_period_start * 1000).toISOString(),
        current_period_end: new Date(current_period_end * 1000).toISOString(),
        monthly_price: tierConfig.price,
        features: tierConfig.features,
      });

      // Update cleaner subscription info
      await this.supabase
        .from('cleaners')
        .update({
          subscription_tier: tier,
          subscription_expires_at: new Date(current_period_end * 1000).toISOString(),
          stripe_subscription_id: id,
        })
        .eq('id', cleanerId);

      console.log(`Subscription created for cleaner ${cleanerId}: ${tier}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(subscription: any) {
    const { id, status, current_period_end, cancel_at } = subscription;

    try {
      // Update subscription record
      await this.supabase
        .from('subscriptions')
        .update({
          status,
          current_period_end: new Date(current_period_end * 1000).toISOString(),
          cancel_at: cancel_at ? new Date(cancel_at * 1000).toISOString() : null,
        })
        .eq('stripe_subscription_id', id);

      // Update cleaner subscription expiry
      await this.supabase
        .from('cleaners')
        .update({
          subscription_expires_at: new Date(current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', id);

      console.log(`Subscription updated: ${id}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionDeleted(subscription: any) {
    const { id } = subscription;

    try {
      // Update cleaner to free tier
      await this.supabase
        .from('cleaners')
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', id);

      // Update subscription status
      await this.supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', id);

      console.log(`Subscription canceled: ${id}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  async handlePaymentSucceeded(invoice: any) {
    const { subscription, customer, amount_paid, currency } = invoice;
    
    try {
      // Record successful payment
      const { data: subscriptionData } = await this.supabase
        .from('subscriptions')
        .select('cleaner_id')
        .eq('stripe_subscription_id', subscription)
        .single();

      if (subscriptionData) {
        await this.supabase.from('payments').insert({
          cleaner_id: subscriptionData.cleaner_id,
          stripe_payment_intent_id: invoice.payment_intent,
          amount: amount_paid / 100, // Convert cents to dollars
          currency,
          status: 'succeeded',
          description: `Monthly subscription payment`,
          metadata: { invoice_id: invoice.id },
        });
      }

      console.log(`Payment succeeded for subscription: ${subscription}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  async handlePaymentFailed(invoice: any) {
    const { subscription } = invoice;
    
    try {
      // You might want to send notification emails here
      console.log(`Payment failed for subscription: ${subscription}`);
      
      // Optional: Update cleaner status or send notifications
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  async cancelSubscription(cleanerId: string) {
    try {
      const { data: cleaner } = await this.supabase
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
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async getSubscriptionDetails(cleanerId: string) {
    try {
      const { data } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('cleaner_id', cleanerId)
        .eq('status', 'active')
        .single();

      return data;
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();