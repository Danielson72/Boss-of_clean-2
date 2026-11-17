import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * DLD-696: after a captured lead-unlock payment, make sure the customer/pro
 * thread exists and is linked to the paid quote, so the messages route stops
 * contact-filtering it and the pro can message first.
 *
 * Service-role client only (called from the Stripe webhook). Idempotent across
 * Stripe redeliveries: conversations is one row per (customer_id, cleaner_id),
 * and the link is a compare-and-swap that only fills a NULL quote_request_id.
 * A thread already linked to another quote is left alone; only this webhook
 * sets the link, and only after a capture, so that thread is already unlocked.
 * Throws on error so the caller's retry path handles it.
 */
export async function ensurePaidConversation(
  supabase: SupabaseClient,
  args: { customerId: string; cleanerId: string; quoteRequestId: string }
): Promise<void> {
  const { customerId, cleanerId, quoteRequestId } = args;

  const findExisting = () =>
    supabase
      .from('conversations')
      .select('id, quote_request_id')
      .eq('customer_id', customerId)
      .eq('cleaner_id', cleanerId)
      .maybeSingle();

  let { data: conv, error } = await findExisting();
  if (error) throw error;

  if (!conv) {
    const { error: insertError } = await supabase
      .from('conversations')
      .insert({ customer_id: customerId, cleaner_id: cleanerId, quote_request_id: quoteRequestId });
    if (!insertError) return;
    // A concurrent insert won the unique (customer_id, cleaner_id) race; fall
    // through to the link step against the row it created.
    if ((insertError as { code?: string }).code !== '23505') throw insertError;
    ({ data: conv, error } = await findExisting());
    if (error) throw error;
    if (!conv) throw new Error('conversation vanished after unique violation');
  }

  if (conv.quote_request_id) return;

  const { error: linkError } = await supabase
    .from('conversations')
    .update({ quote_request_id: quoteRequestId })
    .eq('id', conv.id)
    .is('quote_request_id', null);
  if (linkError) throw linkError;
}
