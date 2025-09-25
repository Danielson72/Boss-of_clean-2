import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const TIER_LIMITS = {
  free: 1,
  basic: 5,
  pro: 15,
  enterprise: -1 // unlimited
} as const;

const TIER_NAMES = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise'
} as const;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's current tier
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Failed to fetch user tier:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription tier' },
        { status: 500 }
      );
    }

    const currentTier = userData.subscription_tier || 'free';
    const isExpired = userData.subscription_expires_at &&
                     new Date(userData.subscription_expires_at) < new Date();

    // If subscription is expired, default to free
    const activeTier = isExpired ? 'free' : currentTier;

    // Count confirmed bookings in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', user.id)
      .eq('payment_status', 'paid')
      .in('status', ['confirmed', 'completed', 'in_progress'])
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (bookingError) {
      console.error('Failed to count bookings:', bookingError);
      return NextResponse.json(
        { error: 'Failed to count bookings' },
        { status: 500 }
      );
    }

    const bookingCount = bookings?.length || 0;
    const tierLimit = TIER_LIMITS[activeTier as keyof typeof TIER_LIMITS];
    const isUnlimited = tierLimit === -1;
    const remainingBookings = isUnlimited ? -1 : Math.max(0, tierLimit - bookingCount);
    const isAtLimit = !isUnlimited && bookingCount >= tierLimit;

    return NextResponse.json({
      tier: activeTier,
      tierName: TIER_NAMES[activeTier as keyof typeof TIER_NAMES],
      limit: tierLimit,
      used: bookingCount,
      remaining: remainingBookings,
      isUnlimited,
      isAtLimit,
      isExpired,
      expiresAt: userData.subscription_expires_at,
      periodStart: thirtyDaysAgo.toISOString(),
      periodEnd: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tier API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tier information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tier, expiresAt } = await request.json();

    // Validate tier
    if (!Object.keys(TIER_LIMITS).includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Update user's subscription tier
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update subscription tier:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription tier' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tier,
      tierName: TIER_NAMES[tier as keyof typeof TIER_NAMES],
      expiresAt,
      message: 'Subscription tier updated successfully'
    });

  } catch (error) {
    console.error('Tier update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update tier',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}