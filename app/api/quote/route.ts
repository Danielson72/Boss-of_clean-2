export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'api/quote/route' });

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
  logger.info('Starting quote request orchestration', { function: 'POST' });

  try {
    // Parse request body
    const body: QuoteRequest = await request.json();
    logger.info('Request body received', {
      function: 'POST',
      cleaner_id: body.cleaner_id,
      service_type: body.service_type,
    });

    // Validate required fields
    if (!body.cleaner_id || !body.service_type) {
      logger.warn('Validation failed: missing required fields', { function: 'POST' });
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

    // Initialize Supabase client
    const supabase = createClient();

    // Get current user (may be null for guests)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      logger.info('Auth check returned error (non-fatal)', { function: 'POST' });
    }

    const customerId = user?.id || null;
    const isGuest = !customerId;
    logger.info('User status resolved', { function: 'POST', is_guest: isGuest });

    // ============================================
    // STEP 1: Check customer limits (WITHOUT incrementing)
    // ============================================
    logger.info('Step 1: Checking customer limits', { function: 'POST' });

    const { data: limitCheckData, error: limitCheckError } = await supabase.rpc(
      'check_and_increment_customer_limits',
      {
        p_user_id: customerId || null,
        p_ip: ipAddress,
        p_increment: false, // Don't increment yet - wait until quote is actually created
      }
    );

    if (limitCheckError) {
      logger.error('Customer limit check failed', { function: 'POST' }, limitCheckError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    logger.debug('Customer limit check result', { function: 'POST' });

    // Handle limit exceeded (daily or monthly) - function returns array
    const limitResult = Array.isArray(limitCheckData) ? limitCheckData[0] : limitCheckData;

    if (!limitResult.allowed) {
      logger.info('Customer limit exceeded', { function: 'POST', reason: limitResult.reason });

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

    logger.info('Customer limit check passed', { function: 'POST' });

    // ============================================
    // STEP 2: Check cleaner tier limit
    // ============================================
    logger.info('Step 2: Checking cleaner tier limit', { function: 'POST' });

    // First, fetch cleaner details including subscription_tier
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('id, business_name, subscription_tier')
      .eq('id', body.cleaner_id)
      .single();

    if (cleanerError) {
      logger.error('Failed to fetch cleaner', { function: 'POST' }, cleanerError);
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    // Call the tier limit check function (returns boolean)
    const { data: canReceiveQuotes, error: tierError } = await supabase.rpc(
      'check_quote_request_tier_limit',
      { p_cleaner_id: body.cleaner_id }
    );

    if (tierError) {
      logger.error('Tier check error', { function: 'POST' }, tierError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    logger.info('Cleaner tier limit check result', {
      function: 'POST',
      canReceiveQuotes: String(canReceiveQuotes),
      tier: cleaner.subscription_tier,
    });

    // Handle cleaner at monthly cap (function returns boolean)
    if (!canReceiveQuotes) {
      logger.info('Cleaner at monthly cap', { function: 'POST', tier: cleaner.subscription_tier });

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

    logger.info('Cleaner tier limit check passed', { function: 'POST', tier: cleaner.subscription_tier });

    // ============================================
    // STEP 3: Create quote request
    // ============================================
    logger.info('Step 3: Creating quote request', { function: 'POST' });

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
      logger.error('Quote creation failed', { function: 'POST' }, quoteError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const quoteId = quoteData?.quote_id || quoteData;
    const duration = Date.now() - startTime;

    logger.info(`Quote created successfully (${duration}ms)`, { function: 'POST' });

    // ============================================
    // STEP 4: NOW increment the customer limit counter
    // ============================================
    logger.info('Step 4: Incrementing customer limit counter', { function: 'POST' });

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
      logger.error('Failed to increment counter (non-fatal)', { function: 'POST' }, incrementError);
    } else {
      logger.info('Counter incremented successfully', { function: 'POST' });
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

  } catch (error) {
    logger.error('Unexpected error', { function: 'POST' }, error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
