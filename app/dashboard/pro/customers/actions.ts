'use server';

import { createClient } from '@/lib/supabase/server';
import { capturedCustomerIdsForPro } from '@/lib/lead-pii';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/pro/customers/actions' });

/**
 * DLD-564: a lead this pro has PAID to unlock (captured lead_acceptance).
 * Customer contact (full name + email) flows through the exact same
 * PII-barrier path Messages uses: the conversations→users join, gated by
 * capturedCustomerIdsForPro from lib/lead-pii. No new PII query paths.
 */
export interface WonLead {
  /** lead_acceptances.id */
  id: string;
  quote_request_id: string;
  service_type: string | null;
  city: string | null;
  zip_code: string | null;
  /** when the pro's payment captured the lead */
  unlocked_at: string | null;
  customer_full_name: string | null;
  customer_email: string | null;
  /** conversations.id for the Messages deep link; null if no thread yet */
  conversation_id: string | null;
}

export async function getWonLeads(): Promise<{
  success: boolean;
  leads?: WonLead[];
  error?: string;
}> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: pro } = await supabase
      .from('pros')
      .select('id, approval_status')
      .eq('user_id', user.id)
      .single();
    if (!pro) {
      return { success: false, error: 'Cleaner profile not found' };
    }

    // 1. Captured (paid) lead acceptances, with the PII-safe job columns off
    //    quote_requests (service/city/zip only — never address/description).
    //    RLS: "Pros can view own unlocks".
    const { data: acceptances, error: accErr } = await supabase
      .from('lead_acceptances')
      .select(
        'id, quote_request_id, captured_at, unlocked_at, quote_request:quote_requests!inner(id, customer_id, service_type, city, zip_code)'
      )
      .eq('cleaner_id', pro.id)
      .eq('status', 'captured')
      .order('captured_at', { ascending: false })
      .limit(200);

    if (accErr) {
      logger.error('Error fetching captured acceptances', { function: 'getWonLeads' }, accErr);
      return { success: false, error: 'Failed to load your customers' };
    }
    if (!acceptances || acceptances.length === 0) {
      return { success: true, leads: [] };
    }

    type QR = { id: string; customer_id: string; service_type: string | null; city: string | null; zip_code: string | null };
    const qrOf = (row: (typeof acceptances)[number]): QR | null => {
      const qr = row.quote_request as unknown;
      const obj = Array.isArray(qr) ? qr[0] : qr;
      return (obj as QR | null) ?? null;
    };

    const customerIds = Array.from(
      new Set(acceptances.map((a) => qrOf(a)?.customer_id).filter((v): v is string => Boolean(v)))
    );

    // 2. Same PII barrier Messages uses — fail-closed helper from lib/lead-pii.
    const unlockedCustomerIds = await capturedCustomerIdsForPro(supabase, pro.id, customerIds);

    // 3. Contact via the same conversations→users join Messages reads
    //    (RLS: "Cleaners can view their conversations"). No direct users query.
    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select('id, customer_id, quote_request_id, customer:users!conversations_customer_id_fkey(id, full_name, email)')
      .eq('cleaner_id', pro.id)
      .in('customer_id', customerIds);

    if (convErr) {
      logger.error('Error fetching conversations', { function: 'getWonLeads' }, convErr);
      // Contact enrichment failed — still show the unlocked leads, without contact.
    }

    type ConvCustomer = { id: string; full_name: string | null; email: string | null };
    const convByCustomer = new Map<string, { conversationId: string; customer: ConvCustomer | null }>();
    for (const c of conversations || []) {
      const cust = c.customer as unknown;
      const obj = (Array.isArray(cust) ? cust[0] : cust) as ConvCustomer | null;
      // Prefer the conversation tied to the quote request; otherwise first seen.
      const existing = convByCustomer.get(c.customer_id);
      const qrIds = new Set(acceptances.map((a) => a.quote_request_id));
      if (!existing || (c.quote_request_id && qrIds.has(c.quote_request_id))) {
        convByCustomer.set(c.customer_id, { conversationId: c.id, customer: obj });
      }
    }

    const leads: WonLead[] = acceptances.map((a) => {
      const qr = qrOf(a);
      const customerId = qr?.customer_id ?? '';
      const isUnlocked = unlockedCustomerIds.has(customerId);
      const conv = convByCustomer.get(customerId);
      return {
        id: a.id,
        quote_request_id: a.quote_request_id,
        service_type: qr?.service_type ?? null,
        city: qr?.city ?? null,
        zip_code: qr?.zip_code ?? null,
        unlocked_at: (a.captured_at as string | null) ?? (a.unlocked_at as string | null),
        // Contact only when the barrier confirms the unlock — fail closed.
        customer_full_name: isUnlocked ? conv?.customer?.full_name ?? null : null,
        customer_email: isUnlocked ? conv?.customer?.email ?? null : null,
        conversation_id: conv?.conversationId ?? null,
      };
    });

    return { success: true, leads };
  } catch (err) {
    logger.error('Unexpected error', { function: 'getWonLeads' }, err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
