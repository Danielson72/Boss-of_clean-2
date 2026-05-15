// DLD-449 — canonical service category shape served by /api/service-categories.

export interface ServiceCategory {
  slug: string
  display_name: string
  description: string | null
  fee_tier: 'standard' | 'deep_clean' | 'specialty' | string
  supports_residential: boolean
  supports_commercial: boolean
  requires_license_fl: boolean
  alias_for: string | null
  priority_order: number
}
