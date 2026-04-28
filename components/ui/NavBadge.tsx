import * as React from 'react';
import { cn } from '@/lib/utils';

interface NavBadgeProps {
  count: number | null | undefined;
  ariaLabel?: string;
  className?: string;
}

/**
 * Small circular numeric badge for nav items. Renders nothing when count is
 * 0/null/undefined. Caps display at "99+". Caller positions it via className —
 * typically `absolute top-1 right-2` to overlay the upper-right of a nav item.
 */
export function NavBadge({ count, ariaLabel, className }: NavBadgeProps) {
  if (!count || count <= 0) return null;

  const displayValue = count >= 100 ? '99+' : String(count);
  const label =
    ariaLabel ?? `${count} ${count === 1 ? 'item needs' : 'items need'} attention`;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-xs font-bold leading-none pointer-events-none',
        className
      )}
    >
      {displayValue}
    </span>
  );
}
