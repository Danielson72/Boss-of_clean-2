import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserConsentUpdate {
  tcpa_consent_at: string;
  tcpa_consent_ip: string;
  tcpa_consent_ua: string;
  phone?: string;
  full_name?: string;
}

/**
 * Privileged update primitive whose target is always the authenticated caller.
 * Keeping the target out of the public action signature prevents IDOR/BOLA.
 */
export async function updateCallerConsent(
  admin: SupabaseClient,
  callerId: string,
  update: UserConsentUpdate,
): Promise<{ error: { message: string } | null }> {
  const { error } = await admin.from('users').update(update).eq('id', callerId);
  return { error };
}
