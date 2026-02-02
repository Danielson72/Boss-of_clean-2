import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Badge types that can be earned by cleaners
 */
export type BadgeType = 'fast_responder' | 'top_rated' | 'verified';

/**
 * Badge definition with display properties
 */
export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: 'zap' | 'star' | 'shield-check';
  color: string;
  bgColor: string;
}

/**
 * Badge earned by a cleaner with metadata
 */
export interface EarnedBadge extends BadgeDefinition {
  earnedAt?: string;
}

/**
 * Cleaner data needed for badge evaluation
 */
export interface CleanerBadgeData {
  id: string;
  average_rating: number;
  total_reviews: number;
  insurance_verified: boolean;
  license_verified: boolean;
  response_time_hours?: number;
}

/**
 * Badge definitions with criteria and display properties
 */
export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
  fast_responder: {
    type: 'fast_responder',
    name: 'Fast Responder',
    description: 'Responds to quotes within 1 hour on average',
    icon: 'zap',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  top_rated: {
    type: 'top_rated',
    name: 'Top Rated',
    description: '4.8+ rating with 10+ reviews',
    icon: 'star',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  verified: {
    type: 'verified',
    name: 'Verified Pro',
    description: 'Insurance and license verified by admin',
    icon: 'shield-check',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
};

/**
 * Badge criteria thresholds
 */
export const BADGE_CRITERIA = {
  FAST_RESPONDER_HOURS: 1, // Average response time < 1 hour
  TOP_RATED_MIN_RATING: 4.8,
  TOP_RATED_MIN_REVIEWS: 10,
} as const;

/**
 * Evaluate if a cleaner qualifies for the Fast Responder badge
 * Requires average response time < 1 hour
 */
export function evaluateFastResponder(responseTimeHours?: number): boolean {
  if (responseTimeHours === undefined || responseTimeHours === null) {
    return false;
  }
  return responseTimeHours > 0 && responseTimeHours < BADGE_CRITERIA.FAST_RESPONDER_HOURS;
}

/**
 * Evaluate if a cleaner qualifies for the Top Rated badge
 * Requires 4.8+ rating with at least 10 reviews
 */
export function evaluateTopRated(averageRating: number, totalReviews: number): boolean {
  return (
    averageRating >= BADGE_CRITERIA.TOP_RATED_MIN_RATING &&
    totalReviews >= BADGE_CRITERIA.TOP_RATED_MIN_REVIEWS
  );
}

/**
 * Evaluate if a cleaner qualifies for the Verified badge
 * Requires both insurance and license verified by admin
 */
export function evaluateVerified(insuranceVerified: boolean, licenseVerified: boolean): boolean {
  return insuranceVerified === true && licenseVerified === true;
}

/**
 * Get all badges earned by a cleaner based on their current data
 */
export function getCleanerBadges(cleaner: CleanerBadgeData): EarnedBadge[] {
  const badges: EarnedBadge[] = [];

  // Fast Responder badge
  if (evaluateFastResponder(cleaner.response_time_hours)) {
    badges.push({ ...BADGE_DEFINITIONS.fast_responder });
  }

  // Top Rated badge
  if (evaluateTopRated(cleaner.average_rating, cleaner.total_reviews)) {
    badges.push({ ...BADGE_DEFINITIONS.top_rated });
  }

  // Verified badge
  if (evaluateVerified(cleaner.insurance_verified, cleaner.license_verified)) {
    badges.push({ ...BADGE_DEFINITIONS.verified });
  }

  return badges;
}

/**
 * Calculate average response time for a cleaner from their quote responses
 */
export async function calculateAverageResponseTime(
  supabase: SupabaseClient,
  cleanerId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('created_at, updated_at, status')
    .eq('cleaner_id', cleanerId)
    .eq('status', 'responded')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Calculate average response time in hours
  const responseTimes = data
    .filter(quote => quote.created_at && quote.updated_at)
    .map(quote => {
      const created = new Date(quote.created_at).getTime();
      const responded = new Date(quote.updated_at).getTime();
      return (responded - created) / (1000 * 60 * 60); // Convert to hours
    })
    .filter(hours => hours > 0 && hours < 168); // Filter out outliers (> 1 week)

  if (responseTimes.length === 0) {
    return null;
  }

  const avgHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  return Math.round(avgHours * 10) / 10; // Round to 1 decimal
}

/**
 * Update a cleaner's response_time_hours in the database
 * Called when a cleaner responds to a quote
 */
export async function updateCleanerResponseTime(
  supabase: SupabaseClient,
  cleanerId: string
): Promise<void> {
  const avgResponseTime = await calculateAverageResponseTime(supabase, cleanerId);

  if (avgResponseTime !== null) {
    await supabase
      .from('cleaners')
      .update({ response_time_hours: Math.round(avgResponseTime) })
      .eq('id', cleanerId);
  }
}

/**
 * Get badges for multiple cleaners efficiently
 * Useful for search results
 */
export function getBadgesForCleaners(
  cleaners: CleanerBadgeData[]
): Map<string, EarnedBadge[]> {
  const badgeMap = new Map<string, EarnedBadge[]>();

  for (const cleaner of cleaners) {
    badgeMap.set(cleaner.id, getCleanerBadges(cleaner));
  }

  return badgeMap;
}
