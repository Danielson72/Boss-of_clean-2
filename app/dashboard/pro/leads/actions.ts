'use server';

import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/pro/leads/actions' });

/**
 * A9 Slice 2 (DLD-517): a confirmed-hire lead the pro still needs to pay $30 to
 * unlock. PII-safe — first name + city/ZIP only, sourced from the
 * quote_requests_pro_view security-barrier view (no email/phone/street address).
 */
export interface HiredLead {
  /** quote_requests.id — the path param for POST /api/leads/{id}/unlock */
  id: string;
  service_type: string;
  city: string;
  zip_code: string;
  customer_first_name: string | null;
  /** the price this pro quoted and the customer accepted */
  quoted_price: number | null;
  /**
   * 'pending' = a lead_acceptances row exists with an in-flight checkout →
   * show "Resume payment". null = no acceptance yet → show "Unlock for $30".
   * (captured leads are filtered out of this list entirely.)
   */
  acceptanceStatus: 'pending' | null;
}

/**
 * Eligible = a lead the pro was HIRED for and has NOT yet unlocked:
 *   quote_requests where cleaner_id = pros.id AND status = 'accepted'
 *   INNER hire_confirmations on (quote_request_id, cleaner_id)   ← the hire trigger
 *   ANTI-JOIN captured lead_acceptances                          ← hide unlocked
 *   left-read pending lead_acceptances                           ← "Resume payment"
 *
 * Uses the pro's own user-client throughout (RLS already scopes every read:
 * "Pros can view confirmations for their leads", "Pros can view own unlocks").
 */
export async function getHiredLeadsAwaitingUnlock(): Promise<{
  success: boolean;
  leads?: HiredLead[];
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
    if (pro.approval_status !== 'approved') {
      return { success: false, error: 'Your account must be approved to view leads' };
    }

    // 1. Accepted quotes claimed by this pro, read PII-safe from the view.
    type RawRow = {
      id: string;
      service_type: string;
      city: string;
      zip_code: string;
      quoted_price: number | null;
      customer_first_name: string | null;
    };
    const { data: accepted, error: acceptedErr } = await supabase
      .from('quote_requests_pro_view')
      .select('id, service_type, city, zip_code, quoted_price, customer_first_name')
      .eq('cleaner_id', pro.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<RawRow[]>();

    if (acceptedErr) {
      logger.error('Error fetching accepted quotes', { function: 'getHiredLeadsAwaitingUnlock' }, acceptedErr);
      return { success: false, error: 'Failed to load leads' };
    }

    const acceptedIds = (accepted || []).map((q) => q.id);
    if (acceptedIds.length === 0) {
      return { success: true, leads: [] };
    }

    // 2. INNER join hire_confirmations (the customer actually confirmed the hire)
    //    and 3. read lead_acceptances to anti-join 'captured' and surface 'pending'.
    const [hires, acceptances] = await Promise.all([
      supabase
        .from('hire_confirmations')
        .select('quote_request_id')
        .eq('cleaner_id', pro.id)
        .in('quote_request_id', acceptedIds),
      supabase
        .from('lead_acceptances')
        .select('quote_request_id, status')
        .eq('cleaner_id', pro.id)
        .in('quote_request_id', acceptedIds)
        .in('status', ['pending', 'captured']),
    ]);

    if (hires.error) {
      logger.error('Error fetching hire confirmations', { function: 'getHiredLeadsAwaitingUnlock' }, hires.error);
      return { success: false, error: 'Failed to load leads' };
    }
    if (acceptances.error) {
      logger.error('Error fetching lead acceptances', { function: 'getHiredLeadsAwaitingUnlock' }, acceptances.error);
      return { success: false, error: 'Failed to load leads' };
    }

    const hiredSet = new Set((hires.data || []).map((h) => h.quote_request_id));
    const acceptanceByQuote = new Map<string, 'pending' | 'captured'>();
    for (const a of acceptances.data || []) {
      acceptanceByQuote.set(a.quote_request_id, a.status as 'pending' | 'captured');
    }

    const leads: HiredLead[] = (accepted || [])
      .filter((q) => hiredSet.has(q.id) && acceptanceByQuote.get(q.id) !== 'captured')
      .map((q) => ({
        id: q.id,
        service_type: q.service_type,
        city: q.city,
        zip_code: q.zip_code,
        customer_first_name: q.customer_first_name,
        quoted_price: q.quoted_price,
        acceptanceStatus: acceptanceByQuote.get(q.id) === 'pending' ? 'pending' : null,
      }));

    return { success: true, leads };
  } catch (error) {
    logger.error('Error in getHiredLeadsAwaitingUnlock', { function: 'getHiredLeadsAwaitingUnlock' }, error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
