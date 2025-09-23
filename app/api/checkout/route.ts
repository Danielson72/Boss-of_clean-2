import { NextRequest, NextResponse } from 'next/server';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe/config';
import { getCurrentUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { tier, cleanerId } = await request.json();

    if (!tier || !cleanerId) {
      return NextResponse.json(
        { error: 'Missing required fields: tier, cleanerId' },
        { status: 400 }
      );
    }

    if (!SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Verify user owns this cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, business_name, stripe_customer_id')
      .eq('id', cleanerId)
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found or access denied' },
        { status: 403 }
      );
    }

    const subscriptionTier = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

    // Handle free tier (no Stripe needed)
    if (tier === 'free') {
      // Update cleaner to free tier
      const { error: updateError } = await supabase
        .from('cleaners')
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cleanerId);

      if (updateError) {
        console.error('Error updating cleaner subscription:', updateError);
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully switched to free tier',
        tier: 'free'
      });
    }

    let stripeCustomerId = cleaner.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.profile?.full_name || cleaner.business_name,
        metadata: {
          user_id: user.id,
          cleaner_id: cleanerId,
        },
      });

      stripeCustomerId = customer.id;

      // Update cleaner with Stripe customer ID
      await supabase
        .from('cleaners')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', cleanerId);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: subscriptionTier.priceId!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard/cleaner?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        cleaner_id: cleanerId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          cleaner_id: cleanerId,
          tier: tier,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id parameter' },
      { status: 400 }
    );
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer', 'subscription'],
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total,
        currency: session.currency,
        subscription_id: session.subscription,
        metadata: session.metadata,
      },
    });

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}