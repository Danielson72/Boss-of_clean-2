'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Infinity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeadCreditsCardProps {
  usedCredits: number;
  totalCredits: number;
  isUnlimited: boolean;
  resetDate?: string;
  recentUsage?: number[];
}

export function LeadCreditsCard({
  usedCredits,
  totalCredits,
  isUnlimited,
  resetDate,
  recentUsage = [],
}: LeadCreditsCardProps) {
  const remainingCredits = totalCredits - usedCredits;
  const usagePercentage = isUnlimited ? 0 : (usedCredits / totalCredits) * 100;

  const formatResetDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  // Calculate circle properties for SVG
  const circleSize = 120;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (usagePercentage / 100) * circumference;

  // Sparkline dimensions
  const sparklineWidth = 100;
  const sparklineHeight = 30;
  const maxUsage = Math.max(...recentUsage, 1);

  const sparklinePath = recentUsage.length > 1
    ? recentUsage.map((value, index) => {
        const x = (index / (recentUsage.length - 1)) * sparklineWidth;
        const y = sparklineHeight - (value / maxUsage) * (sparklineHeight - 4);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')
    : '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Lead Credits</CardTitle>
          {isUnlimited && (
            <Badge className="bg-purple-100 text-purple-700 font-medium">
              <Infinity className="h-3 w-3 mr-1" />
              Unlimited
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative">
            <svg
              width={circleSize}
              height={circleSize}
              className="transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              {!isUnlimited && (
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke={usagePercentage >= 80 ? '#ef4444' : usagePercentage >= 60 ? '#f59e0b' : '#3b82f6'}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isUnlimited ? (
                <>
                  <Infinity className="h-8 w-8 text-purple-600" />
                  <span className="text-sm text-gray-600">Unlimited</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-gray-900">
                    {remainingCredits}
                  </span>
                  <span className="text-sm text-gray-600">of {totalCredits}</span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {usedCredits} leads contacted this month
              </span>
            </div>

            {resetDate && !isUnlimited && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Resets in {formatResetDate(resetDate)}
                </span>
              </div>
            )}

            {/* Sparkline */}
            {recentUsage.length > 1 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Recent Activity</p>
                <svg
                  width={sparklineWidth}
                  height={sparklineHeight}
                  className="overflow-visible"
                >
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {recentUsage.map((value, index) => (
                    <circle
                      key={index}
                      cx={(index / (recentUsage.length - 1)) * sparklineWidth}
                      cy={sparklineHeight - (value / maxUsage) * (sparklineHeight - 4)}
                      r="2"
                      fill="#3b82f6"
                    />
                  ))}
                </svg>
              </div>
            )}
          </div>
        </div>

        {!isUnlimited && remainingCredits <= 1 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              {remainingCredits === 0
                ? "You've used all your lead credits this month. Upgrade for unlimited leads."
                : 'Running low on lead credits. Consider upgrading for unlimited leads.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
