import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/config';
import { subscriptionService } from '@/lib/stripe/subscription-service';
import { webhookEventService } from '@/lib/stripe/webhook-event-service';
import { handleDisputeCreated, handleDisputeClosed } from '@/lib/stripe/disputes';
import { createLogger } from '@/lib/utils/logger';
import type Stripe from 'stripe';

const logger = createLogger({ file: 'api/webhooks/stripe/route' });

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a Stripe event with retry logic
 */
async function processEventWithRetry(
  event: Stripe.Event,
  handler: () => Promise<void>
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await handler();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      logger.error(
        `Webhook handler attempt ${attempt + 1}/${MAX_RETRIES} failed`,
        { function: 'processEventWithRetry' },
        error
      );

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Route event to appropriate handler
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        logger.info('Subscription checkout completed', { sessionId: session.id });
        // Subscription will be created via customer.subscription.created event
      }
      break;
    }

    case 'customer.subscription.created':
      await processEventWithRetry(event, () =>
        subscriptionService.handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        )
      );
      break;

    case 'customer.subscription.updated':
      await processEventWithRetry(event, () =>
        subscriptionService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
      );
      break;

    case 'customer.subscription.deleted':
      await processEventWithRetry(event, () =>
        subscriptionService.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
      );
      break;

    case 'invoice.payment_succeeded':
      await processEventWithRetry(event, () =>
        subscriptionService.handlePaymentSucceeded(
          event.data.object as Stripe.Invoice
        )
      );
      break;

    case 'invoice.payment_failed':
      await processEventWithRetry(event, () =>
        subscriptionService.handlePaymentFailed(
          event.data.object as Stripe.Invoice
        )
      );
      break;

    case 'payment_intent.succeeded':
      logger.info('Payment intent succeeded', { paymentIntentId: (event.data.object as Stripe.PaymentIntent).id });
      break;

    case 'payment_intent.payment_failed':
      logger.info('Payment intent failed', { paymentIntentId: (event.data.object as Stripe.PaymentIntent).id });
      break;

    case 'charge.dispute.created':
      await processEventWithRetry(event, () =>
        handleDisputeCreated(event.data.object as Stripe.Dispute)
      );
      break;

    case 'charge.dispute.closed':
      await processEventWithRetry(event, () =>
        handleDisputeClosed(event.data.object as Stripe.Dispute)
      );
      break;

    default:
      logger.debug(`Unhandled event type: ${event.type}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check for required env vars at runtime
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET is required', { function: 'POST' });
      return NextResponse.json(
        { error: 'Webhook configuration missing' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      ) as Stripe.Event;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Webhook signature verification failed', { function: 'POST' }, error.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    logger.info('Processing Stripe webhook', { eventType: event.type, eventId: event.id });

    // Check idempotency - record event and check if already processed
    const eventRecord = await webhookEventService.recordEvent(event);

    if (!eventRecord.is_new) {
      // Event already processed or is being processed
      if (eventRecord.event_status === 'processed') {
        logger.info(`Event ${event.id} already processed, skipping`);
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (eventRecord.event_status === 'processing') {
        logger.info(`Event ${event.id} is being processed, skipping`);
        return NextResponse.json({ received: true, processing: true });
      }
    }

    // Process the event
    try {
      await handleStripeEvent(event);

      // Mark as successfully processed
      await webhookEventService.markProcessed(event.id);

      logger.info(`Successfully processed webhook: ${event.type} (${event.id})`);
      return NextResponse.json({ received: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Mark as failed with error
      await webhookEventService.markFailed(event.id, errorMessage);

      logger.error(`Failed to process webhook ${event.id}`, { function: 'POST' }, error);

      // Return 500 so Stripe will retry
      return NextResponse.json(
        { error: 'Webhook processing failed', details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error processing webhook', { function: 'POST' }, error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhooks (required for signature verification)
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
