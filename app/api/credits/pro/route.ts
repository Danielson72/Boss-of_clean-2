import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get cleaner profile
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
    }

    // Get current billing period credits
    const now = new Date().toISOString();
    const { data: credits } = await supabase
      .from('pro_lead_credits')
      .select('credits_total, credits_used, billing_period_start, billing_period_end')
      .eq('cleaner_id', cleaner.id)
      .lte('billing_period_start', now)
      .gte('billing_period_end', now)
      .single();

    // Get spending cap
    const { data: spendingCap } = await supabase
      .from('pro_spending_caps')
      .select('weekly_cap_cents, current_week_spent_cents, week_started_at')
      .eq('cleaner_id', cleaner.id)
      .single();

    // Calculate weekly spend (reset if new week)
    let weeklySpent = 0;
    if (spendingCap) {
      const weekStart = new Date(spendingCap.week_started_at);
      const daysSinceStart = (Date.now() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      weeklySpent = daysSinceStart >= 7 ? 0 : spendingCap.current_week_spent_cents;
    }

    return NextResponse.json({
      tier: cleaner.subscription_tier || 'free',
      credits: credits ? {
        total: credits.credits_total,
        used: credits.credits_used,
        remaining: credits.credits_total === -1 ? -1 : Math.max(0, credits.credits_total - credits.credits_used),
        is_unlimited: credits.credits_total === -1,
        billing_period_end: credits.billing_period_end,
      } : null,
      spending_cap: spendingCap ? {
        weekly_cap_cents: spendingCap.weekly_cap_cents,
        current_week_spent_cents: weeklySpent,
        remaining_cents: Math.max(0, spendingCap.weekly_cap_cents - weeklySpent),
      } : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
