import { randomUUID } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { sendLeadContactEmail } from '@/lib/email/lead-unlock';

/** One durable job attempt. Also callable by an authorized queue-drain worker.
 * No scheduling or public endpoint is installed by this local-only patch.
 * Delivery is at least once if a process dies after provider acceptance.
 */
export async function dispatchPaidLeadHandoff(paymentIntentId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const token = randomUUID();
  const { data: jobs, error: claimError } = await supabase.rpc('claim_paid_lead_handoff', {
    p_dedupe_hash: `boc:lead-handoff:${paymentIntentId}`,
    p_claim_token: token,
  });
  if (claimError) throw claimError;
  if (!Array.isArray(jobs)) throw new Error('Handoff claim returned no result');
  if (jobs.length === 0) return false;
  const job = jobs[0];
  if (!job?.id || !job.dispatch_context?.cleaner_id || !job.quote_request_id) {
    throw new Error('Invalid handoff job');
  }
  let success = false;
  try {
    const { data: acceptance, error: acceptanceError } = await supabase
      .from('lead_acceptances').select('status')
      .eq('id', job.dispatch_context.lead_acceptance_id).single();
    if (acceptanceError || acceptance?.status !== 'captured') throw new Error('Lead is not captured');
    const { data: pro, error: proError } = await supabase
      .from('pros').select('business_name, business_email, user_id')
      .eq('id', job.dispatch_context.cleaner_id).single();
    if (proError || !pro) throw new Error('Pro not available for handoff');
    let recipient = pro.business_email;
    if (!recipient && pro.user_id) {
      const { data: user, error } = await supabase.from('users').select('email').eq('id', pro.user_id).single();
      if (error) throw error;
      recipient = user?.email;
    }
    const { data: quote, error: quoteError } = await supabase.from('quote_requests')
      .select('city, service_type, customer:users!customer_id(full_name, email, phone)')
      .eq('id', job.quote_request_id).single();
    if (quoteError || !quote || !recipient) throw new Error('Handoff contact not available');
    const raw = quote.customer as unknown;
    const customer = (Array.isArray(raw) ? raw[0] : raw) as
      | { full_name?: string | null; email?: string | null; phone?: string | null }
      | null;
    if (!customer) throw new Error('Customer not available for handoff');
    success = await sendLeadContactEmail({
      recipientEmail: recipient,
      proName: pro.business_name || 'there', customerName: customer.full_name || 'Customer',
      customerEmail: customer.email || '', customerPhone: customer.phone || null,
      serviceType: quote.service_type || '', city: quote.city || '',
    });
  } catch {
    // Keep errors generic: do not persist or log recipient/contact data.
    success = false;
  }
  const { error: finishError } = await supabase.rpc('finish_paid_lead_handoff', {
    p_id: job.id, p_claim_token: token, p_success: success,
  });
  if (finishError) throw finishError;
  return success;
}

/** Bounded drain for a future authorized scheduler; it installs no endpoint.
 * Each job's RPC claim decides eligibility and serializes concurrent drains.
 */
export async function retryPendingPaidLeadHandoffs(limit = 20): Promise<number> {
  const supabase = createServiceRoleClient();
  const batchSize = Number.isFinite(limit) ? Math.max(1, Math.min(100, Math.floor(limit))) : 20;
  const { data: jobs, error } = await supabase.from('notification_logs')
    .select('dedupe_hash').eq('event_type', 'paid_lead_handoff')
    .in('delivery_state', ['queued', 'failed', 'dispatched'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: true }).limit(batchSize);
  if (error) throw error;
  if (!Array.isArray(jobs)) throw new Error('Handoff drain returned no result');
  let sent = 0;
  const prefix = 'boc:lead-handoff:';
  for (const job of jobs) {
    if (typeof job.dedupe_hash !== 'string' || !job.dedupe_hash.startsWith(prefix)) continue;
    if (await dispatchPaidLeadHandoff(job.dedupe_hash.slice(prefix.length))) sent++;
  }
  return sent;
}
