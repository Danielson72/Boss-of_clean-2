import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { STRIPE_PRICES, getSiteUrl, getStripe } from '@/lib/stripe/config';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/billing/upgrade/route' });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { planId } = body;

    // Validate plan
    const validPlans = ['basic', 'pro', 'enterprise'];
    if (!planId || !validPlans.includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan specified' },
        { status: 400 }
      );
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, stripe_customer_id, stripe_subscription_id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();

    // Map planId to price
    const priceMap: Record<string, string> = {
      basic: STRIPE_PRICES.basic,
      pro: STRIPE_PRICES.pro,
      enterprise: STRIPE_PRICES.enterprise,
    };

    const priceId = priceMap[planId];

    // If user already has a subscription, update it instead of creating new checkout
    if (cleaner.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          cleaner.stripe_subscription_id
        );

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Update existing subscription
          const updatedSubscription = await stripe.subscriptions.update(
            cleaner.stripe_subscription_id,
            {
              items: [
                {
                  id: subscription.items.data[0].id,
                  price: priceId,
                },
              ],
              proration_behavior: 'create_prorations',
              metadata: {
                cleaner_id: cleaner.id,
                tier: planId,
              },
            }
          );

          // Update cleaner tier in database
          await supabase
            .from('cleaners')
            .update({ subscription_tier: planId })
            .eq('id', cleaner.id);

          return NextResponse.json({
            success: true,
            type: 'updated',
            subscriptionId: updatedSubscription.id,
          });
        }
      } catch (subError) {
        logger.error('Error updating subscription, creating new checkout', { function: 'POST' }, subError);
      }
    }

    // Create new checkout session
    let customerId = cleaner.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
          cleaner_id: cleaner.id,
        },
      });
      customerId = customer.id;

      // Update cleaner with customer ID
      await supabase
        .from('cleaners')
        .update({ stripe_customer_id: customerId })
        .eq('id', cleaner.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard/cleaner/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/dashboard/cleaner/billing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: {
        user_id: user.id,
        cleaner_id: cleaner.id,
        plan: planId,
      },
      subscription_data: {
        metadata: {
          cleaner_id: cleaner.id,
          tier: planId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      type: 'checkout',
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    logger.error('Upgrade API error', { function: 'POST' }, error);
    return NextResponse.json(
      { error: 'Failed to process upgrade' },
      { status: 500 }
    );
  }
}
