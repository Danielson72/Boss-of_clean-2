/**
 * Lead DTOs — explicit allow-list of fields exposed to pros.
 * NEVER include: customer_id, name, phone, email, address, description, special_requests
 */

export type FeeTier = 'standard' | 'deep_clean' | 'specialty';

/** Fields returned by GET /api/leads/available — no PII */
export interface AvailableLeadDTO {
  id: string;
  service_type: string;
  zip_code: string;
  city: string;
  property_type: string | null;
  property_size: string | null;
  frequency: string | null;
  created_at: string;
  unlock_count: number;
  competition_remaining: number;
  fee_tier: FeeTier;
  unlock_price_cents: number;
}

/** Fields returned by GET /api/leads/unlocked — full contact after payment */
export interface UnlockedLeadDTO {
  id: string;
  fee_tier: FeeTier;
  amount_cents: number;
  status: string;
  unlocked_at: string;
  created_at: string;
  refund_status: string | null;
  quote_request: {
    id: string;
    service_type: string;
    service_date: string | null;
    service_time: string | null;
    address: string;
    city: string;
    zip_code: string;
    property_type: string | null;
    property_size: string | null;
    description: string | null;
    special_requests: string | null;
    frequency: string | null;
    customer: {
      full_name: string;
      phone: string | null;
      email: string;
    };
  };
}

/** Fee tier pricing map */
export const FEE_TIER_CENTS: Record<FeeTier, number> = {
  standard: 1200,
  deep_clean: 1800,
  specialty: 2500,
};

/** Derive fee tier from service_type string */
export function deriveFeeTier(serviceType: string): FeeTier {
  const lower = (serviceType || '').toLowerCase();
  if (['deep clean', 'deep_clean', 'move-in', 'move-out', 'move_in_out'].some(t => lower.includes(t))) {
    return 'deep_clean';
  }
  // COMMERCIAL_DISABLED: 'commercial' and 'industrial' kept for legacy data compatibility
  if (['commercial', 'specialty', 'industrial', 'post-construction'].some(t => lower.includes(t))) {
    return 'specialty';
  }
  return 'standard';
}
