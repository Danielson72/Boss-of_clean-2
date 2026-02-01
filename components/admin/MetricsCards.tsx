'use client';

import { Users, UserCheck, CreditCard, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminMetrics } from '@/lib/services/admin-analytics';

interface MetricsCardsProps {
  metrics: AdminMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            All registered accounts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cleaners</CardTitle>
          <UserCheck className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCleaners.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Approved cleaner profiles
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <CreditCard className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.activeSubscriptions.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Paid subscription plans
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
          <p className="text-xs text-muted-foreground">
            MRR from subscriptions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Free to Paid Conversion</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">
            {formatPercentage(metrics.freeToBasicConversion)}
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground">
            Cleaners who upgraded from free
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Basic to Pro Conversion</CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">
            {formatPercentage(metrics.basicToProConversion)}
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xs text-muted-foreground">
            Paid users who upgraded to Pro
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
