import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAdminAnalytics, type DateRange } from '@/lib/services/admin-analytics';
import { AnalyticsDashboard } from './analytics-dashboard';

interface AnalyticsPageProps {
  searchParams: { range?: string };
}

export default async function AdminAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify admin role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    redirect('/dashboard/customer');
  }

  // Get date range from query params
  const validRanges: DateRange[] = ['7d', '30d', '90d', 'all'];
  const range = validRanges.includes(searchParams.range as DateRange)
    ? (searchParams.range as DateRange)
    : '30d';

  // Fetch analytics data
  const analyticsData = await getAdminAnalytics(range);

  return (
    <AnalyticsDashboard
      initialData={analyticsData}
      initialRange={range}
    />
  );
}

export const metadata = {
  title: 'Analytics Dashboard | Admin | Boss of Clean',
  description: 'Platform analytics and business metrics',
};
