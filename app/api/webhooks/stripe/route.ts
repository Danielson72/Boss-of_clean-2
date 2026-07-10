import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/config';
import { subscriptionService } from '@/lib/stripe/subscription-service';
import { webhookEventService } from '@/lib/stripe/webhook-event-service';
import { handleDisputeCreated, handleDisputeClosed } from '@/lib/stripe/disputes';
import { sendLeadContactEmail, sendAdminSaleNotification } from '@/lib/email/lead-unlock';
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
      } else if (session.mode === 'payment' && session.metadata?.type === 'lead_unlock') {
        await processEventWithRetry(event, async () => {
          // A9 Slice 1 (DLD-517): this capture runs with no user session, so the
          // anon @/lib/supabase/server client is blocked by RLS on
          // lead_acceptances (no anon/authenticated UPDATE policy — only
          // "Service role manages unlocks" ALL). Use the service-role client so
          // the pending → captured flip actually persists. Scoped to this
          // lead-unlock branch only; the subscription path above is unchanged.
          const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
          const supabase = createServiceRoleClient();

          const { quote_request_id, cleaner_id, amount_cents, lead_acceptance_id } = session.metadata!;
          const amountCents = parseInt(amount_cents, 10);
          const paymentIntentId = session.payment_intent as string;

          logger.info('Lead unlock payment completed', {
            sessionId: session.id,
            quoteRequestId: quote_request_id,
            cleanerId: cleaner_id,
            amountCents,
          });

          // Update lead_acceptances: pending → captured.
          // NEW-03 (DLD-557): .select() the affected rows and treat 0 rows as a
          // hard failure. Keying on stripe_checkout_session_id alone previously
          // passed silently when no row matched (phantom capture: pro paid,
          // nothing flipped) — e.g. if the session id was replaced after this
          // checkout was created. Throwing sends it through the retry path and,
          // if still unmatched, surfaces as a webhook failure Stripe re-delivers.
          const nowIso = new Date().toISOString();
          const { data: capturedRows, error: unlockError } = await supabase
            .from('lead_acceptances')
            .update({
              status: 'captured',
              unlocked_at: nowIso,
              captured_at: nowIso,
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq('stripe_checkout_session_id', session.id)
            .select('id');

          if (unlockError) {
            logger.error('Failed to update lead_acceptances', { function: 'handleStripeEvent' }, unlockError);
            throw unlockError;
          }
          if (!capturedRows || capturedRows.length === 0) {
            logger.error('capture.zero_rows: no lead_acceptance matched this checkout session — phantom capture averted', {
              function: 'handleStripeEvent',
              sessionId: session.id,
              leadAcceptanceId: lead_acceptance_id ?? null,
              quoteRequestId: quote_request_id,
              cleanerId: cleaner_id,
            });
            throw new Error(`lead_acceptances capture matched 0 rows for session ${session.id}`);
          }

          // Read the quote once (service-role): supplies payments metadata
          // (city/service_type) and the customer's contact for the handoff email.
          // PII read — scoped narrowly by quote id.
          const { data: quote } = await supabase
            .from('quote_requests')
            .select('customer_id, city, service_type, customer:users!customer_id(full_name, email, phone)')
            .eq('id', quote_request_id)
            .single();

          const leadCity = quote?.city || '';
          const serviceType = quote?.service_type || '';

          // Record the lead-unlock payment, idempotently: skip if this payment
          // intent already wrote a row (Stripe may redeliver this event).
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .maybeSingle();

          // True only when THIS delivery inserted a fresh payments row — gates
          // the admin sale alert so Stripe redeliveries don't re-notify.
          let paymentRecorded = false;
          if (!existingPayment) {
            // DLD-566: capture the Stripe receipt link for Payment History.
            // Best-effort — a failed retrieve must never fail the capture flow.
            let receiptUrl: string | null = null;
            try {
              const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
                expand: ['latest_charge'],
              });
              const charge = pi.latest_charge as Stripe.Charge | null;
              receiptUrl = charge?.receipt_url ?? null;
            } catch (receiptErr) {
              logger.warn('Could not fetch receipt_url for lead unlock payment', {
                function: 'handleStripeEvent',
                paymentIntentId,
              }, receiptErr);
            }

            const paymentMetadata: Record<string, string> = {
              type: 'lead_unlock',
              quote_request_id,
              lead_city: leadCity,
              service_type: serviceType,
            };
            if (receiptUrl) {
              paymentMetadata.receipt_url = receiptUrl;
            }
            // Older checkout sessions may predate lead_acceptance_id in metadata.
            if (lead_acceptance_id) {
              paymentMetadata.lead_acceptance_id = lead_acceptance_id;
            }

            const { error: paymentError } = await supabase.from('payments').insert({
              cleaner_id,
              amount: amountCents / 100, // payments.amount is DOLLARS
              currency: 'usd',
              status: 'succeeded',
              description: 'Lead unlock',
              stripe_payment_intent_id: paymentIntentId,
              paid_at: nowIso,
              metadata: paymentMetadata,
            });

            if (paymentError) {
              // Concurrent retry: another delivery passed the pre-check and inserted
              // first. The DB unique index on stripe_payment_intent_id rejects this
              // one with 23505 — treat as already-processed and continue (no dup,
              // no throw; the contact email still fires below).
              if ((paymentError as { code?: string }).code === '23505') {
                logger.info('Lead unlock payment already recorded (unique violation), skipping insert', {
                  function: 'handleStripeEvent',
                  paymentIntentId,
                });
              } else {
                logger.error('Failed to record lead unlock payment', { function: 'handleStripeEvent' }, paymentError);
                throw paymentError;
              }
            } else {
              paymentRecorded = true;
            }
          }

          // Release the customer's contact to the pro. Look up the pro's
          // notification email: prefer business_email, fall back to users.email.
          const { data: pro } = await supabase
            .from('pros')
            .select('business_name, business_email, user_id')
            .eq('id', cleaner_id)
            .single();

          let proAccountEmail: string | null = null;
          if (pro?.user_id) {
            const { data: proUser } = await supabase
              .from('users')
              .select('email')
              .eq('id', pro.user_id)
              .single();
            proAccountEmail = proUser?.email ?? null;
          }

          const recipientEmail: string | null = pro?.business_email || proAccountEmail;
          // supabase infers the embedded read as an array; a many-to-one FK embed
          // returns a single object at runtime — normalize to be safe either way.
          const customerRaw = quote?.customer as unknown;
          const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
            | { full_name: string | null; email: string | null; phone: string | null }
            | null
            | undefined;

          if (recipientEmail && customer) {
            // Fire-and-forget: a mail failure must NEVER fail the webhook or the
            // payments write (mirrors the notification batch in api/messages/route.ts).
            Promise.allSettled([
              sendLeadContactEmail({
                recipientEmail,
                proName: pro?.business_name || 'there',
                customerName: customer.full_name || 'Customer',
                customerEmail: customer.email || '',
                customerPhone: customer.phone,
                serviceType,
                city: leadCity,
              }),
            ]).catch((err) =>
              logger.error('Lead unlock email batch error', { function: 'handleStripeEvent' }, err)
            );
          } else {
            logger.warn('Lead unlock: missing pro email or customer contact, skipping handoff email', {
              function: 'handleStripeEvent',
              sessionId: session.id,
              quoteRequestId: quote_request_id,
            });
          }

          // Internal "new sale" alert to admin@bossofclean.com. Only on a
          // freshly-recorded payment (not on Stripe redeliveries). Fire-and-
          // forget: a mail failure must NEVER fail the webhook or the payments
          // write (same contract as the handoff email above).
          if (paymentRecorded) {
            Promise.allSettled([
              sendAdminSaleNotification({
                proName: pro?.business_name || 'Unknown pro',
                customerName: customer?.full_name || 'Customer',
                serviceType,
                city: leadCity,
                amount: amountCents / 100, // dollars
                paymentIntentId,
              }),
            ]).catch((err) =>
              logger.error('Admin sale email batch error', { function: 'handleStripeEvent' }, err)
            );
          }

          logger.info('Lead unlock fully processed', {
            sessionId: session.id,
            quoteRequestId: quote_request_id,
          });
        });
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

    // Basil (2025+ Stripe API) emits invoice.paid; older versions emit
    // invoice.payment_succeeded — and both can fire for the same invoice.
    // handlePaymentSucceeded dedupes per invoice_id, so the double delivery
    // records one payment.
    case 'invoice.paid':
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

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      logger.info('Payment intent succeeded', { paymentIntentId: pi.id });
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedPi = event.data.object as Stripe.PaymentIntent;
      logger.info('Payment intent failed', { paymentIntentId: failedPi.id });
      break;
    }

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
