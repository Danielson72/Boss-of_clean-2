import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuoteConfirmationEmailData } from '@/lib/email/notifications';
import type { SendEmailResult } from '@/lib/email/resend';
import { dispatchNewLeadToPro, type SendNewLeadEmailFn } from '@/lib/notifications/new-lead';
import { createLogger } from '@/lib/utils/logger';

// Body of the submitQuoteRequest server action with every external effect
// injected, so it can run in a plain Node test with fake Supabase clients and
// a mocked Resend. app/quote-request/actions.ts is the thin 'use server'
// wrapper that supplies the real dependencies. No Next.js imports here.

const logger = createLogger({ file: 'quote-request/submit-core' });

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
  notes?: string;
  is_commercial?: boolean;
  tcpa_user_agent?: string;
  website?: string;
}

export interface QuoteRequestResult {
  success: boolean;
  quoteId?: string;
  matchCount?: number;
  error?: string;
}

export interface MatchedPro {
  cleaner_id: string;
  user_id: string;
  email: string;
  business_name: string;
  business_phone: string | null;
  email_opted_in: boolean;
}

export interface OpsAlert {
  title: string;
  summary: string;
  details: { label: string; value: string }[];
}

export interface SubmitQuoteDeps {
  /** Caller IP (from request headers) — stored as TCPA consent evidence. */
  ip: string;
  /** Cookie-bound client: RLS binds the insert to the signed-in customer. */
  supabase: SupabaseClient;
  /** Service-role client: cross-customer pro matching + cross-user writes. */
  adminSupabase: SupabaseClient;
  sendNewLeadEmail: SendNewLeadEmailFn;
  sendQuoteConfirmationEmail: (data: QuoteConfirmationEmailData) => Promise<SendEmailResult | boolean>;
  sendAdminOpsAlert: (alert: OpsAlert) => Promise<unknown>;
  /** Consent-gated SMS per pro. Left exactly as before (fire-and-forget). */
  notifyProBySms: (pro: MatchedPro, lead: { serviceType: string; zipCode: string }) => Promise<unknown>;
}

