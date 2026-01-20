import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';

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

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, stripe_subscription_id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    if (!cleaner.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    if (cleaner.subscription_tier === 'free') {
      return NextResponse.json(
        { error: 'Free plan cannot be canceled' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Cancel at period end (not immediately)
    const subscription = await stripe.subscriptions.update(
      cleaner.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update subscription record in database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        status: 'active', // Still active until period end
      })
      .eq('stripe_subscription_id', cleaner.stripe_subscription_id);

    return NextResponse.json({
      success: true,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (error) {
    console.error('Cancel API error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
