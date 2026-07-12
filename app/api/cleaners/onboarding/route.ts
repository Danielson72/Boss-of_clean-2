import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/utils/logger'
import {
  normalizeCategorySlugs,
  reconcileProCategories,
} from '@/lib/services/pro-categories'
import { normalizeToE164 } from '@/lib/phone'

const logger = createLogger({ file: 'api/cleaners/onboarding/route' })

// GET /api/cleaners/onboarding - Get current onboarding draft
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // DLD-449: pros table is the source of truth; the `cleaners` view is
    // legacy backwards-compat from DLD-444.
    const { data: pro, error } = await supabase
      .from('pros')
      .select(
        'id, onboarding_step, onboarding_data, onboarding_completed_at, business_name, business_description, business_phone, business_email, website_url, services, service_areas, hourly_rate, minimum_hours, years_experience, employees_count, profile_image_url, business_images, primary_category'
      )
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching pro', { function: 'GET' }, error)
      return NextResponse.json({ error: 'Failed to fetch onboarding data' }, { status: 500 })
    }

    if (!pro) {
      return NextResponse.json({
        cleaner_id: null,
        onboarding_step: 1,
        onboarding_data: {},
        onboarding_completed_at: null,
      })
    }

    const { data: categoryRows, error: categoriesError } = await supabase
      .from('pro_categories')
      .select('category, is_primary')
      .eq('pro_id', pro.id)

    if (categoriesError) {
      logger.error('Error fetching pro_categories', { function: 'GET' }, categoriesError)
    }

    const secondaryCategories = (categoryRows ?? [])
      .filter((row) => !row.is_primary)
      .map((row) => row.category)

    return NextResponse.json({
      cleaner_id: pro.id,
      onboarding_step: pro.onboarding_step || 1,
      onboarding_data: pro.onboarding_data || {},
      onboarding_completed_at: pro.onboarding_completed_at,
      profile: {
        business_name: pro.business_name,
        business_description: pro.business_description,
        business_phone: pro.business_phone,
        business_email: pro.business_email,
        website_url: pro.website_url,
        services: pro.services,
        service_areas: pro.service_areas,
        hourly_rate: pro.hourly_rate,
        minimum_hours: pro.minimum_hours,
        years_experience: pro.years_experience,
        employees_count: pro.employees_count,
        profile_image_url: pro.profile_image_url,
        portfolio_images: pro.business_images,
        primary_category: pro.primary_category,
        secondary_categories: secondaryCategories,
      },
    })
  } catch (error) {
    logger.error('Error in GET /api/cleaners/onboarding', { function: 'GET' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cleaners/onboarding - Save onboarding draft
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { step, data } = body

    if (!step || step < 1 || step > 6) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    // Store business_phone in E.164 (the SMS layer only sends to E.164). Normalize
    // here so it applies to both the column write and the onboarding_data blob.
    if (data?.business_phone != null && `${data.business_phone}`.trim() !== '') {
      const phoneE164 = normalizeToE164(String(data.business_phone))
      if (!phoneE164) {
        return NextResponse.json(
          { error: 'Please enter a valid US business phone number.' },
          { status: 400 }
        )
      }
      data.business_phone = phoneE164
    }

    // DLD-449: Resolve category slugs against the canonical taxonomy.
    // Unknown slugs are silently dropped so a single bad client value can't
    // break the whole save. Validation happens again at submit time.
    let primaryCategory: string | null | undefined = undefined
    if (data?.primary_category !== undefined) {
      const [canonicalPrimary] = await normalizeCategorySlugs(
        supabase,
        data.primary_category ? [data.primary_category] : []
      )
      primaryCategory = canonicalPrimary ?? null
    }

    let secondaryCategories: string[] | undefined = undefined
    if (Array.isArray(data?.secondary_categories)) {
      secondaryCategories = await normalizeCategorySlugs(
        supabase,
        data.secondary_categories.filter((s: unknown): s is string => typeof s === 'string')
      )
      if (primaryCategory) {
        secondaryCategories = secondaryCategories.filter((s) => s !== primaryCategory)
      }
    }

    const { data: existingPro, error: fetchError } = await supabase
      .from('pros')
      .select('id, onboarding_data, primary_category')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Error fetching pro', { function: 'POST' }, fetchError)
      return NextResponse.json({ error: 'Failed to fetch pro profile' }, { status: 500 })
    }

    let proId: string

    if (existingPro) {
      const mergedData = { ...(existingPro.onboarding_data || {}), ...data }
      const legacyServices: string[] | undefined = primaryCategory && secondaryCategories
        ? [primaryCategory, ...secondaryCategories]
        : Array.isArray(data.services)
          ? data.services
          : undefined

      const updatePayload: Record<string, unknown> = {
        onboarding_step: step,
        onboarding_data: mergedData,
        updated_at: new Date().toISOString(),
      }
      if (data.business_name) updatePayload.business_name = data.business_name
      if (data.business_description) updatePayload.business_description = data.business_description
      if (data.business_phone) updatePayload.business_phone = data.business_phone
      if (data.business_email) updatePayload.business_email = data.business_email
      if (data.website_url !== undefined) updatePayload.website_url = data.website_url
      if (legacyServices) updatePayload.services = legacyServices
      if (data.service_areas) updatePayload.service_areas = data.service_areas
      if (data.hourly_rate) updatePayload.hourly_rate = data.hourly_rate
      if (data.minimum_hours) updatePayload.minimum_hours = data.minimum_hours
      if (data.years_experience !== undefined) updatePayload.years_experience = data.years_experience
      if (data.employees_count) updatePayload.employees_count = data.employees_count
      if (data.profile_image_url) updatePayload.profile_image_url = data.profile_image_url
      if (data.portfolio_images) updatePayload.business_images = data.portfolio_images
      if (primaryCategory !== undefined) updatePayload.primary_category = primaryCategory

      const { error: updateError } = await supabase
        .from('pros')
        .update(updatePayload)
        .eq('id', existingPro.id)

      if (updateError) {
        logger.error('Error updating pro', { function: 'POST' }, updateError)
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
      }

      proId = existingPro.id
    } else {
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        business_name: data.business_name || 'New Business',
        business_email: data.business_email || user.email,
        onboarding_step: step,
        onboarding_data: data,
        approval_status: 'pending',
      }
      if (primaryCategory !== undefined) insertPayload.primary_category = primaryCategory
      if (primaryCategory && secondaryCategories) {
        insertPayload.services = [primaryCategory, ...secondaryCategories]
      } else if (Array.isArray(data.services)) {
        insertPayload.services = data.services
      }

      const { data: newPro, error: insertError } = await supabase
        .from('pros')
        .insert(insertPayload)
        .select('id')
        .single()

      if (insertError || !newPro) {
        logger.error('Error creating pro', { function: 'POST' }, insertError)
        return NextResponse.json({ error: 'Failed to create pro profile' }, { status: 500 })
      }

      proId = newPro.id
    }

    if (primaryCategory !== undefined || secondaryCategories !== undefined) {
      const reconcileResult = await reconcileProCategories(supabase, {
        proId,
        selection: {
          primary: primaryCategory ?? null,
          secondary: secondaryCategories ?? [],
        },
      })
      if (!reconcileResult.ok) {
        return NextResponse.json({ error: reconcileResult.error }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      cleaner_id: proId,
      step,
      message: 'Draft saved successfully',
    })
  } catch (error) {
    logger.error('Error in POST /api/cleaners/onboarding', { function: 'POST' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
