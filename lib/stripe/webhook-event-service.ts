import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export interface WebhookEventRecord {
  is_new: boolean;
  event_status: 'pending' | 'processing' | 'processed' | 'failed';
}

export class WebhookEventService {
  private getSupabase() {
    return createClient();
  }

  /**
   * Record a webhook event and check for idempotency
   * Returns { is_new: true } if this is a new event that should be processed
   * Returns { is_new: false } if the event was already processed/is processing
   */
  async recordEvent(event: Stripe.Event): Promise<WebhookEventRecord> {
    const supabase = this.getSupabase();

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

    const { data, error } = await supabase.rpc('record_webhook_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_payload: event as unknown as Record<string, unknown>,
      p_customer_id: customerId,
      p_subscription_id: subscriptionId,
      p_invoice_id: invoiceId,
    });

    if (error) {
      console.error('Error recording webhook event:', error);
      // If we can't record, assume it's new to avoid missing events
      return { is_new: true, event_status: 'processing' };
    }

    const result = data?.[0] || { is_new: true, event_status: 'processing' };
    return result as WebhookEventRecord;
  }

  /**
   * Mark event as successfully processed
   */
  async markProcessed(eventId: string): Promise<void> {
    const supabase = this.getSupabase();

    const { error } = await supabase.rpc('mark_webhook_processed', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error marking webhook as processed:', error);
    }
  }

  /**
   * Mark event as failed with error message
   */
  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    const supabase = this.getSupabase();

    const { error } = await supabase.rpc('mark_webhook_failed', {
      p_event_id: eventId,
      p_error_message: errorMessage,
    });

    if (error) {
      console.error('Error marking webhook as failed:', error);
    }
  }

  /**
   * Check if an event has already been processed
   */
  async isProcessed(eventId: string): Promise<boolean> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase.rpc('is_webhook_processed', {
      p_event_id: eventId,
    });

    if (error) {
      console.error('Error checking webhook processed status:', error);
      return false;
    }

    return !!data;
  }

  /**
   * Get event details by ID
   */
  async getEvent(eventId: string) {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('Error fetching webhook event:', error);
      return null;
    }

    return data;
  }

  /**
   * Get recent failed events for monitoring
   */
  async getFailedEvents(limit = 50) {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching failed webhook events:', error);
      return [];
    }

    return data;
  }
}

export const webhookEventService = new WebhookEventService();
