'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'dashboard/customer/actions' });

export interface AcceptedQuoteProContact {
  businessName: string | null;
  businessPhone: string | null;
  phone: string | null;
  email: string | null;
}

/**
 * Pro contact details for the customer's own ACCEPTED quotes, keyed by quote id.
 *
 * RLS note (DLD-2c): users_select does not let a customer read a pro's users
 * row, so this cannot be a client-side join. The elevated client is used the
 * same way app/api/quotes/[id]/accept/route.ts uses it — every guard is
 * re-asserted here in the query filters rather than relying on RLS:
 *   1. caller is authenticated
 *   2. the quote's customer_id is the caller  (ownership)
 *   3. the quote status is 'accepted'
 *   4. a 'captured' lead_acceptances row exists for that quote + its pro
 * Any quote failing a guard is simply absent from the returned map — contact
 * data is never returned on an error path.
 *
 * Batched: one round trip per table for the whole card list, no per-card
 * waterfall.
 */
export async function getAcceptedQuoteProContacts(
  quoteRequestIds: string[]
): Promise<Record<string, AcceptedQuoteProContact>> {
  const empty: Record<string, AcceptedQuoteProContact> = {};

  try {
    if (!Array.isArray(quoteRequestIds) || quoteRequestIds.length === 0) return empty;
    const ids = Array.from(new Set(quoteRequestIds.filter((id) => typeof id === 'string' && id))).slice(0, 100);
    if (ids.length === 0) return empty;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return empty;

    const admin = createServiceRoleClient();

    // Guards 2 + 3 asserted in the filters: caller owns the row, and it is accepted.
    const { data: quotes, error: quotesError } = await admin
      .from('quote_requests')
      .select('id, cleaner_id')
      .in('id', ids)
      .eq('customer_id', user.id)
      .eq('status', 'accepted');

    if (quotesError) {
      logger.error('Error loading accepted quotes', { function: 'getAcceptedQuoteProContacts' }, quotesError);
      return empty;
    }

    const owned = ((quotes || []) as { id: string; cleaner_id: string | null }[]).filter((q) => q.cleaner_id);
    if (owned.length === 0) return empty;

    // Guard 4: the pro has paid the lead fee for that quote.
    const { data: acceptances, error: acceptancesError } = await admin
      .from('lead_acceptances')
      .select('quote_request_id, cleaner_id')
      .in('quote_request_id', owned.map((q) => q.id))
      .eq('status', 'captured');

    if (acceptancesError) {
      logger.error('Error loading lead acceptances', { function: 'getAcceptedQuoteProContacts' }, acceptancesError);
      return empty;
    }

    const capturedPairs = new Set(
      ((acceptances || []) as { quote_request_id: string; cleaner_id: string }[]).map(
        (a) => `${a.quote_request_id}:${a.cleaner_id}`
      )
    );
    const unlocked = owned.filter((q) => capturedPairs.has(`${q.id}:${q.cleaner_id}`));
    if (unlocked.length === 0) return empty;

    // Join users on u.id = p.user_id explicitly — the FK is still named
    // cleaners_user_id_fkey, so an embedded hint would be brittle.
    const { data: pros, error: prosError } = await admin
      .from('pros')
      .select('id, user_id, business_name, business_phone')
      .in('id', unlocked.map((q) => q.cleaner_id as string));

    if (prosError) {
      logger.error('Error loading pros', { function: 'getAcceptedQuoteProContacts' }, prosError);
      return empty;
    }

    const proRows = (pros || []) as {
      id: string;
      user_id: string | null;
      business_name: string | null;
      business_phone: string | null;
    }[];

    const userIds = proRows.map((p) => p.user_id).filter((id): id is string => !!id);
    const usersById = new Map<string, { phone: string | null; email: string | null }>();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await admin
        .from('users')
        .select('id, phone, email')
        .in('id', userIds);
      if (usersError) {
        logger.error('Error loading pro users', { function: 'getAcceptedQuoteProContacts' }, usersError);
      } else {
        for (const u of (users || []) as { id: string; phone: string | null; email: string | null }[]) {
          usersById.set(u.id, { phone: u.phone, email: u.email });
        }
      }
    }

    const prosById = new Map(proRows.map((p) => [p.id, p]));
    const result: Record<string, AcceptedQuoteProContact> = {};
    for (const quote of unlocked) {
      const pro = prosById.get(quote.cleaner_id as string);
      if (!pro) continue;
      const proUser = pro.user_id ? usersById.get(pro.user_id) : undefined;
      result[quote.id] = {
        businessName: pro.business_name ?? null,
        businessPhone: pro.business_phone ?? null,
        phone: proUser?.phone ?? null,
        email: proUser?.email ?? null,
      };
    }

    return result;
  } catch (error) {
    logger.error('Error in getAcceptedQuoteProContacts', { function: 'getAcceptedQuoteProContacts' }, error);
    return empty;
  }
}
