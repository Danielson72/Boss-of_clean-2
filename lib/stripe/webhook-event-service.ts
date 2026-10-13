import { randomUUID } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '../utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'lib/stripe/webhook-event-service' });

export interface WebhookEventRecord {
  is_new: boolean;
  claim_token: string | null;
  event_status: 'pending' | 'processing' | 'processed' | 'failed';
}

export class WebhookEventService {
  private async getSupabase() {
    // Webhooks have no user session; the RPC helpers require service_role
    // after the RPC EXECUTE lockdown migration (PR #73).
    return createServiceRoleClient();
  }

  /**
   * Record a webhook event and check for idempotency
   * Returns { is_new: true } if this is a new event that should be processed
   * Returns { is_new: false } if the event was already processed/is processing
   */
  async recordEvent(event: Stripe.Event): Promise<WebhookEventRecord> {
    const supabase = await this.getSupabase();

    // Extract related IDs from event data for easier querying
    // Use unknown cast to safely access properties that may vary by event type
    const eventData = event.data.object as unknown as Record<string, unknown>;
    const customerId = (eventData.customer as string) || null;
    const subscriptionId =
      (eventData.subscription as string) ||
      (eventData.id as string) ||
      null;
    const invoiceId = event.type.startsWith('invoice.')
      ? (eventData.id as string)
      : null;

    const { data, error } = await supabase.rpc('claim_stripe_webhook_event', {
      p_claim_token: randomUUID(),
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown as Record<string, unknown>,
      p_customer_id: customerId,
      p_subscription_id: subscriptionId,
      p_invoice_id: invoiceId,
    });

    if (error) {
      logger.error('Error recording webhook event:', {}, error);
      // Money events must never run without a durable idempotency claim.
      throw new Error(`Could not claim Stripe webhook event ${event.id}: ${error.message}`);
    }

    const result = data?.[0];
    if (!result || typeof result.is_new !== 'boolean' ||
        !['processing', 'processed', 'failed', 'pending'].includes(result.event_status) ||
        (result.is_new && (result.event_status !== 'processing' ||
          typeof result.claim_token !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.claim_token)))) {
      throw new Error(`Stripe webhook claim returned no result for ${event.id}`);
    }
    return result as WebhookEventRecord;
  }

  /**
   * Mark event as successfully processed
   */
  async markProcessed(eventId: string, claimToken: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase.rpc('finish_stripe_webhook_event', {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_error_message: null,
    });

    if (error) {
      logger.error('Error marking webhook as processed:', {}, error);
      throw new Error(`Could not mark Stripe webhook event ${eventId} processed: ${error.message}`);
    }
  }

  /**
   * Mark event as failed with error message
   */
  async markFailed(eventId: string, claimToken: string, errorMessage: string): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase.rpc('finish_stripe_webhook_event', {
      p_event_id: eventId,
      p_claim_token: claimToken,
      p_error_message: errorMessage,
    });

    if (error) {
      logger.error('Error marking webhook as failed:', {}, error);
      throw new Error(`Could not mark Stripe webhook event ${eventId} failed: ${error.message}`);
    }
  }

  /**
   * Check if an event has already been processed
   */
  async isProcessed(eventId: string): Promise<boolean> {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase.rpc('is_webhook_processed', {
      p_event_id: eventId,
    });

    if (error) {
      logger.error('Error checking webhook processed status:', {}, error);
      return false;
    }

    return !!data;
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string) {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      logger.error('Error fetching webhook event:', {}, error);
      return null;
    }

    return data;
  }

  /**
   * Get recent failed events for monitoring
   */
  async getFailedEvents(limit = 50) {
    const supabase = await this.getSupabase();

    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Error fetching failed webhook events:', {}, error);
      return [];
    }

    return data;
  }
}

export const webhookEventService = new WebhookEventService();
