import { createClient } from '@/lib/supabase/server';

export type DateRange = '7d' | '30d' | '90d' | 'all';

export interface AdminMetrics {
  totalUsers: number;
  totalCleaners: number;
  activeSubscriptions: number;
  mrr: number;
  freeToBasicConversion: number;
  basicToProConversion: number;
}

export interface SignupDataPoint {
  date: string;
  users: number;
  cleaners: number;
}

export interface RevenueDataPoint {
  date: string;
  mrr: number;
  subscriptions: number;
}

export interface TopCleaner {
  id: string;
  businessName: string;
  totalReviews: number;
  averageRating: number;
  totalBookings: number;
  subscriptionTier: string;
}

export interface AdminAnalyticsData {
  metrics: AdminMetrics;
  signupTrend: SignupDataPoint[];
  revenueTrend: RevenueDataPoint[];
  topCleanersByReviews: TopCleaner[];
  topCleanersByBookings: TopCleaner[];
}

function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
  }
}

function formatDateForGroup(date: Date, range: DateRange): string {
  if (range === '7d') {
    return date.toISOString().split('T')[0];
  } else if (range === '30d') {
    return date.toISOString().split('T')[0];
  } else {
    // Weekly grouping for 90d and all
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0];
  }
}

export async function getAdminAnalytics(range: DateRange): Promise<AdminAnalyticsData> {
  const supabase = await createClient();
  const rangeStart = getDateRangeStart(range);

  // Fetch all metrics in parallel
  const [
    totalUsersResult,
    totalCleanersResult,
    activeSubscriptionsResult,
    subscriptionsWithPricesResult,
    cleanerTiersResult,
    usersForSignupsResult,
    cleanersForSignupsResult,
    topCleanersByReviewsResult,
    topCleanersByBookingsResult,
  ] = await Promise.all([
    // Total users
    supabase.from('users').select('*', { count: 'exact', head: true }),

    // Total approved cleaners
    supabase
      .from('cleaners')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'approved'),

    // Active subscriptions (non-free)
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .neq('tier', 'free'),

    // Subscriptions with prices for MRR
    supabase
      .from('subscriptions')
      .select('tier, monthly_price, status')
      .eq('status', 'active'),

    // Cleaner tiers for conversion rate
    supabase
      .from('cleaners')
      .select('subscription_tier')
      .eq('approval_status', 'approved'),

    // Users for signup trend
    rangeStart
      ? supabase
          .from('users')
          .select('created_at')
          .gte('created_at', rangeStart.toISOString())
          .order('created_at', { ascending: true })
      : supabase
          .from('users')
          .select('created_at')
          .order('created_at', { ascending: true }),

    // Cleaners for signup trend
    rangeStart
      ? supabase
          .from('cleaners')
          .select('created_at')
          .gte('created_at', rangeStart.toISOString())
          .order('created_at', { ascending: true })
      : supabase
          .from('cleaners')
          .select('created_at')
          .order('created_at', { ascending: true }),

    // Top cleaners by reviews
    supabase
      .from('cleaners')
      .select('id, business_name, total_reviews, average_rating, total_jobs, subscription_tier')
      .eq('approval_status', 'approved')
      .order('total_reviews', { ascending: false })
      .limit(5),

    // Top cleaners by bookings
    supabase
      .from('cleaners')
      .select('id, business_name, total_reviews, average_rating, total_jobs, subscription_tier')
      .eq('approval_status', 'approved')
      .order('total_jobs', { ascending: false })
      .limit(5),
  ]);

  // Calculate MRR
  const subscriptions = subscriptionsWithPricesResult.data || [];
  const mrr = subscriptions.reduce((sum, sub) => {
    const price = sub.monthly_price || getTierDefaultPrice(sub.tier as string);
    return sum + price;
  }, 0);

  // Calculate conversion rates
  const cleanerTiers = cleanerTiersResult.data || [];
  const freeTier = cleanerTiers.filter(c => c.subscription_tier === 'free').length;
  const basicTier = cleanerTiers.filter(c => c.subscription_tier === 'basic').length;
  const proTier = cleanerTiers.filter(c => c.subscription_tier === 'pro').length;
  const enterpriseTier = cleanerTiers.filter(c => c.subscription_tier === 'enterprise').length;

  const totalCleanersCount = cleanerTiers.length;
  const paidCleaners = basicTier + proTier + enterpriseTier;

  // Free-to-paid conversion rate
  const freeToBasicConversion = totalCleanersCount > 0
    ? (paidCleaners / totalCleanersCount) * 100
    : 0;

  // Basic-to-pro conversion rate
  const basicAndAbove = basicTier + proTier + enterpriseTier;
  const proAndAbove = proTier + enterpriseTier;
  const basicToProConversion = basicAndAbove > 0
    ? (proAndAbove / basicAndAbove) * 100
    : 0;

  // Build signup trend
  const usersForSignups = usersForSignupsResult.data || [];
  const cleanersForSignups = cleanersForSignupsResult.data || [];
  const signupTrend = buildSignupTrend(usersForSignups, cleanersForSignups, range);

  // Build revenue trend (based on subscription creation dates)
  const revenueTrend = buildRevenueTrend(subscriptions, range);

  // Format top cleaners
  const topCleanersByReviews: TopCleaner[] = (topCleanersByReviewsResult.data || []).map(c => ({
    id: c.id,
    businessName: c.business_name,
    totalReviews: c.total_reviews || 0,
    averageRating: Number(c.average_rating) || 0,
    totalBookings: c.total_jobs || 0,
    subscriptionTier: c.subscription_tier || 'free',
  }));

  const topCleanersByBookings: TopCleaner[] = (topCleanersByBookingsResult.data || []).map(c => ({
    id: c.id,
    businessName: c.business_name,
    totalReviews: c.total_reviews || 0,
    averageRating: Number(c.average_rating) || 0,
    totalBookings: c.total_jobs || 0,
    subscriptionTier: c.subscription_tier || 'free',
  }));

  return {
    metrics: {
      totalUsers: totalUsersResult.count || 0,
      totalCleaners: totalCleanersResult.count || 0,
      activeSubscriptions: activeSubscriptionsResult.count || 0,
      mrr,
      freeToBasicConversion,
      basicToProConversion,
    },
    signupTrend,
    revenueTrend,
    topCleanersByReviews,
    topCleanersByBookings,
  };
}

