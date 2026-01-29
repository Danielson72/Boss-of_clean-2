import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'api/cleaners/onboarding/submit/route' })

// POST /api/cleaners/onboarding/submit - Submit onboarding for approval
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cleaner profile
    const { data: cleaner, error: fetchError } = await supabase
      .from('cleaners')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 })
    }

    // Validate required fields
    const requiredFields = ['business_name', 'business_phone', 'business_email']
    const missingFields = requiredFields.filter(field => !cleaner[field])

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields',
        missing: missingFields
      }, { status: 400 })
    }

    // Validate services and service areas
    if (!cleaner.services || cleaner.services.length === 0) {
      return NextResponse.json({ error: 'At least one service is required' }, { status: 400 })
    }

    if (!cleaner.service_areas || cleaner.service_areas.length === 0) {
      return NextResponse.json({ error: 'At least one service area is required' }, { status: 400 })
    }

    // Update cleaner status to submitted
    const { error: updateError } = await supabase
      .from('cleaners')
      .update({
        onboarding_step: 5,
        onboarding_completed_at: new Date().toISOString(),
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', cleaner.id)

    if (updateError) {
      logger.error('Error updating cleaner', { function: 'POST' }, updateError)
      return NextResponse.json({ error: 'Failed to submit onboarding' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding submitted for approval',
      cleaner_id: cleaner.id
    })
  } catch (error) {
    logger.error('Error in POST /api/cleaners/onboarding/submit', { function: 'POST' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
