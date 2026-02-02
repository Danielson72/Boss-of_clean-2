'use client';

import { Zap, Star, ShieldCheck } from 'lucide-react';
import type { EarnedBadge, BadgeType } from '@/lib/services/badges';

interface BadgeDisplayProps {
  badges: EarnedBadge[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  maxDisplay?: number;
  className?: string;
}

const iconMap = {
  zap: Zap,
  star: Star,
  'shield-check': ShieldCheck,
};

const sizeClasses = {
  sm: {
    container: 'gap-1',
    badge: 'px-2 py-0.5',
    icon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    container: 'gap-1.5',
    badge: 'px-2.5 py-1',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    container: 'gap-2',
    badge: 'px-3 py-1.5',
    icon: 'h-5 w-5',
    text: 'text-base',
  },
};

/**
 * Display a single badge
 */
function Badge({
  badge,
  size = 'md',
  showLabel = true,
}: {
  badge: EarnedBadge;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const Icon = iconMap[badge.icon];
  const sizes = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizes.badge} ${badge.bgColor} ${badge.color} rounded-full font-medium`}
      title={badge.description}
      role="status"
      aria-label={`${badge.name}: ${badge.description}`}
    >
      <Icon className={sizes.icon} aria-hidden="true" />
      {showLabel && <span className={sizes.text}>{badge.name}</span>}
    </span>
  );
}

/**
 * Display a collection of badges earned by a cleaner
 * Supports different sizes and can show icons only or with labels
 */
export function BadgeDisplay({
  badges,
  size = 'md',
  showLabels = true,
  maxDisplay,
  className = '',
}: BadgeDisplayProps) {
  if (!badges || badges.length === 0) {
    return null;
  }

  const sizes = sizeClasses[size];
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const remainingCount = maxDisplay ? Math.max(0, badges.length - maxDisplay) : 0;

  return (
    <div
      className={`flex flex-wrap items-center ${sizes.container} ${className}`}
      role="list"
      aria-label="Achievement badges"
    >
      {displayBadges.map((badge) => (
        <Badge key={badge.type} badge={badge} size={size} showLabel={showLabels} />
      ))}
      {remainingCount > 0 && (
        <span
          className={`${sizes.badge} ${sizes.text} bg-gray-100 text-gray-600 rounded-full`}
          role="listitem"
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

/**
 * Compact badge display for search cards - icons only with tooltip
 */
export function CompactBadgeDisplay({
  badges,
  className = '',
}: {
  badges: EarnedBadge[];
  className?: string;
}) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} role="list" aria-label="Badges">
      {badges.map((badge) => {
        const Icon = iconMap[badge.icon];
        return (
          <span
            key={badge.type}
            className={`p-1 ${badge.bgColor} ${badge.color} rounded-full`}
            title={`${badge.name}: ${badge.description}`}
            role="listitem"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        );
      })}
    </div>
  );
}

/**
 * Badge list with descriptions - for profile pages
 */
export function BadgeList({
  badges,
  className = '',
}: {
  badges: EarnedBadge[];
  className?: string;
}) {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`} role="list" aria-label="Earned badges">
      {badges.map((badge) => {
        const Icon = iconMap[badge.icon];
        return (
          <div
            key={badge.type}
            className={`flex items-center gap-3 p-3 ${badge.bgColor} rounded-lg`}
            role="listitem"
          >
            <div className={`p-2 bg-white/50 rounded-full ${badge.color}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className={`font-medium ${badge.color}`}>{badge.name}</div>
              <div className="text-sm text-gray-600">{badge.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { BadgeType, EarnedBadge };
