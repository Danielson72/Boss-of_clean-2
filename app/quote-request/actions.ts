'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { sendQuoteConfirmationEmail } from '@/lib/email/notifications';
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
 * Submit a public quote request (no auth required).
 * Creates a marketplace lead with cleaner_id = NULL so all matching pros
 * in the area can see it via /api/leads/available and unlock it.
 */
export async function submitQuoteRequest(
  data: QuoteRequestData
): Promise<QuoteRequestResult> {
  // Rate limit: 5 quote requests per hour per IP
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown';
  const rateLimitResult = await checkRateLimit('quote-request', ip, RATE_LIMITS.quoteRequest);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
    };
  }

  const supabase = await createClient();

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

    // Build property size string from sqft_estimate
    let propertySize: string | null = null;
    if (data.sqft_estimate) {
      propertySize = `${data.sqft_estimate} sqft`;
    }

    // Build description from notes + property details the DB doesn't have dedicated columns for
    const descriptionParts: string[] = [];
    if (data.bedrooms) descriptionParts.push(`${data.bedrooms} bedrooms`);
    if (data.bathrooms) descriptionParts.push(`${data.bathrooms} bathrooms`);
    if (data.flexibility && data.flexibility !== 'flexible') {
      descriptionParts.push(`Scheduling: ${data.flexibility}`);
    }
    if (data.notes) descriptionParts.push(data.notes);
    const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : null;

    // Insert marketplace lead — cleaner_id is intentionally NULL
    const { data: quote, error: insertError } = await supabase
      .from('quote_requests')
      .insert({
        service_type: data.service_type,
        property_type: data.property_type || 'home',
        property_size: propertySize,
        zip_code: data.zip_code,
        city: data.city || '',
        description,
        service_date: data.preferred_date || null,
        address: '',
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone || null,
        status: 'pending',
        // cleaner_id defaults to NULL — this is a marketplace lead
        // customer_id left NULL — guest user, no auth required
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Error inserting quote request', { function: 'submitQuoteRequest' }, insertError);
      return { success: false, error: 'Failed to submit quote request' };
    }

    // Send confirmation email to the customer (fire-and-forget)
    sendQuoteConfirmationEmail({
      to: data.contact_email,
      customerName: data.contact_name,
      quoteId: quote.id,
      matchCount: 0,
    }).catch((err) =>
      logger.error('Error sending confirmation email', { function: 'submitQuoteRequest' }, err)
    );

    return {
      success: true,
      quoteId: quote.id,
      matchCount: 0,
    };
  } catch (error) {
    logger.error('Error in submitQuoteRequest', { function: 'submitQuoteRequest' }, error);
    return { success: false, error: 'An unexpected error occurred' };
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
    created_at: string;
    service_type: string;
    zip_code: string;
    city: string;
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Verify email matches the quote
    const { data: quote, error } = await supabase
      .from('quote_requests')
      .select('id, status, created_at, service_type, zip_code, city')
      .eq('id', quoteId)
      .eq('contact_email', email)
      .single();

    if (error || !quote) {
      return { success: false, error: 'Quote not found or email does not match' };
    }

    return {
      success: true,
      quote: {
        id: quote.id,
        status: quote.status,
        created_at: quote.created_at,
        service_type: quote.service_type,
        zip_code: quote.zip_code,
        city: quote.city,
      },
    };
  } catch (error) {
    logger.error('Error in getQuoteStatus', { function: 'getQuoteStatus' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
