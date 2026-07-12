'use server';

import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { PRO_SMS_CONSENT_TEXT } from '@/lib/sms/consent-copy';

async function clientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : (headersList.get('x-real-ip') || 'unknown');
}

export async function recordUserTcpaConsent(userId: string, userAgent: string): Promise<void> {
  const ip = await clientIp();

  const supabase = createServiceRoleClient();
  await supabase
    .from('users')
    .update({
      tcpa_consent_at: new Date().toISOString(),
      tcpa_consent_ip: ip,
      tcpa_consent_ua: userAgent.slice(0, 512),
    })
    .eq('id', userId);
}

/**
 * Record a pro's affirmative SMS consent for automated Twilio alerts.
 * Mirrors recordUserTcpaConsent. IP is captured server-side; the consent text
 * is the canonical PRO_SMS_CONSENT_TEXT (not client-supplied, so it can't be
 * spoofed); consent is bound to the pro's current business_phone so a later
 * number change invalidates it. Call this AFTER the pros row is saved.
 */
export async function recordProSmsConsent(userId: string, userAgent: string): Promise<void> {
  const ip = await clientIp();
  const supabase = createServiceRoleClient();

  const { data: pro } = await supabase
    .from('pros')
    .select('business_phone')
    .eq('user_id', userId)
    .single();

  await supabase
    .from('pros')
    .update({
      sms_consent_at: new Date().toISOString(),
      sms_consent_ip: ip,
      sms_consent_ua: userAgent.slice(0, 512),
      sms_consent_text: PRO_SMS_CONSENT_TEXT,
      sms_consent_phone: pro?.business_phone ?? null,
    })
    .eq('user_id', userId);

  // DLD-577: consenting to automated texts IS opting into them. There is no
  // separate pro-side SMS-preference UI, and the send gate also checks
  // notification_preferences.sms_enabled — so enable it here, or the consent
  // is meaningless and no text can ever send.
  await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        sms_enabled: true,
        sms_new_leads: true,
        sms_new_messages: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

/**
 * Clear a pro's SMS consent (they unchecked the box). After this the send gate
 * fails closed and no further automated texts go to that pro until they opt in
 * again. This is a preference revocation; distinct from an inbound STOP, which
 * is recorded in sms_opt_outs.
 */
export async function revokeProSmsConsent(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase
    .from('pros')
    .update({
      sms_consent_at: null,
      sms_consent_ip: null,
      sms_consent_ua: null,
      sms_consent_text: null,
      sms_consent_phone: null,
    })
    .eq('user_id', userId);

  // DLD-577: revoking consent also turns off the SMS notification preference so
  // no further texts send. (Consent gate would already fail-closed; this keeps
  // the preference state honest too.)
  await supabase
    .from('notification_preferences')
    .update({
      sms_enabled: false,
      sms_new_leads: false,
      sms_new_messages: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}
