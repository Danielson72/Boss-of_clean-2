import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/cleaners/onboarding/route' })

// GET /api/cleaners/onboarding - Get current onboarding draft
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cleaner profile with onboarding data
    const { data: cleaner, error } = await supabase
      .from('cleaners')
      .select('id, onboarding_step, onboarding_data, onboarding_completed_at, business_name, business_description, business_phone, business_email, website_url, services, service_areas, hourly_rate, minimum_hours, years_experience, employees_count')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Error fetching cleaner', { function: 'GET' }, error)
      return NextResponse.json({ error: 'Failed to fetch onboarding data' }, { status: 500 })
    }

    // If no cleaner profile exists, return empty state
    if (!cleaner) {
      return NextResponse.json({
        cleaner_id: null,
        onboarding_step: 1,
        onboarding_data: {},
        onboarding_completed_at: null
      })
    }

    return NextResponse.json({
      cleaner_id: cleaner.id,
      onboarding_step: cleaner.onboarding_step || 1,
      onboarding_data: cleaner.onboarding_data || {},
      onboarding_completed_at: cleaner.onboarding_completed_at,
      // Include existing profile data for pre-filling
      profile: {
        business_name: cleaner.business_name,
        business_description: cleaner.business_description,
        business_phone: cleaner.business_phone,
        business_email: cleaner.business_email,
        website_url: cleaner.website_url,
        services: cleaner.services,
        service_areas: cleaner.service_areas,
        hourly_rate: cleaner.hourly_rate,
        minimum_hours: cleaner.minimum_hours,
        years_experience: cleaner.years_experience,
        employees_count: cleaner.employees_count
      }
    })
  } catch (error) {
    logger.error('Error in GET /api/cleaners/onboarding', { function: 'GET' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/cleaners/onboarding - Save onboarding draft
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { step, data } = body

    if (!step || step < 1 || step > 5) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    // Check if cleaner profile exists
    const { data: existingCleaner, error: fetchError } = await supabase
      .from('cleaners')
      .select('id, onboarding_data')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('Error fetching cleaner', { function: 'POST' }, fetchError)
      return NextResponse.json({ error: 'Failed to fetch cleaner profile' }, { status: 500 })
    }

    let cleanerId: string

    if (existingCleaner) {
      // Update existing cleaner
      const mergedData = { ...(existingCleaner.onboarding_data || {}), ...data }

      const { error: updateError } = await supabase
        .from('cleaners')
        .update({
          onboarding_step: step,
          onboarding_data: mergedData,
          // Update main profile fields if provided
          ...(data.business_name && { business_name: data.business_name }),
          ...(data.business_description && { business_description: data.business_description }),
          ...(data.business_phone && { business_phone: data.business_phone }),
          ...(data.business_email && { business_email: data.business_email }),
          ...(data.website_url !== undefined && { website_url: data.website_url }),
          ...(data.services && { services: data.services }),
          ...(data.service_areas && { service_areas: data.service_areas }),
          ...(data.hourly_rate && { hourly_rate: data.hourly_rate }),
          ...(data.minimum_hours && { minimum_hours: data.minimum_hours }),
          ...(data.years_experience !== undefined && { years_experience: data.years_experience }),
          ...(data.employees_count && { employees_count: data.employees_count }),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCleaner.id)

      if (updateError) {
        logger.error('Error updating cleaner', { function: 'POST' }, updateError)
        return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
      }

      cleanerId = existingCleaner.id
    } else {
      // Create new cleaner profile
      const { data: newCleaner, error: insertError } = await supabase
        .from('cleaners')
        .insert({
          user_id: user.id,
          business_name: data.business_name || 'New Business',
          business_email: data.business_email || user.email,
          onboarding_step: step,
          onboarding_data: data,
          approval_status: 'pending'
        })
        .select('id')
        .single()

      if (insertError) {
        logger.error('Error creating cleaner', { function: 'POST' }, insertError)
        return NextResponse.json({ error: 'Failed to create cleaner profile' }, { status: 500 })
      }

      cleanerId = newCleaner.id
    }

    return NextResponse.json({
      success: true,
      cleaner_id: cleanerId,
      step: step,
      message: 'Draft saved successfully'
    })
  } catch (error) {
    logger.error('Error in POST /api/cleaners/onboarding', { function: 'POST' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
