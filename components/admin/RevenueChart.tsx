'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RevenueDataPoint } from '@/lib/services/admin-analytics';

interface RevenueChartProps {
  data: RevenueDataPoint[];
  dateRange: string;
}

export function RevenueChart({ data, dateRange }: RevenueChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateRange === '7d' || dateRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentMRR = data.length > 0 ? data[data.length - 1].mrr : 0;
  const currentSubs = data.length > 0 ? data[data.length - 1].subscriptions : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>MRR Growth</CardTitle>
        <CardDescription>
          Monthly recurring revenue trend (Current: {formatCurrency(currentMRR)} from {currentSubs} subscriptions)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No revenue data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => {
                  if (name === 'mrr') {
                    return [formatCurrency(value), 'MRR'];
                  }
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                name="mrr"
                stroke="hsl(142, 70%, 45%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
