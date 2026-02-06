'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { sendQuoteMatchEmail, sendNewLeadEmail } from '@/lib/email/notifications';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'quote-request/actions' });

export interface QuoteRequestData {
  service_type: string;
  property_type: 'home' | 'condo' | 'apartment' | 'vacation_rental' | 'office' | 'other';
  sqft_estimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  zip_code: string;
  city?: string;
  preferred_date?: string;
  flexibility?: 'exact' | 'flexible' | 'asap';
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  notes?: string;
}

export interface QuoteRequestResult {
  success: boolean;
  quoteId?: string;
  matchCount?: number;
  error?: string;
}

/**
 * Submit a public quote request (no auth required)
 * This creates the quote request and matches it to eligible cleaners
 */
export async function submitQuoteRequest(
  data: QuoteRequestData
): Promise<QuoteRequestResult> {
  // Rate limit: 5 quote requests per hour per IP
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown';
  const rateLimitResult = checkRateLimit('quote-request', ip, RATE_LIMITS.quoteRequest);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
    };
  }

  const supabase = createClient();

  try {
    // Validate required fields
    if (!data.service_type || !data.zip_code || !data.contact_name || !data.contact_email) {
      return { success: false, error: 'Missing required fields' };
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.contact_email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate zip code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(data.zip_code)) {
      return { success: false, error: 'Invalid zip code format' };
    }

    // Insert quote request
    const { data: quote, error: insertError } = await supabase
      .from('quote_requests')
      .insert({
        service_type: data.service_type,
        property_type: data.property_type || 'home',
        sqft_estimate: data.sqft_estimate,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        zip_code: data.zip_code,
        city: data.city,
        preferred_date: data.preferred_date || null,
        flexibility: data.flexibility || 'flexible',
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        notes: data.notes,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Error inserting quote request', { function: 'submitQuoteRequest' }, insertError);
      return { success: false, error: 'Failed to submit quote request' };
    }

    // Match to cleaners using RPC function
    const { data: matchCount, error: matchError } = await supabase.rpc(
      'match_quote_to_cleaners',
      { p_quote_id: quote.id, p_max_matches: 5 }
    );

    if (matchError) {
      logger.error('Error matching quote to cleaners', { function: 'submitQuoteRequest' }, matchError);
      // Don't fail the request, just log the error
    }

    // Send email notifications to matched cleaners (async, don't block)
    notifyMatchedCleaners(quote.id).catch((err) =>
      logger.error('Error sending cleaner notifications', { function: 'submitQuoteRequest' }, err)
    );

    return {
      success: true,
      quoteId: quote.id,
      matchCount: matchCount || 0,
    };
  } catch (error) {
    logger.error('Error in submitQuoteRequest', { function: 'submitQuoteRequest' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Notify matched cleaners about a new lead
 */
async function notifyMatchedCleaners(quoteId: string): Promise<void> {
  const supabase = createClient();

  // Get quote details and matched cleaners
  const { data: matches } = await supabase
    .from('lead_matches')
    .select(`
      id,
      cleaner_id,
      cleaners (
        id,
        business_name,
        business_email,
        user_id
      )
    `)
    .eq('quote_request_id', quoteId);

  const { data: quote } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (!matches || !quote) return;

  // Send email to each matched cleaner
  for (const match of matches) {
    const cleaner = match.cleaners as unknown as {
      id: string;
      business_name: string;
      business_email: string;
    } | null;

    if (cleaner?.business_email) {
      await sendNewLeadEmail({
        to: cleaner.business_email,
        businessName: cleaner.business_name,
        serviceType: quote.service_type,
        zipCode: quote.zip_code,
        preferredDate: quote.preferred_date,
        leadId: match.id,
      });
    }
  }
}

/**
 * Get quote request status by ID and email (for customer verification)
 */
export async function getQuoteStatus(
  quoteId: string,
  email: string
): Promise<{
  success: boolean;
  quote?: {
    id: string;
    status: string;
    match_count: number;
    response_count: number;
    created_at: string;
    responses: Array<{
      business_name: string;
      quote_amount: number;
      availability_date: string;
      message: string;
      responded_at: string;
    }>;
  };
  error?: string;
}> {
  const supabase = createClient();

  try {
    // Verify email matches the quote
    const { data: quote, error } = await supabase
      .from('quote_requests')
      .select('*')
      .eq('id', quoteId)
      .eq('contact_email', email)
      .single();

    if (error || !quote) {
      return { success: false, error: 'Quote not found or email does not match' };
    }

    // Get responses from cleaners
    const { data: responses } = await supabase
      .from('lead_matches')
      .select(`
        quote_amount,
        availability_date,
        response_message,
        responded_at,
        cleaners (
          business_name
        )
      `)
      .eq('quote_request_id', quoteId)
      .eq('status', 'responded');

    return {
      success: true,
      quote: {
        id: quote.id,
        status: quote.status,
        match_count: quote.match_count,
        response_count: quote.response_count,
        created_at: quote.created_at,
        responses: (responses || []).map((r) => ({
          business_name: (r.cleaners as unknown as { business_name: string } | null)?.business_name || 'Unknown',
          quote_amount: r.quote_amount,
          availability_date: r.availability_date,
          message: r.response_message,
          responded_at: r.responded_at,
        })),
      },
    };
  } catch (error) {
    logger.error('Error in getQuoteStatus', { function: 'getQuoteStatus' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
