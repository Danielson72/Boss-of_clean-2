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

    // The approval trigger (enforce_cleaner_location_complete) refuses to
    // approve a pro whose public.users row has a blank city or zip_code. The
    // wizard only collects ZIPs into pros.service_areas, so derive the user's
    // location from the first service area. Fill each column only if it is
    // blank; never overwrite a value the pro entered themselves.
    const { data: userRow, error: userFetchError } = await supabase
      .from('users')
      .select('city, zip_code')
      .eq('id', user.id)
      .single()

    if (userFetchError || !userRow) {
      logger.error('Error fetching user location', { function: 'POST' }, userFetchError)
      return NextResponse.json({ error: 'Failed to submit onboarding' }, { status: 500 })
    }

    const isBlank = (v: unknown) => typeof v !== 'string' || v.trim() === ''
    const needsCity = isBlank(userRow.city)
    const needsZip = isBlank(userRow.zip_code)
    // Only the columns this submit actually wrote, plus the ZIP they came from.
    let resolvedLocation: { city?: string; zip_code?: string; from_service_area: string } | null = null

    if (needsCity || needsZip) {
      const primaryZip = String(pro.service_areas[0]).trim()
      const { data: zipRow, error: zipError } = await supabase
        .from('florida_zipcodes')
        .select('zip_code, city')
        .eq('zip_code', primaryZip)
        .maybeSingle()

      if (zipError) {
        logger.error('Error resolving service area ZIP', { function: 'POST', zip: primaryZip }, zipError)
        return NextResponse.json({ error: 'Failed to submit onboarding' }, { status: 500 })
      }

      if (!zipRow) {
        // Stop here: nothing on pros is written on this path.
        return NextResponse.json(
          {
            error: `Your first service area ZIP (${primaryZip}) is not a Florida ZIP we recognize. Update your service areas and try again.`,
            zip: primaryZip,
          },
          { status: 400 }
        )
      }

      const locationUpdate: { city?: string; zip_code?: string; updated_at: string } = {
        updated_at: new Date().toISOString(),
      }
      if (needsCity) locationUpdate.city = zipRow.city
      if (needsZip) locationUpdate.zip_code = zipRow.zip_code

      const { error: locationError } = await supabase
        .from('users')
        .update(locationUpdate)
        .eq('id', user.id)

      if (locationError) {
        logger.error('Error writing user location', { function: 'POST' }, locationError)
        return NextResponse.json({ error: 'Failed to submit onboarding' }, { status: 500 })
      }

      resolvedLocation = {
        ...(needsCity && { city: zipRow.city }),
        ...(needsZip && { zip_code: zipRow.zip_code }),
        from_service_area: primaryZip,
      }
      logger.info('Filled user location from first service area', {
        function: 'POST',
        pro_id: pro.id,
        ...resolvedLocation,
      })
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
      // Present only when this submit filled a blank users.city / zip_code.
      ...(resolvedLocation && { location_filled: resolvedLocation }),
    })
  } catch (error) {
    logger.error('Error in POST /api/cleaners/onboarding/submit', { function: 'POST' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
