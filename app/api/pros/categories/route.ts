import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import {
  normalizeCategorySlugs,
  reconcileProCategories,
} from '@/lib/services/pro-categories'

const logger = createLogger({ file: 'api/pros/categories/route' })

// GET /api/pros/categories — return the signed-in pro's current selection.
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pro, error: proError } = await supabase
      .from('pros')
      .select('id, primary_category')
      .eq('user_id', user.id)
      .single()

    if (proError || !pro) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 })
    }

    const { data: rows } = await supabase
      .from('pro_categories')
      .select('category, is_primary')
      .eq('pro_id', pro.id)

    const secondary = (rows ?? [])
      .filter((r) => !r.is_primary)
      .map((r) => r.category)

    return NextResponse.json({
      primary_category: pro.primary_category,
      secondary_categories: secondary,
    })
  } catch (error) {
    logger.error('Error in GET /api/pros/categories', { function: 'GET' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/pros/categories — replace the pro's category selection.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as {
      primary_category?: string | null
      secondary_categories?: unknown
    }

    const { data: pro, error: proError } = await supabase
      .from('pros')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (proError || !pro) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 })
    }

    const [canonicalPrimary] = await normalizeCategorySlugs(
      supabase,
      body.primary_category ? [body.primary_category] : []
    )
    const primary = canonicalPrimary ?? null

    const rawSecondary = Array.isArray(body.secondary_categories)
      ? body.secondary_categories.filter((s): s is string => typeof s === 'string')
      : []
    const secondary = (await normalizeCategorySlugs(supabase, rawSecondary)).filter(
      (s) => s !== primary
    )

    const { error: updateError } = await supabase
      .from('pros')
      .update({
        primary_category: primary,
        services: primary ? [primary, ...secondary] : secondary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pro.id)

    if (updateError) {
      logger.error('Failed to update pros.primary_category', { proId: pro.id }, updateError)
      return NextResponse.json({ error: 'Failed to save categories' }, { status: 500 })
    }

    const reconcile = await reconcileProCategories(supabase, {
      proId: pro.id,
      selection: { primary, secondary },
    })
    if (!reconcile.ok) {
      return NextResponse.json({ error: reconcile.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      primary_category: primary,
      secondary_categories: secondary,
    })
  } catch (error) {
    logger.error('Error in PATCH /api/pros/categories', { function: 'PATCH' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
