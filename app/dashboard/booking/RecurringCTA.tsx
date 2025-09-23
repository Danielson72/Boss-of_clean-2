'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Repeat,
  Crown,
  Sparkles,
  Calendar,
  TrendingUp,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecurringCTAProps {
  userTier: 'free' | 'growth' | 'pro' | 'enterprise';
}

const tierConfig = {
  free: {
    canAccess: false,
    title: 'Unlock Recurring Cleanings',
    description: 'Save time and money with automatic recurring services',
    upgradeText: 'Upgrade to Growth ($29.99/mo)',
    benefits: ['Automatic scheduling', '10% recurring discount', 'Priority booking'],
    icon: TrendingUp,
    badgeText: 'Growth Required'
  },
  growth: {
    canAccess: true,
    title: 'Set Up Recurring Service',
    description: 'Never worry about scheduling again - we\'ve got you covered!',
    benefits: ['10% recurring discount', 'Flexible scheduling', 'Easy modifications'],
    icon: Repeat,
    badgeText: 'Available'
  },
  pro: {
    canAccess: true,
    title: 'Premium Recurring Service',
    description: 'Enjoy enhanced recurring benefits with your Pro membership',
    benefits: ['15% recurring discount', 'Same cleaner guarantee', 'Premium support'],
    icon: Crown,
    badgeText: 'Pro Benefits'
  },
  enterprise: {
    canAccess: true,
    title: 'Enterprise Recurring Management',
    description: 'Advanced recurring options for your business needs',
    benefits: ['20% recurring discount', 'Dedicated account manager', 'Custom scheduling'],
    icon: Sparkles,
    badgeText: 'Enterprise'
  }
};

export function RecurringCTA({ userTier }: RecurringCTAProps) {
  const config = tierConfig[userTier];
  const IconComponent = config.icon;

  const handleCTAClick = () => {
    if (config.canAccess) {
      // Handle recurring setup
      console.log('Setting up recurring service...');
    } else {
      // Handle upgrade
      console.log('Redirecting to upgrade...');
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-2",
      config.canAccess
        ? "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
        : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50"
    )}>
      {/* CEO Cat Mascot Corner */}
      <div className="absolute top-4 right-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-lg">🐱</span>
        </div>
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between pr-16">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              config.canAccess ? "bg-blue-100" : "bg-amber-100"
            )}>
              <IconComponent className={cn(
                "w-6 h-6",
                config.canAccess ? "text-blue-600" : "text-amber-600"
              )} />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {config.title}
              </CardTitle>
              <Badge
                variant="secondary"
                className={cn(
                  "mt-1 text-xs",
                  config.canAccess
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                )}
              >
                {config.badgeText}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-gray-600 leading-relaxed">
          {config.description}
        </p>

        {/* Benefits List */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Benefits Include:
          </h4>
          <ul className="space-y-1">
            {config.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Frequency Options Preview (for accessible tiers) */}
        {config.canAccess && (
          <div className="bg-white/60 rounded-lg p-4 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Popular Schedules:
            </h4>
            <div className="flex flex-wrap gap-2">
              {['Weekly', 'Bi-weekly', 'Monthly'].map((frequency) => (
                <Badge key={frequency} variant="outline" className="text-xs">
                  {frequency}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-2">
          <Button
            onClick={handleCTAClick}
            className={cn(
              "w-full font-medium",
              config.canAccess
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            {config.canAccess ? (
              <>
                <Clock className="w-4 h-4 mr-2" />
                Set Up Recurring Service
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                {config.canAccess ? 'Set Up Recurring Service' : 'Upgrade to Growth ($29.99/mo)'}
              </>
            )}
          </Button>
        </div>

        {/* Purrfection tagline */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500 italic">
            &quot;Purrfection is our Standard&quot; - Consistency you can trust
          </p>
        </div>
      </CardContent>
    </Card>
  );
}