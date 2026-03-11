'use server';

import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendQuoteConfirmationEmail, sendNewLeadEmail } from '@/lib/email/notifications';
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
 * 1. Inserts into quote_requests (marketplace lead, cleaner_id = NULL)
 * 2. Finds approved pros who serve that zip code
 * 3. Sends email + in-app notification to each matched pro
 * 4. Sends confirmation email to the customer
 */
export async function submitQuoteRequest(
  data: QuoteRequestData
): Promise<QuoteRequestResult> {
  // Rate limit: 10 quote requests per minute per IP
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

  // Use service-role client to bypass RLS (this is a public form, no auth)
  const supabase = createServiceRoleClient();

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

    // Build property size string
    let propertySize: string | null = null;
    if (data.sqft_estimate) {
      propertySize = `${data.sqft_estimate} sqft`;
    }

    // Build description from details
    const descriptionParts: string[] = [];
    if (data.bedrooms) descriptionParts.push(`${data.bedrooms} bedrooms`);
    if (data.bathrooms) descriptionParts.push(`${data.bathrooms} bathrooms`);
    if (data.flexibility && data.flexibility !== 'flexible') {
      descriptionParts.push(`Scheduling: ${data.flexibility}`);
    }
    if (data.notes) descriptionParts.push(data.notes);
    const description = descriptionParts.length > 0 ? descriptionParts.join(' | ') : null;

    // ============================================
    // STEP 1: Insert marketplace lead (cleaner_id = NULL)
    // ============================================
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
      })
      .select('id')
      .single();

    if (insertError) {
      logger.error('Error inserting quote request', { function: 'submitQuoteRequest' }, insertError);
      return { success: false, error: 'Failed to submit quote request' };
    }

    logger.info('Quote request created', { function: 'submitQuoteRequest', quoteId: quote.id });

    // ============================================
    // STEP 2: Find matching approved pros
    // ============================================
    // Match by: approved cleaners whose service_areas include this zip code
    // Fallback: if no service_areas match, try cleaners whose user zip matches
    let matchedPros: { cleaner_id: string; user_id: string; email: string; business_name: string }[] = [];

    try {
      // Primary match: service_areas table
      const { data: areaMatches } = await supabase
        .from('service_areas')
        .select('cleaner_id, cleaner:cleaners!inner(id, business_name, user_id, approval_status, user:users!inner(email))')
        .eq('zip_code', data.zip_code);

      if (areaMatches && areaMatches.length > 0) {
        matchedPros = areaMatches
          .filter((m) => {
            const cleaner = m.cleaner as Record<string, unknown>;
            return cleaner?.approval_status === 'approved';
          })
          .map((m) => {
            const cleaner = m.cleaner as Record<string, unknown>;
            const user = cleaner.user as Record<string, unknown>;
            return {
              cleaner_id: cleaner.id as string,
              user_id: cleaner.user_id as string,
              email: user.email as string,
              business_name: cleaner.business_name as string,
            };
          });
      }

      // Fallback: if no service_areas match, find all approved cleaners
      // (early stage — not many pros have set up service areas yet)
      if (matchedPros.length === 0) {
        const { data: allApproved } = await supabase
          .from('cleaners')
          .select('id, business_name, user_id, user:users!inner(email)')
          .eq('approval_status', 'approved');

        if (allApproved && allApproved.length > 0) {
          matchedPros = allApproved.map((c) => {
            const user = c.user as Record<string, unknown>;
            return {
              cleaner_id: c.id,
              user_id: c.user_id,
              email: user.email as string,
              business_name: c.business_name,
            };
          });
        }
      }

      logger.info('Pro matching complete', {
        function: 'submitQuoteRequest',
        matchCount: matchedPros.length,
        quoteId: quote.id,
      });
    } catch (matchErr) {
      logger.error('Error matching pros', { function: 'submitQuoteRequest' }, matchErr);
      // Non-fatal — the quote is already created
    }

    // ============================================
    // STEP 3: Notify matched pros (email + in-app)
    // ============================================
    const location = data.city ? `${data.city}, ${data.zip_code}` : data.zip_code;

    for (const pro of matchedPros) {
      // In-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: pro.user_id,
          type: 'new_lead',
          title: 'New Quote Request!',
          message: `A customer in ${location} is looking for ${data.service_type.replace(/_/g, ' ')} service.`,
          action_url: '/dashboard/pro/quote-requests',
        });
      } catch (notifErr) {
        logger.error('Failed to create pro notification', { function: 'submitQuoteRequest', userId: pro.user_id }, notifErr);
      }

      // Email notification (fire-and-forget)
      sendNewLeadEmail({
        to: pro.email,
        businessName: pro.business_name,
        serviceType: data.service_type,
        zipCode: data.zip_code,
        preferredDate: data.preferred_date,
        leadId: quote.id,
      }).catch((err) =>
        logger.error('Failed to send pro email', { function: 'submitQuoteRequest', email: pro.email }, err)
      );
    }

    // ============================================
    // STEP 4: Send confirmation email to customer
    // ============================================
    sendQuoteConfirmationEmail({
      to: data.contact_email,
      customerName: data.contact_name,
      quoteId: quote.id,
      matchCount: matchedPros.length,
    }).catch((err) =>
      logger.error('Error sending confirmation email', { function: 'submitQuoteRequest' }, err)
    );

    return {
      success: true,
      quoteId: quote.id,
      matchCount: matchedPros.length,
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
  const supabase = createServiceRoleClient();

  try {
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
