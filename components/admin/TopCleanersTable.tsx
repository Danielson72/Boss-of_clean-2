'use client';

import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopCleaner } from '@/lib/services/admin-analytics';

interface TopCleanersTableProps {
  title: string;
  description: string;
  cleaners: TopCleaner[];
  metric: 'reviews' | 'bookings';
}

export function TopCleanersTable({ title, description, cleaners, metric }: TopCleanersTableProps) {
  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'pro':
        return 'default';
      case 'basic':
        return 'secondary';
      case 'enterprise':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {cleaners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cleaner data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Rank</th>
                  <th className="pb-3 font-medium">Business Name</th>
                  <th className="pb-3 font-medium">Rating</th>
                  <th className="pb-3 font-medium">{metric === 'reviews' ? 'Reviews' : 'Bookings'}</th>
                  <th className="pb-3 font-medium">Plan</th>
                </tr>
              </thead>
              <tbody>
                {cleaners.map((cleaner, index) => (
                  <tr key={cleaner.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-muted-foreground">#{index + 1}</td>
                    <td className="py-3">
                      <span className="font-medium">{cleaner.businessName}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{cleaner.averageRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {metric === 'reviews' ? cleaner.totalReviews : cleaner.totalBookings}
                    </td>
                    <td className="py-3">
                      <Badge variant={getTierBadgeVariant(cleaner.subscriptionTier)}>
                        {getTierLabel(cleaner.subscriptionTier)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
