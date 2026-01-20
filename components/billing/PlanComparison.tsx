'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Plan {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'pro';
  price: number;
  description: string;
  features: {
    name: string;
    included: boolean;
    highlight?: boolean;
  }[];
  popular?: boolean;
  current?: boolean;
}

export interface PlanComparisonProps {
  plans: Plan[];
  currentTier: 'free' | 'basic' | 'pro';
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  loadingPlan?: string;
}

const planIcons = {
  free: Gift,
  basic: Zap,
  pro: Crown,
};

const planColors = {
  free: {
    border: 'border-green-200',
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconText: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
  basic: {
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  pro: {
    border: 'border-purple-200',
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
};

export const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      { name: 'Basic business listing', included: true },
      { name: '5 lead credits/month', included: true },
      { name: '1 photo upload', included: true },
      { name: 'Email support', included: true },
      { name: 'Priority search placement', included: false },
      { name: 'Unlimited photos', included: false },
      { name: 'Business analytics', included: false },
      { name: 'Direct messaging', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    tier: 'basic',
    price: 79,
    description: 'Great for growing businesses',
    popular: true,
    features: [
      { name: 'Premium business listing', included: true },
      { name: 'Unlimited lead credits', included: true, highlight: true },
      { name: 'Up to 10 photos', included: true },
      { name: 'Phone & email support', included: true },
      { name: 'Priority search placement', included: true, highlight: true },
      { name: 'Unlimited photos', included: false },
      { name: 'Business analytics', included: true },
      { name: 'Direct messaging', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    price: 199,
    description: 'For established professionals',
    features: [
      { name: 'Featured business listing', included: true, highlight: true },
      { name: 'Unlimited lead credits', included: true, highlight: true },
      { name: 'Unlimited photos & videos', included: true },
      { name: '24/7 priority support', included: true },
      { name: 'Top search placement', included: true, highlight: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Direct messaging', included: true, highlight: true },
      { name: 'Dedicated account manager', included: true },
    ],
  },
];

export function PlanComparison({
  plans = defaultPlans,
  currentTier,
  onSelectPlan,
  isLoading = false,
  loadingPlan,
}: PlanComparisonProps) {
  const tierOrder = { free: 0, basic: 1, pro: 2 };

  const getButtonText = (planTier: string, isCurrent: boolean) => {
    if (isCurrent) return 'Current Plan';
    if (tierOrder[planTier as keyof typeof tierOrder] > tierOrder[currentTier]) {
      return 'Upgrade';
    }
    return 'Downgrade';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Compare Plans</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const IconComponent = planIcons[plan.tier];
            const colors = planColors[plan.tier];
            const isCurrent = plan.tier === currentTier;
            const isUpgrade = tierOrder[plan.tier] > tierOrder[currentTier];
            const isButtonLoading = isLoading && loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-xl border-2 p-6 transition-all',
                  isCurrent ? 'ring-2 ring-blue-500' : '',
                  plan.popular && !isCurrent ? colors.border : 'border-gray-200',
                  plan.popular ? colors.bg : 'bg-white'
                )}
              >
                {plan.popular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                    Most Popular
                  </Badge>
                )}

                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                    Current Plan
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center',
                      colors.iconBg
                    )}
                  >
                    <IconComponent className={cn('h-6 w-6', colors.iconText)} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        feature.included ? 'text-gray-700' : 'text-gray-400'
                      )}
                    >
                      {feature.included ? (
                        <Check
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            feature.highlight ? 'text-green-600' : 'text-green-500'
                          )}
                        />
                      ) : (
                        <X className="h-4 w-4 flex-shrink-0 text-gray-300" />
                      )}
                      <span className={feature.highlight ? 'font-medium' : ''}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => !isCurrent && onSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  variant={isCurrent ? 'outline' : isUpgrade ? 'default' : 'secondary'}
                  className={cn(
                    'w-full',
                    !isCurrent && isUpgrade && colors.button,
                    !isCurrent && isUpgrade && 'text-white'
                  )}
                >
                  {isButtonLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : (
                    getButtonText(plan.tier, isCurrent)
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
