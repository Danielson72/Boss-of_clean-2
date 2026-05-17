'use client';

import { useState } from 'react';
import Link from 'next/link';
import { redirectToCheckout } from '@/lib/stripe/client';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'components/pricing/PricingCTA' });

export type PricingAuthState = 'anonymous' | 'pro' | 'customer';
export type PricingPlanId = 'free' | 'basic' | 'pro';

interface PricingCTAProps {
  planId: PricingPlanId;
  ctaHref: string;
  ctaLabel: string;
  highlighted: boolean;
  authState: PricingAuthState;
}

const baseClasses =
  'block w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 min-h-[44px]';
const highlightedClasses =
  'bg-brand-gold text-white hover:bg-brand-gold-light shadow-lg hover:shadow-xl';
const standardClasses = 'bg-brand-dark text-white hover:bg-brand-navy';

export function PricingCTA({
  planId,
  ctaHref,
  ctaLabel,
  highlighted,
  authState,
}: PricingCTAProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonClasses = `${baseClasses} ${highlighted ? highlightedClasses : standardClasses}`;

  // Anonymous users keep the existing /signup conversion funnel.
  if (authState === 'anonymous') {
    return (
      <Link href={ctaHref} className={buttonClasses}>
        {ctaLabel}
      </Link>
    );
  }

  // Customers can't subscribe to pro plans — direct them to the right place.
  if (authState === 'customer') {
    return (
      <div className="space-y-2">
        <Link href="/dashboard/customer" className={buttonClasses}>
          Go to Customer Dashboard
        </Link>
        <p className="text-xs text-gray-500 text-center">
          These plans are for service pros. You&apos;re signed in with a customer account.
        </p>
      </div>
    );
  }

  // Signed-in pro on the Free tier → already on Free, send to dashboard.
  if (planId === 'free') {
    return (
      <Link href="/dashboard/pro" className={buttonClasses}>
        Go to Dashboard
      </Link>
    );
  }

  // Signed-in pro on Basic or Pro → live Stripe checkout.
  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      await redirectToCheckout(planId);
    } catch (err) {
      logger.error('Pricing CTA checkout failed', { planId }, err);
      setError(
        err instanceof Error ? err.message : 'Could not start checkout. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`${buttonClasses} ${loading ? 'opacity-70 cursor-wait' : ''}`}
      >
        {loading ? 'Redirecting to Stripe…' : ctaLabel}
      </button>
      {error && (
        <p className="text-xs text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
