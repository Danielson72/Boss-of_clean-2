import { Clock } from 'lucide-react';
import { MIN_RESPONSE_SAMPLES, formatResponseWindow, type ResponseStat } from '@/lib/services/response-time';

// "Usually responds within X" — a measured fact, shown ONLY when there are
// enough real data points. No endorsement, no ranking, no guarantee.
export function ResponseTimeBadge({
  stat,
  className = '',
  iconClassName = 'h-4 w-4 text-gray-400',
}: {
  stat?: ResponseStat | null;
  className?: string;
  iconClassName?: string;
}) {
  if (!stat || stat.sampleCount < MIN_RESPONSE_SAMPLES) return null;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Clock className={iconClassName} aria-hidden="true" />
      Usually responds within {formatResponseWindow(stat.medianSeconds)}
    </span>
  );
}
