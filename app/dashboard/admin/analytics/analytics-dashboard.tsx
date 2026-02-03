'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricsCards } from '@/components/admin/MetricsCards';
import { TopCleanersTable } from '@/components/admin/TopCleanersTable';
import { DateRangeSelector } from '@/components/admin/DateRangeSelector';
import type { AdminAnalyticsData, DateRange } from '@/lib/services/admin-analytics';

// Loading skeleton for chart cards
const ChartSkeleton = () => (
  <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
    <div className="p-6 pb-2">
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
    </div>
    <div className="p-6 pt-0">
      <div className="h-[300px] bg-gray-100 rounded animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading chart...</span>
      </div>
    </div>
  </div>
);

// Dynamic imports for heavy chart components
const SignupsChart = dynamic(
  () => import('@/components/admin/SignupsChart').then((mod) => mod.SignupsChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

const RevenueChart = dynamic(
  () => import('@/components/admin/RevenueChart').then((mod) => mod.RevenueChart),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

interface AnalyticsDashboardProps {
  initialData: AdminAnalyticsData;
  initialRange: DateRange;
}

export function AnalyticsDashboard({ initialData, initialRange }: AnalyticsDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [range, setRange] = useState<DateRange>(initialRange);

  const handleRangeChange = (newRange: DateRange) => {
    setRange(newRange);
    startTransition(() => {
      router.push(`/dashboard/admin/analytics?range=${newRange}`);
      router.refresh();
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Monitor platform metrics and business performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={range} onChange={handleRangeChange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg z-50">
          Loading...
        </div>
      )}

      <div className="space-y-8">
        {/* Key Metrics Cards */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
          <MetricsCards metrics={initialData.metrics} />
        </section>

        {/* Charts Section */}
        <section className="grid gap-6 lg:grid-cols-2">
          <SignupsChart data={initialData.signupTrend} dateRange={range} />
          <RevenueChart data={initialData.revenueTrend} dateRange={range} />
        </section>

        {/* Top Cleaners Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Top Performers</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <TopCleanersTable
              title="Top Cleaners by Reviews"
              description="Cleaners with the most customer reviews"
              cleaners={initialData.topCleanersByReviews}
              metric="reviews"
            />
            <TopCleanersTable
              title="Top Cleaners by Bookings"
              description="Cleaners with the most completed bookings"
              cleaners={initialData.topCleanersByBookings}
              metric="bookings"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
