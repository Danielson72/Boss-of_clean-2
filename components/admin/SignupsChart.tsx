'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SignupDataPoint } from '@/lib/services/admin-analytics';

interface SignupsChartProps {
  data: SignupDataPoint[];
  dateRange: string;
}

export function SignupsChart({ data, dateRange }: SignupsChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (dateRange === '7d' || dateRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalUsers = data.reduce((sum, d) => sum + d.users, 0);
  const totalCleaners = data.reduce((sum, d) => sum + d.cleaners, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signups Over Time</CardTitle>
        <CardDescription>
          New user and cleaner registrations ({totalUsers} users, {totalCleaners} cleaners in period)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No signup data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelFormatter={formatDate}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                name="Users"
                stroke="hsl(220, 70%, 50%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(220, 70%, 50%)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="cleaners"
                name="Cleaners"
                stroke="hsl(142, 70%, 45%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(142, 70%, 45%)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