export async function submitQuoteRequestCore(
  data: QuoteRequestData,
  deps: SubmitQuoteDeps
): Promise<QuoteRequestResult> {
  const { ip, supabase, adminSupabase } = deps;

  try {
    // Resolve the customer from the session — never trust the request body for PII
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be signed in to request a quote.' };
    }

    // Pull canonical contact info from the users table (read-time JOIN target,
    // never denormalized into the quote row)
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single();

    if (customerError || !customer?.email) {
      logger.error('Failed to resolve customer for quote request', { function: 'submitQuoteRequest', userId: user.id }, customerError);
      return { success: false, error: 'Could not resolve your account info. Please refresh and try again.' };
    }

    // Validate required fields (no contact_* required — those come from the session)
    if (!data.service_type || !data.zip_code) {
      return { success: false, error: 'Missing required fields' };
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
    // STEP 1: Insert marketplace lead (cleaner_id = NULL, no contact_* PII)
    // ============================================
    // RLS policy quote_requests_customers_insert_own enforces customer_id = auth.uid().
    const now = new Date().toISOString();
    const { data: quote, error: insertError } = await supabase
      .from('quote_requests')
      .insert({
        customer_id: user.id,
        service_type: data.service_type,
        property_type: data.property_type || 'home',
        property_size: propertySize,
        zip_code: data.zip_code,
        city: data.city || '',
        description,
        service_date: data.preferred_date || null,
        address: '',
        status: 'pending',
        is_commercial: data.is_commercial === true,
        tcpa_consent_at: now,
        tcpa_consent_ip: ip,
        tcpa_consent_ua: data.tcpa_user_agent ? data.tcpa_user_agent.slice(0, 512) : null,
      })
      .select('id')
      .single();

    if (insertError || !quote) {
      logger.error('Error inserting quote request', { function: 'submitQuoteRequest' }, insertError);
      return { success: false, error: 'Failed to submit quote request' };
    }

    logger.info('Quote request created', { function: 'submitQuoteRequest', quoteId: quote.id });

    // ============================================
    // STEP 2: Find matching approved pros
    // ============================================
    // Match by: approved pros whose pros.service_areas array covers this zip.
    // DLD-599: pros.service_areas text[] is the canonical store. The former
    // public.service_areas table is retired — it never had a writer, so this
    // query always returned zero rows and every broadcast silently fell
    // through to the all-approved fallback below.
    let matchedPros: MatchedPro[] = [];
    let matchStrategy: 'geo' | 'fallback' = 'geo';

    const toMatched = (rows: Record<string, unknown>[]): MatchedPro[] =>
      rows.map((c) => {
        const u = c.user as Record<string, unknown>;
        return {
          cleaner_id: c.id as string,
          user_id: c.user_id as string,
          email: u.email as string,
          business_name: c.business_name as string,
          email_opted_in: c.email_opted_in === true,
          business_phone: (c.business_phone as string) ?? null,
        };
      });

    try {
      // Primary match: pros.service_areas (service-role: cross-customer read).
      // Uses the idx_cleaners_service_areas_gin GIN index on pros.service_areas.
      const { data: areaMatches } = await adminSupabase
        .from('pros')
        .select('id, business_name, user_id, business_phone, email_opted_in, user:users!inner(email)')
        .contains('service_areas', [data.zip_code])
        .eq('approval_status', 'approved');

      if (areaMatches && areaMatches.length > 0) {
        matchedPros = toMatched(areaMatches as Record<string, unknown>[]);
      }

      // Fallback: no pro covers this zip — broadcast to all approved pros.
      // (early stage — coverage is sparse, so a geo miss must not mean the
      // customer hears from nobody). Retire this once the geo/fallback ratio
      // logged below shows coverage is dense enough.
      if (matchedPros.length === 0) {
        matchStrategy = 'fallback';
        const { data: allApproved } = await adminSupabase
          .from('pros')
          .select('id, business_name, user_id, business_phone, email_opted_in, user:users!inner(email)')
          .eq('approval_status', 'approved');

        if (allApproved && allApproved.length > 0) {
          matchedPros = toMatched(allApproved as Record<string, unknown>[]);
        }
      }

      // matchStrategy distinguishes a real geo match from a blind all-approved
      // broadcast. Track the ratio to decide when the fallback can be retired.
      logger.info('Pro matching complete', {
        function: 'submitQuoteRequest',
        matchStrategy,
        zipCode: data.zip_code,
        matchCount: matchedPros.length,
        quoteId: quote.id,
      });
      // Reaching zero here is NOT a per-ZIP coverage gap — the fallback above
      // already broadcasts to every approved pro regardless of ZIP. So this is
      // only reachable when the platform-wide approved-pro list came back
      // empty, which means either there are no approved pros at all, or one of
      // the two reads above failed (both discard their error, so a failed read
      // is indistinguishable from an empty result here). Either way the quote
      // reached nobody. Fires only when the fallback also came back empty,
      // never on a normal fallback that did find pros.
      if (matchedPros.length === 0) {
        logger.error('No approved pros available platform-wide — quote reached nobody', {
          function: 'submitQuoteRequest',
          quoteId: quote.id,
          zipCode: data.zip_code,
        });
        // Awaited (Netlify freezes the function after the response; an
        // un-awaited promise never completes). Alerting must never fail the
        // submission, so errors are caught here.
        await deps
          .sendAdminOpsAlert({
            title: 'No approved pros available platform-wide',
            summary:
              'A quote request was created, but the all-approved pro broadcast returned nobody, so no pro was notified. This is not a ZIP coverage gap — the fallback ignores ZIP. It means the platform currently has no approved pros, or the pro lookup failed. The customer is waiting on a response that will not arrive.',
            details: [
              { label: 'Quote request', value: quote.id },
              { label: 'ZIP', value: data.zip_code },
              { label: 'Service', value: data.service_type },
              { label: 'Pros selected', value: '0 (geo match and all-approved fallback both empty)' },
            ],
          })
          .catch((err) => logger.error('Zero-match ops alert failed', { function: 'submitQuoteRequest' }, err));
      }
    } catch (matchErr) {
      logger.error('Error matching pros', { function: 'submitQuoteRequest' }, matchErr);
      // Non-fatal — the quote is already created
      await deps
        .sendAdminOpsAlert({
          title: 'Pro matcher failed',
          summary:
            'The pro matcher threw while selecting pros for a new quote request. The quote was saved, but no pro was notified.',
          details: [
            { label: 'Quote request', value: quote.id },
            { label: 'ZIP', value: data.zip_code },
            { label: 'Service', value: data.service_type },
            {
              label: 'Error',
              value: matchErr instanceof Error ? matchErr.message : String(matchErr),
            },
          ],
        })
        .catch((err) => logger.error('Matcher-failure ops alert failed', { function: 'submitQuoteRequest' }, err));
    }

    // ============================================
    // STEP 3: Notify matched pros (in-app + email, logged) — AWAITED
    // ============================================
    // Previously the email was fire-and-forget. On Netlify the function is
    // frozen once the response is sent, so the send never completed and no
    // notification_logs row was ever written. Every pro is now dispatched and
    // awaited before we return; the response is a few hundred ms slower and
    // the pro actually gets the email.
    const leadCtx = {
      quoteId: quote.id as string,
      serviceType: data.service_type,
      zipCode: data.zip_code,
      city: data.city ?? null,
      preferredDate: data.preferred_date ?? null,
    };

    const outcomes = await Promise.allSettled(
      matchedPros.map((pro) =>
        dispatchNewLeadToPro(pro, leadCtx, {
          admin: adminSupabase,
          sendNewLeadEmail: deps.sendNewLeadEmail,
        })
      )
    );
    outcomes.forEach((o, i) => {
      if (o.status === 'fulfilled') {
        logger.info('Pro notification dispatch complete', { function: 'submitQuoteRequest', ...o.value });
      } else {
        logger.error('dispatchNewLeadToPro threw', { function: 'submitQuoteRequest', userId: matchedPros[i]?.user_id }, o.reason);
      }
    });

    // SMS notification (consent-gated). Unchanged behavior: routes through the
    // #89 consent gate inside notifyProNewLead — no consent record → no text.
    // Customer name is withheld pre-acceptance (PII). Kept fire-and-forget on
    // purpose (not in scope to change SMS); errors are logged only.
    for (const pro of matchedPros) {
      if (pro.business_phone) {
        deps
          .notifyProBySms(pro, { serviceType: data.service_type, zipCode: data.zip_code })
          .catch((err) => logger.error('Pro new-lead SMS error', { function: 'submitQuoteRequest', userId: pro.user_id }, err));
      }
    }

    // ============================================
    // STEP 4: Confirmation email to customer (info pulled from session, not body) — AWAITED
    // ============================================
    try {
      await deps.sendQuoteConfirmationEmail({
        to: customer.email,
        customerName: customer.full_name || 'Customer',
        quoteId: quote.id,
        matchCount: matchedPros.length,
      });
    } catch (err) {
      logger.error('Error sending confirmation email', { function: 'submitQuoteRequest' }, err);
    }

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
