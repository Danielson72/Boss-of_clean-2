/**
 * SMS consent + opt-out gates (TCPA / Florida FTSA).
 *
 * Server-side, fail-closed. Two independent questions:
 *   - proHasValidSmsConsent: did the pro affirmatively opt IN for THIS number?
 *   - isPhoneOptedOut:        did this number opt OUT (reply STOP)?
 * Both must be satisfied before any automated text is sent to a pro.
 */

import { createServiceRoleClient } from '../supabase/service-role';
import { createLogger } from '../utils/logger';

const logger = createLogger({ file: 'lib/sms/consent' });

/**
 * Fail-closed: does this pro have a valid, on-file SMS consent record for the
 * exact number we are about to text? Returns false on any missing record,
 * phone mismatch, or error. No consent → no text.
 */
export async function proHasValidSmsConsent(userId: string, phone: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('pros')
      .select('sms_consent_at, sms_consent_phone')
      .eq('user_id', userId)
      .single();

    if (error || !data) return false;
    if (!data.sms_consent_at) return false;

    // Consent is bound to the exact number consented to. A changed business_phone
    // invalidates consent until the pro re-consents.
    if ((data.sms_consent_phone ?? '').trim() !== (phone ?? '').trim()) return false;

    return true;
  } catch (err) {
    logger.error('proHasValidSmsConsent failed (fail-closed)', {
      function: 'proHasValidSmsConsent',
      userId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Fail-closed: is this phone on the STOP / opt-out ledger? On any error we treat
 * the number as opted out (skip the send) — honoring a revocation is the safe
 * default.
 */
export async function isPhoneOptedOut(phone: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('sms_opt_outs')
      .select('phone')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      logger.error('isPhoneOptedOut check failed (fail-closed = opted out)', {
        function: 'isPhoneOptedOut',
        error: error.message,
      });
      return true;
    }
    return !!data;
  } catch (err) {
    logger.error('isPhoneOptedOut threw (fail-closed = opted out)', {
      function: 'isPhoneOptedOut',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return true;
  }
}

/** Record an opt-out (inbound STOP). Idempotent. */
export async function recordOptOut(phone: string, source = 'sms_stop'): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from('sms_opt_outs')
    .upsert(
      { phone, source, opted_out_at: new Date().toISOString() },
      { onConflict: 'phone' }
    );
}

/** Remove an opt-out (inbound START / resubscribe). Idempotent. */
export async function removeOptOut(phone: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from('sms_opt_outs').delete().eq('phone', phone);
}
