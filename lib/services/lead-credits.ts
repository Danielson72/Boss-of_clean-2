/**
 * Lead Credits Service
 *
 * Manages lead credit tracking per billing cycle.
 * Credit limits by tier:
 *   - Free: 5/month
 *   - Basic: 20/month
 *   - Pro: Unlimited
 *   - Enterprise: Unlimited
 */

export const LEAD_LIMITS: Record<string, number> = {
  free: 5,
  basic: 20,
  pro: -1,
  enterprise: -1,
};

export function getCreditLimit(tier: string): number {
  return LEAD_LIMITS[tier] ?? 5;
}

export function isUnlimitedTier(tier: string): boolean {
  const limit = getCreditLimit(tier);
  return limit === -1;
}

export function getRemainingCredits(tier: string, used: number): number {
  const limit = getCreditLimit(tier);
  if (limit === -1) return -1;
  return Math.max(0, limit - used);
}
