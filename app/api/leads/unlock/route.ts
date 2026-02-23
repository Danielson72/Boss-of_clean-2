import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/config';
import { unlockLeadSchema } from '@/lib/validations/leads';
import { deriveFeeTier, FEE_TIER_CENTS } from '@/lib/types/lead-dto';
import type { FeeTier } from '@/lib/types/lead-dto';

// Fee tier → Stripe Price ID
function getPriceId(feeTier: FeeTier): string {
  const prices: Record<string, string> = {
    standard: process.env.STRIPE_LEAD_UNLOCK_STANDARD_PRICE_ID || '',
    deep_clean: process.env.STRIPE_LEAD_UNLOCK_DEEPCLEAN_PRICE_ID || '',
    specialty: process.env.STRIPE_LEAD_UNLOCK_SPECIALTY_PRICE_ID || '',
  };
  return prices[feeTier];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Zod validation
    const body = await request.json();
    const parsed = unlockLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    const { quote_request_id } = parsed.data;

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, subscription_tier, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Get quote request — must be marketplace lead (cleaner_id IS NULL) and pending
    const { data: quote, error: quoteError } = await supabase
      .from('quote_requests')
      .select('id, service_type, cleaner_id, status')
      .eq('id', quote_request_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote request not found' }, { status: 404 });
    }

    if (quote.cleaner_id !== null) {
      return NextResponse.json({ error: 'This is a direct request, not a marketplace lead' }, { status: 400 });
    }

    if (quote.status !== 'pending') {
      return NextResponse.json({ error: 'Lead is no longer available' }, { status: 409 });
    }

    // Verify pro covers this lead's zip via service_areas
    const { data: matchCheck } = await supabase.rpc('match_lead_pros', {
      p_quote_request_id: quote_request_id,
    });

    const isEligible = (matchCheck || []).some(
      (m: { cleaner_id: string }) => m.cleaner_id === cleaner.id
    );

    if (!isEligible) {
      return NextResponse.json({ error: 'You are not eligible for this lead (service area or approval)' }, { status: 403 });
    }

    // Race-safe competition cap check with SELECT ... FOR UPDATE
    // We use a raw SQL transaction to prevent double-unlock race conditions
    const { data: capCheck, error: capError } = await supabase.rpc('check_lead_unlock_cap', {
      p_quote_request_id: quote_request_id,
      p_cleaner_id: cleaner.id,
    });

    // If the RPC doesn't exist yet, fall back to client-side check
    let unlockCount = 0;
    let alreadyUnlocked = false;

    if (capError) {
      // Fallback: standard client-side check
      const { data: existing } = await supabase
        .from('lead_unlocks')
        .select('id, status')
        .eq('quote_request_id', quote_request_id)
        .eq('cleaner_id', cleaner.id)
        .maybeSingle();

      if (existing && ['paid', 'credited', 'pending'].includes(existing.status)) {
        alreadyUnlocked = true;
      }

      const { count } = await supabase
        .from('lead_unlocks')
        .select('id', { count: 'exact', head: true })
        .eq('quote_request_id', quote_request_id)
        .in('status', ['paid', 'credited']);

      unlockCount = count || 0;
    } else {
      // RPC returned { count, already_unlocked }
      const result = Array.isArray(capCheck) ? capCheck[0] : capCheck;
      unlockCount = result?.unlock_count ?? 0;
      alreadyUnlocked = result?.already_unlocked ?? false;
    }

    if (alreadyUnlocked) {
      return NextResponse.json({ error: 'Already unlocked or payment pending' }, { status: 409 });
    }

    if (unlockCount >= 3) {
      return NextResponse.json({ error: 'Competition cap reached (max 3 pros per lead)' }, { status: 409 });
    }

    const feeTier = deriveFeeTier(quote.service_type);
    const amountCents = FEE_TIER_CENTS[feeTier];

    // Check for included credits (pro_lead_credits for current billing period)
    const now = new Date().toISOString();
    const { data: proCredits } = await supabase
      .from('pro_lead_credits')
      .select('id, credits_total, credits_used')
      .eq('cleaner_id', cleaner.id)
      .lte('billing_period_start', now)
      .gte('billing_period_end', now)
      .maybeSingle();

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

      if (unlockError) {
        // Competition cap trigger may reject the insert
        if (unlockError.message?.includes('competition_cap') || unlockError.code === '23514') {
          return NextResponse.json({ error: 'Competition cap reached (max 3 pros)' }, { status: 409 });
        }
        throw unlockError;
      }

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
      .maybeSingle();

    if (spendingCap) {
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
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: 'lead_unlock',
        quote_request_id,
        cleaner_id: cleaner.id,
        fee_tier: feeTier,
        amount_cents: String(amountCents),
      },
      success_url: `${origin}/dashboard/pro/leads?unlock=success`,
      cancel_url: `${origin}/dashboard/pro/leads?unlock=cancelled`,
    });

    // Insert pending unlock — DB trigger enforces cap at INSERT time
    const { error: insertError } = await supabase
      .from('lead_unlocks')
      .insert({
        quote_request_id,
        cleaner_id: cleaner.id,
        fee_tier: feeTier,
        amount_cents: amountCents,
        stripe_checkout_session_id: session.id,
        status: 'pending',
      });

    if (insertError) {
      // If DB trigger rejected it, the Stripe session exists but won't complete (no harm)
      if (insertError.message?.includes('competition_cap') || insertError.code === '23514') {
        return NextResponse.json({ error: 'Competition cap reached (max 3 pros)' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Unhandled error in /api/leads/unlock:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
