import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/cleaner/billing/reactivate/route' });

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
        { error: 'No subscription to reactivate' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Get current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(
      cleaner.stripe_subscription_id
    );

    // Check if subscription is scheduled for cancellation
    if (!currentSubscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    // Reactivate by removing cancel_at_period_end
    const subscription = await stripe.subscriptions.update(
      cleaner.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    // Update subscription record in database
    await supabase
      .from('subscriptions')
      .update({
        cancel_at: null,
        status: 'active',
      })
      .eq('stripe_subscription_id', cleaner.stripe_subscription_id);

    const periodEnd = (subscription as any).current_period_end;
    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
      nextBillingDate: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    });
  } catch (error) {
    logger.error('Reactivate API error', { function: 'POST' }, error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
