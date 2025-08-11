import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/config';
import { subscriptionService } from '@/lib/stripe/subscription-service';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('Processing Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.mode === 'subscription') {
          // Subscription checkout completed
          console.log('Subscription checkout completed:', session.id);
        }
        break;

      case 'customer.subscription.created':
        await subscriptionService.handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await subscriptionService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await subscriptionService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await subscriptionService.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await subscriptionService.handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhooks
export const runtime = 'nodejs';
export const preferredRegion = 'auto';