'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Check } from 'lucide-react';

export interface CancelSubscriptionDialogProps {
  planName: string;
  planTier: 'free' | 'basic' | 'pro';
  cancelAt?: string;
  onCancel: () => Promise<void>;
  onReactivate?: () => Promise<void>;
  isLoading?: boolean;
  trigger?: React.ReactNode;
}

// Features that will be lost when downgrading to free
const FEATURES_TO_LOSE: Record<string, string[]> = {
  basic: [
    'Unlimited lead credits (reverts to 5/month)',
    'Priority search placement',
    'Up to 10 photos (reverts to 1)',
    'Business analytics',
    'Phone support',
  ],
  pro: [
    'Unlimited lead credits (reverts to 5/month)',
    'Featured business listing',
    'Top search placement',
    'Unlimited photos & videos',
    'Direct customer messaging',
    'Advanced analytics',
    'Dedicated account manager',
    '24/7 priority support',
  ],
};

export function CancelSubscriptionDialog({
  planName,
  planTier,
  cancelAt,
  onCancel,
  onReactivate,
  isLoading = false,
  trigger,
}: CancelSubscriptionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const features = FEATURES_TO_LOSE[planTier] || FEATURES_TO_LOSE.basic;

  const handleCancel = async () => {
    setProcessing(true);
    try {
      await onCancel();
      setIsOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!onReactivate) return;
    setProcessing(true);
    try {
      await onReactivate();
      setIsOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // If subscription is already scheduled for cancellation
  if (cancelAt) {
    return (
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" disabled={isLoading}>
              Reactivate Subscription
            </Button>
          )}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Reactivate Your Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Your {planName} subscription is scheduled to end on{' '}
              <strong>{formatDate(cancelAt)}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              If you reactivate now, your subscription will continue and you&apos;ll
              retain all your {planName} features.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>
              Keep Canceled
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivate}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </span>
              ) : (
                'Reactivate Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Normal cancel flow
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isLoading}
          >
            Cancel Subscription
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Cancel {planName} Subscription?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            We&apos;re sorry to see you go. If you cancel, you&apos;ll lose access to
            these features at the end of your billing period:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4">
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Your subscription will remain active until the end of your current
            billing period. You can reactivate anytime before then.
          </p>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={processing}>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={processing}
            className="bg-red-600 hover:bg-red-700"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </span>
            ) : (
              'Yes, Cancel Subscription'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
