import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';

// Service type → fee tier mapping
function getFeeTier(serviceType: string): 'standard' | 'deep_clean' | 'specialty' {
  const lower = serviceType.toLowerCase();
  if (['deep clean', 'deep_clean', 'move-in', 'move-out', 'move_in_out'].some(t => lower.includes(t))) {
    return 'deep_clean';
  }
  if (['commercial', 'specialty', 'industrial', 'post-construction'].some(t => lower.includes(t))) {
    return 'specialty';
  }
  return 'standard';
}

// Fee tier → Stripe Price ID
function getPriceId(feeTier: 'standard' | 'deep_clean' | 'specialty'): string {
  const prices: Record<string, string> = {
    standard: process.env.STRIPE_LEAD_UNLOCK_STANDARD_PRICE_ID || '',
    deep_clean: process.env.STRIPE_LEAD_UNLOCK_DEEPCLEAN_PRICE_ID || '',
    specialty: process.env.STRIPE_LEAD_UNLOCK_SPECIALTY_PRICE_ID || '',
  };
  return prices[feeTier];
}

// Fee tier → amount in cents
function getAmountCents(feeTier: 'standard' | 'deep_clean' | 'specialty'): number {
  const amounts: Record<string, number> = {
    standard: 1200,
    deep_clean: 1800,
    specialty: 2500,
  };
  return amounts[feeTier];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quote_request_id } = await request.json();
    if (!quote_request_id) {
      return NextResponse.json({ error: 'quote_request_id is required' }, { status: 400 });
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, subscription_tier, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Get quote request to determine service type
    const { data: quote, error: quoteError } = await supabase
      .from('quote_requests')
      .select('id, service_type')
      .eq('id', quote_request_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
    }

    // Check if already unlocked by this cleaner
    const { data: existing } = await supabase
      .from('lead_unlocks')
      .select('id, status')
      .eq('quote_request_id', quote_request_id)
      .eq('cleaner_id', cleaner.id)
      .single();

    if (existing) {
      if (existing.status === 'paid' || existing.status === 'credited') {
        return NextResponse.json({ error: 'Already unlocked' }, { status: 409 });
      }
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Unlock payment pending' }, { status: 409 });
      }
    }

    // Check competition cap (max 3 paid/credited unlocks)
    const { count: unlockCount } = await supabase
      .from('lead_unlocks')
      .select('id', { count: 'exact', head: true })
      .eq('quote_request_id', quote_request_id)
      .in('status', ['paid', 'credited']);

    if ((unlockCount || 0) >= 3) {
      return NextResponse.json({ error: 'Competition cap reached (max 3 pros)' }, { status: 409 });
    }

    const feeTier = getFeeTier(quote.service_type);
    const amountCents = getAmountCents(feeTier);

    // Check for included credits (pro_lead_credits for current billing period)
    const now = new Date().toISOString();
    const { data: proCredits } = await supabase
      .from('pro_lead_credits')
      .select('id, credits_total, credits_used')
      .eq('cleaner_id', cleaner.id)
      .lte('billing_period_start', now)
      .gte('billing_period_end', now)
      .single();

    if (proCredits && (proCredits.credits_total === -1 || proCredits.credits_used < proCredits.credits_total)) {
      // Use included credit — no payment needed
      const { data: unlock, error: unlockError } = await supabase
        .from('lead_unlocks')
        .insert({
          quote_request_id,
          cleaner_id: cleaner.id,
          fee_tier: feeTier,
          amount_cents: 0,
          status: 'credited',
          unlocked_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (unlockError) throw unlockError;

      // Increment credits used (unless unlimited)
      if (proCredits.credits_total !== -1) {
        await supabase
          .from('pro_lead_credits')
          .update({ credits_used: proCredits.credits_used + 1, updated_at: new Date().toISOString() })
          .eq('id', proCredits.id);
      }

      return NextResponse.json({ unlocked: true, unlock_id: unlock.id });
    }

    // Check spending cap
    const { data: spendingCap } = await supabase
      .from('pro_spending_caps')
      .select('weekly_cap_cents, current_week_spent_cents, week_started_at')
      .eq('cleaner_id', cleaner.id)
      .single();

    if (spendingCap) {
      // Reset if new week
      const weekStart = new Date(spendingCap.week_started_at);
      const daysSinceStart = (Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      const currentSpent = daysSinceStart >= 7 ? 0 : spendingCap.current_week_spent_cents;

      if (currentSpent + amountCents > spendingCap.weekly_cap_cents) {
        return NextResponse.json({
          error: 'Weekly spending cap reached',
          spent: currentSpent,
          cap: spendingCap.weekly_cap_cents,
        }, { status: 429 });
      }
    }

    // Create Stripe Checkout Session
    const priceId = getPriceId(feeTier);
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured for this tier' }, { status: 500 });
    }

    const stripe = getStripe();
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer: cleaner.stripe_customer_id || undefined,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      metadata: {
        type: 'lead_unlock',
        quote_request_id,
        cleaner_id: cleaner.id,
        fee_tier: feeTier,
        amount_cents: String(amountCents),
      },
      success_url: `${origin}/dashboard/cleaner/leads?unlock=success`,
      cancel_url: `${origin}/dashboard/cleaner/leads?unlock=cancelled`,
    });

    // Insert pending unlock record
    const { error: unlockError } = await supabase
      .from('lead_unlocks')
      .insert({
        quote_request_id,
        cleaner_id: cleaner.id,
        fee_tier: feeTier,
        amount_cents: amountCents,
        stripe_checkout_session_id: session.id,
        status: 'pending',
      });

    if (unlockError) throw unlockError;

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
