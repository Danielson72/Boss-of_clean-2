import type { SupabaseClient } from '@supabase/supabase-js';
import { PRO_SMS_CONSENT_TEXT } from '@/lib/sms/consent-copy';

async function currentUserId(supabase: SupabaseClient): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Sign in required');
  return user.id;
}

export async function recordProSmsConsentCore(
  supabase: SupabaseClient,
  ip: string,
  userAgent: string
): Promise<void> {
  const userId = await currentUserId(supabase);
  const { data: pro, error: proError } = await supabase
    .from('pros')
    .select('business_phone')
    .eq('user_id', userId)
    .single();
  if (proError || !pro) throw new Error('Pro profile not found');

  const { error: consentError } = await supabase
    .from('pros')
    .update({
      sms_consent_at: new Date().toISOString(),
      sms_consent_ip: ip,
      sms_consent_ua: userAgent.slice(0, 512),
      sms_consent_text: PRO_SMS_CONSENT_TEXT,
      sms_consent_phone: pro.business_phone ?? null,
    })
    .eq('user_id', userId);
  if (consentError) throw new Error('Could not save SMS consent');

  const { error: preferenceError } = await supabase
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
  if (preferenceError) throw new Error('Could not save SMS preferences');
}

export async function revokeProSmsConsentCore(supabase: SupabaseClient): Promise<void> {
  const userId = await currentUserId(supabase);
  const { error: consentError } = await supabase
    .from('pros')
    .update({
      sms_consent_at: null,
      sms_consent_ip: null,
      sms_consent_ua: null,
      sms_consent_text: null,
      sms_consent_phone: null,
    })
    .eq('user_id', userId);
  if (consentError) throw new Error('Could not clear SMS consent');

  const { error: preferenceError } = await supabase
    .from('notification_preferences')
    .update({
      sms_enabled: false,
      sms_new_leads: false,
      sms_new_messages: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (preferenceError) throw new Error('Could not update SMS preferences');
}
