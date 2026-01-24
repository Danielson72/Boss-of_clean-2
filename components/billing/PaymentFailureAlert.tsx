'use client';

import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaymentFailureAlertProps {
  failedCount: number;
  gracePeriodEnd: string | null;
  daysRemaining: number | null;
  onUpdatePayment?: () => void;
}

export function PaymentFailureAlert({
  failedCount,
  gracePeriodEnd,
  daysRemaining,
  onUpdatePayment,
}: PaymentFailureAlertProps) {
  if (failedCount === 0 || !gracePeriodEnd) {
    return null;
  }

  const isUrgent = daysRemaining !== null && daysRemaining <= 2;
  const formattedDate = new Date(gracePeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`p-4 rounded-lg border ${
        isUrgent
          ? 'bg-red-50 border-red-300'
          : 'bg-yellow-50 border-yellow-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            isUrgent ? 'text-red-600' : 'text-yellow-600'
          }`}
        />
        <div className="flex-1">
          <h4
            className={`font-semibold ${
              isUrgent ? 'text-red-800' : 'text-yellow-800'
            }`}
          >
            {isUrgent ? 'Urgent: Payment Required' : 'Payment Failed'}
          </h4>
          <p
            className={`text-sm mt-1 ${
              isUrgent ? 'text-red-700' : 'text-yellow-700'
            }`}
          >
            {failedCount >= 3
              ? `Your subscription will be downgraded to Free on ${formattedDate} unless payment is resolved.`
              : `We were unable to process your payment (attempt ${failedCount} of 3). Please update your payment method before ${formattedDate} to avoid losing your subscription.`}
          </p>
          {daysRemaining !== null && daysRemaining > 0 && (
            <p
              className={`text-xs mt-1 ${
                isUrgent ? 'text-red-600' : 'text-yellow-600'
              }`}
            >
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </p>
          )}
          {onUpdatePayment && (
            <Button
              onClick={onUpdatePayment}
              size="sm"
              variant={isUrgent ? 'destructive' : 'default'}
              className="mt-3"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