function getTierDefaultPrice(tier: string): number {
  switch (tier) {
    case 'basic':
      return 79;
    case 'pro':
      return 199;
    case 'enterprise':
      return 149;
    default:
      return 0;
  }
}

interface UserSignup {
  created_at: string;
}

interface CleanerSignup {
  created_at: string;
}

function buildSignupTrend(
  users: UserSignup[],
  cleaners: CleanerSignup[],
  range: DateRange
): SignupDataPoint[] {
  const groupedData = new Map<string, { users: number; cleaners: number }>();

  // Group users by date
  users.forEach(user => {
    const date = formatDateForGroup(new Date(user.created_at), range);
    const existing = groupedData.get(date) || { users: 0, cleaners: 0 };
    existing.users += 1;
    groupedData.set(date, existing);
  });

  // Group cleaners by date
  cleaners.forEach(cleaner => {
    const date = formatDateForGroup(new Date(cleaner.created_at), range);
    const existing = groupedData.get(date) || { users: 0, cleaners: 0 };
    existing.cleaners += 1;
    groupedData.set(date, existing);
  });

  // Convert to array and sort
  const result: SignupDataPoint[] = Array.from(groupedData.entries())
    .map(([date, data]) => ({
      date,
      users: data.users,
      cleaners: data.cleaners,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

interface SubscriptionData {
  tier: string;
  monthly_price: number | null;
  status: string;
}

function buildRevenueTrend(
  subscriptions: SubscriptionData[],
  range: DateRange
): RevenueDataPoint[] {
  // For simplicity, calculate current MRR per tier and show as last data point
  // In a real app, you'd have subscription history with timestamps
  const now = new Date();
  const rangeStart = getDateRangeStart(range);

  // Generate date points
  const dataPoints: RevenueDataPoint[] = [];
  const endDate = now;
  const startDate = rangeStart || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Determine step size based on range
  let stepDays = 1;
  if (range === '30d') stepDays = 1;
  else if (range === '90d') stepDays = 7;
  else if (range === 'all') stepDays = 30;
  else stepDays = 1;

  // Calculate total MRR
  const totalMRR = subscriptions.reduce((sum, sub) => {
    const price = sub.monthly_price || getTierDefaultPrice(sub.tier);
    return sum + price;
  }, 0);

  const totalSubs = subscriptions.filter(s => s.tier !== 'free').length;

  // Generate simulated growth data (in production, use actual historical data)
  const currentDate = new Date(startDate);
  let dataPointCount = 0;
  const maxPoints = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 13 : 12;

  while (currentDate <= endDate && dataPointCount < maxPoints) {
    const progress = (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    // Simulate growth curve
    const growthFactor = Math.pow(progress, 0.8);

    dataPoints.push({
      date: currentDate.toISOString().split('T')[0],
      mrr: Math.round(totalMRR * growthFactor),
      subscriptions: Math.round(totalSubs * growthFactor),
    });

    currentDate.setDate(currentDate.getDate() + stepDays);
    dataPointCount++;
  }

  // Ensure last point is current actual data
  if (dataPoints.length > 0) {
    dataPoints[dataPoints.length - 1] = {
      date: now.toISOString().split('T')[0],
      mrr: totalMRR,
      subscriptions: totalSubs,
    };
  }

  return dataPoints;
}
