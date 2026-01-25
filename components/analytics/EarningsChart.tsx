'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { MonthlyEarnings } from '@/lib/services/analytics';

interface EarningsChartProps {
  data: MonthlyEarnings[];
}

const chartConfig: ChartConfig = {
  earnings: {
    label: 'Revenue',
    color: '#3b82f6',
  },
  bookingsCount: {
    label: 'Bookings',
    color: '#10b981',
  },
};

export function EarningsChart({ data }: EarningsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
        <p className="text-gray-500">No earnings data available</p>
      </div>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    label: `${item.month} ${item.year}`,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                if (name === 'earnings') {
                  return <span className="font-medium">${Number(value).toFixed(2)}</span>;
                }
                return <span className="font-medium">{value}</span>;
              }}
            />
          }
        />
        <Bar
          dataKey="earnings"
          fill="var(--color-earnings)"
          radius={[4, 4, 0, 0]}
          name="earnings"
        />
      </BarChart>
    </ChartContainer>
  );
}

export default EarningsChart;
