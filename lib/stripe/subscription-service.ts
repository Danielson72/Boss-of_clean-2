import { createClient } from '@/lib/supabase/server';
import { stripe, SUBSCRIPTION_TIERS } from './config';
import Stripe from 'stripe';

export class SubscriptionService {
  private supabase = createClient();

  async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    try {
      const cleanerId = subscription.metadata.cleaner_id;
      const tier = subscription.metadata.tier;

      if (!cleanerId || !tier) {
        console.error('Missing metadata in subscription:', subscription.id);
        return;
      }

      // Calculate subscription end date
      const subscriptionEnd = new Date((subscription as any).current_period_end * 1000);

      // Update cleaner subscription in database
      const { error } = await this.supabase
        .from('cleaners')
        .update({
          subscription_tier: tier,
          subscription_expires_at: subscriptionEnd.toISOString(),
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanerId);

      if (error) {
        console.error('Error updating cleaner subscription:', error);
        return;
      }

      // Log subscription creation
      await this.logSubscriptionEvent(cleanerId, 'subscription_created', {
        subscription_id: subscription.id,
        tier: tier,
        amount: subscription.items.data[0]?.price.unit_amount || 0,
      });

      console.log(`Subscription created for cleaner ${cleanerId}: ${tier} tier`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      const cleanerId = subscription.metadata.cleaner_id;

      if (!cleanerId) {
        console.error('Missing cleaner_id in subscription metadata:', subscription.id);
        return;
      }

      // Get the current tier from the subscription
      const priceId = subscription.items.data[0]?.price.id;
      let newTier = 'free';

      // Find matching tier by price ID
      for (const [tierName, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
        if (tierConfig.priceId === priceId) {
          newTier = tierName;
          break;
        }
      }

      // Calculate new subscription end date
      const subscriptionEnd = new Date((subscription as any).current_period_end * 1000);

      // Update cleaner subscription
      const { error } = await this.supabase
        .from('cleaners')
        .update({
          subscription_tier: newTier,
          subscription_expires_at: subscriptionEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanerId);

      if (error) {
        console.error('Error updating cleaner subscription:', error);
        return;
      }

      // Log subscription update
      await this.logSubscriptionEvent(cleanerId, 'subscription_updated', {
        subscription_id: subscription.id,
        new_tier: newTier,
        status: subscription.status,
      });

      console.log(`Subscription updated for cleaner ${cleanerId}: ${newTier} tier`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      const cleanerId = subscription.metadata.cleaner_id;

      if (!cleanerId) {
        console.error('Missing cleaner_id in subscription metadata:', subscription.id);
        return;
      }

      // Downgrade to free tier
      const { error } = await this.supabase
        .from('cleaners')
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanerId);

      if (error) {
        console.error('Error downgrading cleaner subscription:', error);
        return;
      }

      // Log subscription cancellation
      await this.logSubscriptionEvent(cleanerId, 'subscription_cancelled', {
        subscription_id: subscription.id,
        cancelled_at: new Date().toISOString(),
      });

      console.log(`Subscription cancelled for cleaner ${cleanerId}, downgraded to free`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    try {
      const subscriptionId = (invoice as any).subscription as string;
      
      if (!subscriptionId) {
        console.log('Invoice not related to subscription:', invoice.id);
        return;
      }

      // Get subscription to find cleaner
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const cleanerId = subscription.metadata.cleaner_id;

      if (!cleanerId) {
        console.error('Missing cleaner_id in subscription metadata:', subscriptionId);
        return;
      }

      // Record payment in database
      const { error } = await this.supabase
        .from('payments')
        .insert({
          cleaner_id: cleanerId,
          stripe_payment_intent_id: (invoice as any).payment_intent as string,
          stripe_invoice_id: invoice.id,
          amount: (invoice as any).amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          payment_date: new Date((invoice as any).status_transitions.paid_at! * 1000).toISOString(),
          metadata: {
            subscription_id: subscriptionId,
            invoice_number: invoice.number,
          },
        });

      if (error) {
        console.error('Error recording payment:', error);
        return;
      }

      // Update subscription expiry date
      const subscriptionEnd = new Date((invoice as any).period_end! * 1000);
      await this.supabase
        .from('cleaners')
        .update({
          subscription_expires_at: subscriptionEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanerId);

      console.log(`Payment succeeded for cleaner ${cleanerId}: $${(invoice as any).amount_paid / 100}`);
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  async handlePaymentFailed(invoice: Stripe.Invoice) {
    try {
      const subscriptionId = (invoice as any).subscription as string;
      
      if (!subscriptionId) {
        console.log('Invoice not related to subscription:', invoice.id);
        return;
      }

      // Get subscription to find cleaner
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const cleanerId = subscription.metadata.cleaner_id;

      if (!cleanerId) {
        console.error('Missing cleaner_id in subscription metadata:', subscriptionId);
        return;
      }

      // Record failed payment
      const { error } = await this.supabase
        .from('payments')
        .insert({
          cleaner_id: cleanerId,
          stripe_payment_intent_id: (invoice as any).payment_intent as string,
          stripe_invoice_id: invoice.id,
          amount: (invoice as any).amount_due,
          currency: invoice.currency,
          status: 'failed',
          payment_date: new Date().toISOString(),
          metadata: {
            subscription_id: subscriptionId,
            failure_reason: 'payment_failed',
          },
        });

      if (error) {
        console.error('Error recording failed payment:', error);
      }

      // Log payment failure
      await this.logSubscriptionEvent(cleanerId, 'payment_failed', {
        subscription_id: subscriptionId,
        invoice_id: invoice.id,
        amount: (invoice as any).amount_due,
      });

      console.log(`Payment failed for cleaner ${cleanerId}: $${(invoice as any).amount_due / 100}`);
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  private async logSubscriptionEvent(cleanerId: string, eventType: string, metadata: any) {
    try {
      await this.supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          user_id: null, // Will be linked via cleaner_id in metadata
          metadata: {
            cleaner_id: cleanerId,
            ...metadata,
          },
        });
    } catch (error) {
      console.error('Error logging subscription event:', error);
    }
  }

  // Helper method to get cleaner's current subscription status
  async getCleanerSubscription(cleanerId: string) {
    try {
      const { data: cleaner, error } = await this.supabase
        .from('cleaners')
        .select('subscription_tier, subscription_expires_at, stripe_subscription_id')
        .eq('id', cleanerId)
        .single();

      if (error || !cleaner) {
        return null;
      }

      // Check if subscription is expired
      const now = new Date();
      const expiresAt = cleaner.subscription_expires_at ? new Date(cleaner.subscription_expires_at) : null;
      const isExpired = expiresAt && expiresAt < now;

      return {
        ...cleaner,
        is_active: !isExpired && cleaner.subscription_tier !== 'free',
        is_expired: isExpired,
      };
    } catch (error) {
      console.error('Error getting cleaner subscription:', error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();