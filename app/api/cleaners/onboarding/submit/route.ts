import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/cleaners/onboarding/submit/route' })

// POST /api/cleaners/onboarding/submit - Submit onboarding for approval
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // DLD-449: write through the pros table directly.
    const { data: pro, error: fetchError } = await supabase
      .from('pros')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !pro) {
      return NextResponse.json({ error: 'Pro profile not found' }, { status: 404 })
    }

    const requiredFields = ['business_name', 'business_phone', 'business_email']
    const missingFields = requiredFields.filter((field) => !pro[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missing: missingFields,
        },
        { status: 400 }
      )
    }

    if (!pro.primary_category) {
      return NextResponse.json(
        { error: 'Choose your primary service category before submitting' },
        { status: 400 }
      )
    }

    if (!pro.service_areas || pro.service_areas.length === 0) {
      return NextResponse.json({ error: 'At least one service area is required' }, { status: 400 })
    }

    const onboardingData = pro.onboarding_data || {}

    const { error: updateError } = await supabase
      .from('pros')
      .update({
        onboarding_step: 6,
        onboarding_completed_at: new Date().toISOString(),
        approval_status: 'pending',
        ...(onboardingData.profile_image_url && { profile_image_url: onboardingData.profile_image_url }),
        ...(onboardingData.portfolio_images && { business_images: onboardingData.portfolio_images }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pro.id)

    if (updateError) {
      logger.error('Error updating pro', { function: 'POST' }, updateError)
      return NextResponse.json({ error: 'Failed to submit onboarding' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding submitted for approval',
      cleaner_id: pro.id,
    })
  } catch (error) {
    logger.error('Error in POST /api/cleaners/onboarding/submit', { function: 'POST' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
