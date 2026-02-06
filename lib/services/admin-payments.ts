import { createClient } from '@/lib/supabase/server';

export interface RecentLeadClaim {
  id: string;
  cleanerName: string;
  cleanerTier: string;
  amount: number;
  status: string;
  leadCity: string;
  leadServiceType: string;
  createdAt: string;
}

export interface SubscriptionChange {
  id: string;
  cleanerName: string;
  previousTier: string;
  newTier: string;
  status: string;
  monthlyPrice: number;
  changedAt: string;
}

export interface RevenueSummary {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayLeadCharges: number;
  weekLeadCharges: number;
  monthLeadCharges: number;
  activeBasic: number;
  activePro: number;
  subscriptionMrr: number;
}

export interface PaymentMonitoringData {
  recentLeadClaims: RecentLeadClaim[];
  recentSubscriptionChanges: SubscriptionChange[];
  revenueSummary: RevenueSummary;
}

export async function getPaymentMonitoringData(): Promise<PaymentMonitoringData> {
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthStart = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Fetch data in parallel
  const [
    recentPaymentsResult,
    subscriptionsResult,
    todayPaymentsResult,
    weekPaymentsResult,
    monthPaymentsResult,
    activeSubsResult,
    recentWebhookEventsResult,
  ] = await Promise.all([
    // Recent lead fee payments (last 20)
    supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        description,
        metadata,
        created_at,
        cleaner:cleaners(
          business_name,
          subscription_tier
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20),

    // Recent subscription changes (from webhook events)
    supabase
      .from('subscriptions')
      .select(`
        id,
        tier,
        status,
        monthly_price,
        updated_at,
        cleaner:cleaners(
          business_name
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(15),

    // Today's payments
    supabase
      .from('payments')
      .select('amount, status')
      .gte('created_at', todayStart)
      .eq('status', 'succeeded'),

    // This week's payments
    supabase
      .from('payments')
      .select('amount, status')
      .gte('created_at', weekStart)
      .eq('status', 'succeeded'),

    // This month's payments
    supabase
      .from('payments')
      .select('amount, status')
      .gte('created_at', monthStart)
      .eq('status', 'succeeded'),

    // Active subscriptions for MRR
    supabase
      .from('subscriptions')
      .select('tier, monthly_price, status')
      .eq('status', 'active'),

    // Recent webhook events for subscription change tracking
    supabase
      .from('stripe_webhook_events')
      .select('event_type, payload, status, created_at')
      .in('event_type', [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
      ])
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  // Process recent lead claims
  type PaymentRow = {
    id: string;
    amount: number;
    status: string;
    description: string | null;
    metadata: Record<string, string> | null;
    created_at: string;
    cleaner: { business_name: string; subscription_tier: string } | { business_name: string; subscription_tier: string }[] | null;
  };

  const recentLeadClaims: RecentLeadClaim[] = (recentPaymentsResult.data || []).map((p: PaymentRow) => {
    const cleaner = Array.isArray(p.cleaner) ? p.cleaner[0] : p.cleaner;
    return {
      id: p.id,
      cleanerName: cleaner?.business_name || 'Unknown',
      cleanerTier: cleaner?.subscription_tier || 'free',
      amount: Number(p.amount) || 0,
      status: p.status || 'unknown',
      leadCity: p.metadata?.lead_city || '',
      leadServiceType: p.metadata?.service_type || p.description || '',
      createdAt: p.created_at,
    };
  });

  // Process subscription changes
  type SubRow = {
    id: string;
    tier: string;
    status: string;
    monthly_price: number | null;
    updated_at: string;
    cleaner: { business_name: string } | { business_name: string }[] | null;
  };

  const recentSubscriptionChanges: SubscriptionChange[] = (subscriptionsResult.data || []).map((s: SubRow) => {
    const cleaner = Array.isArray(s.cleaner) ? s.cleaner[0] : s.cleaner;
    return {
      id: s.id,
      cleanerName: cleaner?.business_name || 'Unknown',
      previousTier: 'free', // Would need audit log for actual previous tier
      newTier: s.tier,
      status: s.status,
      monthlyPrice: Number(s.monthly_price) || getTierPrice(s.tier),
      changedAt: s.updated_at,
    };
  });

  // Calculate revenue summaries
  const sumPayments = (payments: { amount: number }[] | null) =>
    (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  const todayRevenue = sumPayments(todayPaymentsResult.data);
  const weekRevenue = sumPayments(weekPaymentsResult.data);
  const monthRevenue = sumPayments(monthPaymentsResult.data);

  // Active subscription counts and MRR
  const activeSubs = activeSubsResult.data || [];
  const activeBasic = activeSubs.filter(s => s.tier === 'basic').length;
  const activePro = activeSubs.filter(s => s.tier === 'pro').length;
  const subscriptionMrr = activeSubs.reduce((sum, s) => {
    return sum + (Number(s.monthly_price) || getTierPrice(s.tier));
  }, 0);

  return {
    recentLeadClaims,
    recentSubscriptionChanges,
    revenueSummary: {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todayLeadCharges: (todayPaymentsResult.data || []).length,
      weekLeadCharges: (weekPaymentsResult.data || []).length,
      monthLeadCharges: (monthPaymentsResult.data || []).length,
      activeBasic,
      activePro,
      subscriptionMrr,
    },
  };
}

function getTierPrice(tier: string): number {
  switch (tier) {
    case 'basic': return 79;
    case 'pro': return 199;
    case 'enterprise': return 149;
    default: return 0;
  }
}
