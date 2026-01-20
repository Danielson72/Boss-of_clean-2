'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault?: boolean;
}

export interface PaymentMethodCardProps {
  paymentMethod?: PaymentMethod | null;
  onUpdatePayment?: () => void;
  onAddPayment?: () => void;
  isLoading?: boolean;
}

const cardBrandIcons: Record<string, string> = {
  visa: '/images/cards/visa.svg',
  mastercard: '/images/cards/mastercard.svg',
  amex: '/images/cards/amex.svg',
  discover: '/images/cards/discover.svg',
};

const cardBrandColors: Record<string, string> = {
  visa: 'bg-blue-600',
  mastercard: 'bg-red-500',
  amex: 'bg-blue-400',
  discover: 'bg-orange-500',
  default: 'bg-gray-600',
};

export function PaymentMethodCard({
  paymentMethod,
  onUpdatePayment,
  onAddPayment,
  isLoading = false,
}: PaymentMethodCardProps) {
  const brandColor = paymentMethod
    ? cardBrandColors[paymentMethod.brand.toLowerCase()] || cardBrandColors.default
    : cardBrandColors.default;

  const formatExpiry = (month: number, year: number) => {
    const shortYear = year.toString().slice(-2);
    return `${month.toString().padStart(2, '0')}/${shortYear}`;
  };

  const getBrandDisplay = (brand: string) => {
    const brandMap: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brandMap[brand.toLowerCase()] || brand;
  };

  if (!paymentMethod) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No payment method on file</p>
            <Button onClick={onAddPayment} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Card Visual */}
          <div
            className={cn(
              'w-20 h-12 rounded-md flex items-center justify-center text-white',
              brandColor
            )}
          >
            <CreditCard className="h-6 w-6" />
          </div>

          {/* Card Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {getBrandDisplay(paymentMethod.brand)}
              </span>
              {paymentMethod.isDefault && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span>**** **** **** {paymentMethod.last4}</span>
              <span>
                Expires {formatExpiry(paymentMethod.expMonth, paymentMethod.expYear)}
              </span>
            </div>
          </div>

          {/* Update Button */}
          <Button
            variant="outline"
            onClick={onUpdatePayment}
            disabled={isLoading}
          >
            Update
          </Button>
        </div>

        {/* Security Note */}
        <p className="text-xs text-gray-500 mt-4">
          Your payment information is securely stored and processed by Stripe.
        </p>
      </CardContent>
    </Card>
  );
}
