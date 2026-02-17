export const runtime = 'nodejs';

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface QuoteRequest {
  cleaner_id: string;
  service_type: string;
  service_date?: string;
  service_time?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  description?: string;
  special_requests?: string;
  property_type?: string;
  property_size?: string;
  frequency?: string;
  duration_hours?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

/**
 * POST /api/quote
 *
 * Orchestrates quote request creation through 3 Supabase RPCs:
 * 1. check_and_increment_customer_limits (guests: 3/day, 10/mo; verified: unlimited)
 * 2. check_quote_request_tier_limit (cleaner tier caps: 1/10/25/∞)
 * 3. create_quote_request (insert + return quote_id)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[QUOTE] Starting quote request orchestration');

  try {
    // Parse request body
    const body: QuoteRequest = await request.json();
    console.log('[QUOTE] Request body received:', {
      cleaner_id: body.cleaner_id,
      service_type: body.service_type,
      has_customer_email: !!body.customer_email,
      has_customer_phone: !!body.customer_phone,
    });

    // Validate required fields
    if (!body.cleaner_id || !body.service_type) {
      console.log('[QUOTE] Validation failed: missing required fields');
      return NextResponse.json(
        {
          error: 'validation_error',
          detail: 'cleaner_id and service_type are required fields',
        },
        { status: 400 }
      );
    }

    // Extract IP address for guest tracking
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1';
    console.log('[QUOTE] Client IP:', ipAddress);

    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user (may be null for guests)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.log('[QUOTE] Auth check error (non-fatal):', authError.message);
    }

    const customerId = user?.id || null;
    const isGuest = !customerId;
    console.log('[QUOTE] User status:', {
      is_guest: isGuest,
      customer_id: customerId,
      email_verified: user?.email_confirmed_at ? true : false,
    });

    // ============================================
    // STEP 1: Check customer limits (WITHOUT incrementing)
    // ============================================
    console.log('[QUOTE] Step 1: Checking customer limits...');

    const { data: limitCheckData, error: limitCheckError } = await supabase.rpc(
      'check_and_increment_customer_limits',
      {
        p_user_id: customerId || null,
        p_ip: ipAddress,
        p_increment: false, // Don't increment yet - wait until quote is actually created
      }
    );

    if (limitCheckError) {
      console.error('[QUOTE] Customer limit check failed:', limitCheckError);
      return NextResponse.json(
        {
          error: 'limit_check_failed',
          detail: limitCheckError.message,
        },
        { status: 500 }
      );
    }

    console.log('[QUOTE] Customer limit check result:', limitCheckData);

    // Handle limit exceeded (daily or monthly) - function returns array
    const limitResult = Array.isArray(limitCheckData) ? limitCheckData[0] : limitCheckData;

    if (!limitResult.allowed) {
      console.log('[QUOTE] Customer limit exceeded:', {
        reason: limitResult.reason,
        daily_count: limitResult.daily,
        monthly_count: limitResult.monthly,
      });

      // Determine recommended action
      let action: string;
      if (isGuest) {
        action = 'signup_for_unlimited';
      } else if (user && !user.email_confirmed_at) {
        action = 'verify_email_for_unlimited';
      } else {
        action = 'contact_support';
      }

      return NextResponse.json(
        {
          error: 'customer_limit_reached',
          reason: limitResult.reason,
          daily: limitResult.daily,
          monthly: limitResult.monthly,
          action,
        },
        { status: 429 }
      );
    }

    console.log('[QUOTE] Customer limit check passed:', {
      daily_count: limitResult.daily,
      monthly_count: limitResult.monthly,
    });

    // ============================================
    // STEP 2: Check cleaner tier limit
    // ============================================
    console.log('[QUOTE] Step 2: Checking cleaner tier limit...');

    // First, fetch cleaner details including subscription_tier
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, business_name, subscription_tier')
      .eq('id', body.cleaner_id)
      .single();

    if (cleanerError) {
      console.error('[QUOTE] Failed to fetch cleaner:', cleanerError);
      return NextResponse.json(
        {
          error: 'cleaner_not_found',
          detail: cleanerError.message,
        },
        { status: 404 }
      );
    }

    // Call the tier limit check function (returns boolean)
    const { data: canReceiveQuotes, error: tierError } = await supabase.rpc(
      'check_quote_request_tier_limit',
      { p_cleaner_id: body.cleaner_id }
    );

    if (tierError) {
      console.error('[QUOTE] Tier check error:', tierError);
      return NextResponse.json(
        {
          error: 'tier_check_failed',
          detail: tierError.message,
        },
        { status: 500 }
      );
    }

    console.log('[QUOTE] Cleaner tier limit check result:', {
      canReceiveQuotes,
      tier: cleaner.subscription_tier,
      cleanerId: body.cleaner_id,
      businessName: cleaner.business_name,
    });

    // Handle cleaner at monthly cap (function returns boolean)
    if (!canReceiveQuotes) {
      console.log('[QUOTE] Cleaner at monthly cap:', {
        tier: cleaner.subscription_tier,
        business_name: cleaner.business_name,
      });

      return NextResponse.json(
        {
          error: 'cleaner_at_monthly_cap',
          message: `This professional has reached their monthly quote limit (${cleaner.subscription_tier} tier). Please try another professional or contact them directly.`,
          tier: cleaner.subscription_tier,
          upgradeHint: true,
        },
        { status: 429 }
      );
    }

    console.log('[QUOTE] Cleaner tier limit check passed:', {
      tier: cleaner.subscription_tier,
      business_name: cleaner.business_name,
    });

    // ============================================
    // STEP 3: Create quote request
    // ============================================
    console.log('[QUOTE] Step 3: Creating quote request...');

    const { data: quoteData, error: quoteError } = await supabase.rpc(
      'create_quote_request',
      {
        p_customer_id: customerId,
        p_cleaner_id: body.cleaner_id,
        p_service_type: body.service_type,
        p_service_date: body.service_date || null,
        p_service_time: body.service_time || null,
        p_address: body.address || null,
        p_city: body.city || null,
        p_zip_code: body.zip_code || null,
        p_description: body.description || null,
        p_special_requests: body.special_requests || null,
        p_property_type: body.property_type || null,
        p_property_size: body.property_size || null,
        p_frequency: body.frequency || null,
        p_duration_hours: body.duration_hours || null,
        // Removed: p_customer_name, p_customer_email, p_customer_phone, p_ip_address
        // These are not expected by the create_quote_request function
      }
    );

    if (quoteError) {
      console.error('[QUOTE] Quote creation failed:', quoteError);
      return NextResponse.json(
        {
          error: 'quote_create_failed',
          detail: quoteError.message,
        },
        { status: 500 }
      );
    }

    const quoteId = quoteData?.quote_id || quoteData;
    const duration = Date.now() - startTime;

    console.log(`[QUOTE] Quote created successfully: ${quoteId} (${duration}ms)`);

    // ============================================
    // STEP 4: NOW increment the customer limit counter
    // ============================================
    console.log('[QUOTE] Step 4: Incrementing customer limit counter...');

    const { error: incrementError } = await supabase.rpc(
      'check_and_increment_customer_limits',
      {
        p_user_id: customerId || null,
        p_ip: ipAddress,
        p_increment: true, // NOW we increment after successful quote creation
      }
    );

    if (incrementError) {
      // Log but don't fail the request - quote was already created
      console.error('[QUOTE] Failed to increment counter (non-fatal):', incrementError);
    } else {
      console.log('[QUOTE] Counter incremented successfully');
    }

    // ============================================
    // SUCCESS RESPONSE
    // ============================================
    return NextResponse.json(
      {
        success: true,
        quoteId,
        message: 'Quote request sent successfully!',
      },
      { status: 201 }
    );

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[QUOTE] Unexpected error:', error);
    console.error('[QUOTE] Error stack:', error.stack);

    return NextResponse.json(
      {
        error: 'internal_error',
        detail: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
