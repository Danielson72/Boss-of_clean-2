'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Gift, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubscriptionStatusCardProps {
  planName: string;
  planTier: 'free' | 'basic' | 'pro';
  price: number;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
  nextBillingDate?: string;
  cancelAt?: string;
  onManageBilling?: () => void;
  onUpgrade?: () => void;
  isLoading?: boolean;
}

const planIcons = {
  free: Gift,
  basic: Zap,
  pro: Crown,
};

const planColors = {
  free: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  basic: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  pro: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
};

const statusConfig = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  canceled: { label: 'Canceled', className: 'bg-red-100 text-red-700' },
  past_due: { label: 'Past Due', className: 'bg-yellow-100 text-yellow-700' },
  trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700' },
  none: { label: 'No Plan', className: 'bg-gray-100 text-gray-700' },
};

export function SubscriptionStatusCard({
  planName,
  planTier,
  price,
  status,
  nextBillingDate,
  cancelAt,
  onManageBilling,
  onUpgrade,
  isLoading = false,
}: SubscriptionStatusCardProps) {
  const IconComponent = planIcons[planTier];
  const colors = planColors[planTier];
  const statusInfo = statusConfig[status];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Subscription</CardTitle>
          <Badge className={cn('font-medium', statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', colors.bg)}>
            <IconComponent className={cn('h-6 w-6', colors.text)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{planName}</h3>
            <p className="text-gray-600">
              {price === 0 ? 'Free' : `$${price}/month`}
            </p>
          </div>
        </div>

        {nextBillingDate && status === 'active' && !cancelAt && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Next billing: {formatDate(nextBillingDate)}</span>
          </div>
        )}

        {cancelAt && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your subscription will end on {formatDate(cancelAt)}
            </p>
          </div>
        )}

        {status === 'past_due' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Payment failed. Please update your payment method.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {planTier === 'free' ? (
            <Button
              onClick={onUpgrade}
              disabled={isLoading}
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          ) : (
            <Button
              onClick={onManageBilling}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
