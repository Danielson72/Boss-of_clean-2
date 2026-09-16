import { createHash, randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewLeadEmailData } from '@/lib/email/notifications';
import type { SendEmailResult } from '@/lib/email/resend';
import { createLogger } from '@/lib/utils/logger';

// New-lead fan-out to one pro: in-app notification row, then the Resend
// email, with a notification_logs row recording what happened. This module is
// deliberately free of Next.js imports so it can be exercised directly in a
// Node test with fake clients.
//
// Why this exists (DLD, 2026-09-16 incident): the email send used to be
// fire-and-forget inside a server action. On Netlify the function is frozen as
// soon as the action's response is sent, so the un-awaited Resend call never
// completed and nothing was ever written to notification_logs. Every step here
// is awaited by the caller.

const logger = createLogger({ file: 'lib/notifications/new-lead' });

export interface NewLeadRecipient {
  cleaner_id: string;
  user_id: string;
  email: string;
  business_name: string;
}

export interface NewLeadContext {
  quoteId: string;
  serviceType: string;
  zipCode: string;
  city?: string | null;
  preferredDate?: string | null;
}

export type SendNewLeadEmailFn = (data: NewLeadEmailData) => Promise<SendEmailResult>;

export interface NewLeadDispatchDeps {
  /** Service-role client: writes notifications / notification_logs for another user. */
  admin: SupabaseClient;
  sendNewLeadEmail: SendNewLeadEmailFn;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

export type NewLeadEmailOutcome = 'dispatched' | 'failed' | 'unsubscribed' | 'skipped';

export interface NewLeadDispatchResult {
  userId: string;
  notificationInserted: boolean;
  email: NewLeadEmailOutcome;
  logId: string | null;
  error?: string;
}

/**
 * Email opt-in for new-lead alerts. Missing notification_preferences row means
 * default ON (transactional lead alert). Only an explicit
 * `email_enabled = false` row opts the pro out.
 */
export async function proWantsLeadEmail(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('notification_preferences')
    .select('email_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Preference lookup failure must not silence a lead alert — default ON.
    logger.error('notification_preferences lookup failed; defaulting email ON', { function: 'proWantsLeadEmail', userId }, error);
    return true;
  }
  if (!data) return true;
  return (data as { email_enabled: boolean | null }).email_enabled !== false;
}

function hourBucket(d: Date): string {
  const b = new Date(d);
  b.setUTCMinutes(0, 0, 0);
  return b.toISOString();
}

function dedupeHash(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Notify a single pro about a new marketplace lead. Never throws — every
 * failure is captured in the returned result and in notification_logs.
 */
export async function dispatchNewLeadToPro(
  pro: NewLeadRecipient,
  lead: NewLeadContext,
  deps: NewLeadDispatchDeps
): Promise<NewLeadDispatchResult> {
  const now = deps.now ?? (() => new Date());
  const result: NewLeadDispatchResult = {
    userId: pro.user_id,
    notificationInserted: false,
    email: 'skipped',
    logId: null,
  };

  const location = lead.city ? `${lead.city}, ${lead.zipCode}` : lead.zipCode;

  // 1. In-app notification (drives the sidebar badge + "New" indicator).
  const { error: notifErr } = await deps.admin.from('notifications').insert({
    user_id: pro.user_id,
    type: 'new_lead',
    title: 'New Quote Request!',
    message: `A customer in ${location} is looking for ${lead.serviceType.replace(/_/g, ' ')} service.`,
    action_url: '/dashboard/pro/quote-requests',
  });
  if (notifErr) {
    logger.error('Failed to create pro notification', { function: 'dispatchNewLeadToPro', userId: pro.user_id }, notifErr);
  } else {
    result.notificationInserted = true;
  }

  // 2. Email opt-in (missing prefs row = ON).
  const wantsEmail = await proWantsLeadEmail(deps.admin, pro.user_id);

  // 3. notification_logs row first (queued / unsubscribed), then send.
  const ts = now();
  const logRow = {
    event_id: randomUUID(),
    event_type: 'new_lead',
    quote_request_id: lead.quoteId,
    recipient_id: pro.user_id,
    recipient_role: 'cleaner',
    recipient_channel: 'email',
    recipient_address: pro.email,
    dedupe_hash: dedupeHash(['new_lead', lead.quoteId, pro.user_id, 'email']),
    bucket_window_iso: hourBucket(ts),
    provider: 'resend',
    delivery_state: wantsEmail ? 'queued' : 'unsubscribed',
  };

  const { data: inserted, error: logErr } = await deps.admin
    .from('notification_logs')
    .insert(logRow)
    .select('id')
    .single();
  if (logErr || !inserted) {
    logger.error('Failed to write notification_logs row', { function: 'dispatchNewLeadToPro', userId: pro.user_id }, logErr);
  } else {
    result.logId = (inserted as { id: string }).id;
  }

  if (!wantsEmail) {
    result.email = 'unsubscribed';
    return result;
  }

  // 4. Send (awaited — see header comment).
  let sendResult: SendEmailResult;
  try {
    sendResult = await deps.sendNewLeadEmail({
      to: pro.email,
      businessName: pro.business_name,
      serviceType: lead.serviceType,
      zipCode: lead.zipCode,
      preferredDate: lead.preferredDate ?? null,
      leadId: lead.quoteId,
    });
  } catch (err) {
    sendResult = { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  const doneAt = now().toISOString();
  if (sendResult.success) {
    result.email = 'dispatched';
  } else {
    result.email = 'failed';
    result.error = sendResult.error;
    logger.error('New-lead email failed', { function: 'dispatchNewLeadToPro', userId: pro.user_id, error: sendResult.error });
  }

  if (result.logId) {
    const { error: updErr } = await deps.admin
      .from('notification_logs')
      .update(
        sendResult.success
          ? { delivery_state: 'dispatched', dispatched_at: doneAt, provider_message_id: sendResult.id ?? null }
          : { delivery_state: 'failed', failed_at: doneAt, provider_response_raw: { error: sendResult.error ?? 'unknown' } }
      )
      .eq('id', result.logId);
    if (updErr) {
      logger.error('Failed to update notification_logs state', { function: 'dispatchNewLeadToPro', logId: result.logId }, updErr);
    }
  }

  return result;
}
