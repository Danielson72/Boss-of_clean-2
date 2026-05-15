import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/service-categories/route' })

export const dynamic = 'force-dynamic'

export type ServiceCategory = {
  slug: string
  display_name: string
  description: string | null
  fee_tier: string
  supports_residential: boolean
  supports_commercial: boolean
  requires_license_fl: boolean
  alias_for: string | null
  priority_order: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('service_categories')
      .select(
        'slug, display_name, description, fee_tier, supports_residential, supports_commercial, requires_license_fl, alias_for, priority_order'
      )
      .eq('is_active', true)
      .order('priority_order', { ascending: true })
      .order('slug', { ascending: true })

    if (error) {
      logger.error('Failed to load service_categories', { function: 'GET' }, error)
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    }

    return NextResponse.json({ categories: (data ?? []) as ServiceCategory[] })
  } catch (error) {
    logger.error('Unhandled error in GET /api/service-categories', { function: 'GET' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
