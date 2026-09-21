'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendQuoteConfirmationEmail, sendNewLeadEmailWithResult } from '@/lib/email/notifications';
import { sendAdminOpsAlert } from '@/lib/email/lead-unlock';
import { notifyProNewLead, sendSMSIfEnabled } from '@/lib/sms/notifications';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { submitQuoteRequestCore, type QuoteRequestData, type QuoteRequestResult } from './submit-core';
import { guardPublicSubmission } from '@/lib/security/submission-guard';

export type { QuoteRequestData, QuoteRequestResult } from './submit-core';

/**
 * Submit an authenticated marketplace quote request.
 * Customer identity is resolved from the session — contact info is NEVER trusted from the body.
 * 1. Inserts into quote_requests with customer_id (cleaner_id = NULL, no contact_* PII denormalized)
 * 2. Finds approved pros who serve that zip code (service-role for cross-customer match)
 * 3. Sends email + in-app notification to each matched pro, logged in notification_logs
 * 4. Sends confirmation email to the customer (email pulled from users row at send time)
 *
 * The body lives in ./submit-core.ts with all effects injected; this wrapper
 * supplies the real Next/Supabase/Resend dependencies.
 */
export async function submitQuoteRequest(
  data: QuoteRequestData
): Promise<QuoteRequestResult> {
  // Rate limit: 10 quote requests per minute per IP
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headersList.get('x-real-ip') || 'unknown';
  const guard = await guardPublicSubmission(
    data.website,
    () => checkRateLimit('quote-request', ip, RATE_LIMITS.quoteRequest),
  );
  if (guard.silentlyDrop) {
    return { success: true };
  }
  if (!guard.allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${guard.retryAfter || 60} seconds.`,
    };
  }

  // Auth-scoped client (cookie-based) — required so RLS binds to the customer
  const supabase = await createClient();

  // Service-role client for cross-customer reads (matching pros to a zip code)
  // and cross-user writes (notifications, notification_logs).
  const adminSupabase = createServiceRoleClient();

  return submitQuoteRequestCore({
    ...data,
    tcpa_user_agent: headersList.get('user-agent') || 'unknown',
  }, {
    ip,
    supabase,
    adminSupabase,
    sendNewLeadEmail: sendNewLeadEmailWithResult,
    sendQuoteConfirmationEmail,
    sendAdminOpsAlert,
    notifyProBySms: (pro, lead) =>
      sendSMSIfEnabled(() =>
        notifyProNewLead(pro.user_id, pro.business_phone as string, 'A customer', lead.serviceType, lead.zipCode)
      ),
  });
}
