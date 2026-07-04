/**
 * Lead PII wall — shared helpers (SEC-01 / SEC-02, DLD-555)
 *
 * The $30 lead fee gates customer contact info. Pros may only see a
 * customer's full name / email / street address after they hold a
 * lead_acceptances row with status='captured' for one of that customer's
 * quote requests. Until then they get the same redacted shape as
 * quote_requests_pro_view: first name + city/zip + job details.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** "Jane Smith" -> "Jane"; null-safe. */
export function firstNameOnly(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * Batch check: which of these customers has this pro paid to unlock?
 * A customer counts as unlocked when the pro has a captured lead_acceptance
 * on ANY of that customer's quote requests.
 */
export async function capturedCustomerIdsForPro(
  supabase: SupabaseClient,
  cleanerId: string,
  customerIds: string[]
): Promise<Set<string>> {
  const unique = Array.from(new Set(customerIds.filter(Boolean)));
  if (!cleanerId || unique.length === 0) return new Set();

  const { data, error } = await supabase
    .from('lead_acceptances')
    .select('quote_request:quote_requests!inner(customer_id)')
    .eq('cleaner_id', cleanerId)
    .eq('status', 'captured')
    .in('quote_request.customer_id', unique);

  if (error) {
    // Fail closed: an error here must never widen PII exposure.
    return new Set();
  }

  const ids = new Set<string>();
  for (const row of data || []) {
    // Many-to-one FK embeds come back as a single object at runtime, but the
    // generated types may say array — normalize both shapes.
    const qr = row.quote_request as unknown;
    const obj = Array.isArray(qr) ? qr[0] : qr;
    const customerId = (obj as { customer_id?: string } | null)?.customer_id;
    if (customerId) ids.add(customerId);
  }
  return ids;
}

/**
 * Single-customer convenience wrapper around capturedCustomerIdsForPro.
 */
export async function proHasCapturedLeadForCustomer(
  supabase: SupabaseClient,
  cleanerId: string,
  customerId: string
): Promise<boolean> {
  const ids = await capturedCustomerIdsForPro(supabase, cleanerId, [customerId]);
  return ids.has(customerId);
}

/**
 * Has this pro captured (paid for) this specific quote request?
 */
export async function proHasCapturedQuote(
  supabase: SupabaseClient,
  cleanerId: string,
  quoteRequestId: string
): Promise<boolean> {
  if (!cleanerId || !quoteRequestId) return false;
  const { data, error } = await supabase
    .from('lead_acceptances')
    .select('id')
    .eq('cleaner_id', cleanerId)
    .eq('quote_request_id', quoteRequestId)
    .eq('status', 'captured')
    .limit(1)
    .maybeSingle();
  if (error) return false; // fail closed
  return !!data;
}

/**
 * Redact an embedded customer object for a pro who has NOT paid:
 * first name only, no email. Pass-through when unlocked.
 */
export function redactCustomerForPro<
  T extends { full_name?: string | null; email?: string | null }
>(customer: T | null | undefined, isUnlocked: boolean): T | null {
  if (!customer) return null;
  if (isUnlocked) return customer;
  return {
    ...customer,
    full_name: firstNameOnly(customer.full_name),
    email: null,
  };
}
