'use server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

/**
 * Seed a pro's signup ZIP into pros.service_areas via the service role.
 *
 * At signup the email is not yet confirmed, so the client has no session and
 * auth.uid() is NULL — the pros_insert / pros_update RLS policies both require
 * auth.uid() = user_id, so any client-side write here fails. Same reason
 * recordUserTcpaConsent exists (DLD-576).
 *
 * pros.service_areas (text[]) is the canonical store: it is what search reads
 * (searchService.ts) and what onboarding writes. public.service_areas is NOT
 * written here — see DLD-599.
 *
 * Appends; never overwrites. The pros row already exists (created by the
 * handle_new_user trigger in the same transaction as the auth user).
 */
export async function seedProServiceArea(
  userId: string,
  zipCode: string
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{5}$/.test(zipCode)) {
    return { ok: false, error: 'Invalid ZIP code' };
  }

  const supabase = createServiceRoleClient();

  // Only seed ZIPs we actually serve — keeps junk out of the search index.
  const { data: zip } = await supabase
    .from('florida_zipcodes')
    .select('zip_code')
    .eq('zip_code', zipCode)
    .maybeSingle();

  if (!zip) {
    return { ok: false, error: 'ZIP code is outside our Florida service area' };
  }

  const { data: pro, error: readError } = await supabase
    .from('pros')
    .select('id, service_areas')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!pro) return { ok: false, error: 'Pro profile not found' };

  const existing: string[] = pro.service_areas ?? [];
  if (existing.includes(zipCode)) return { ok: true };

  const { error: writeError } = await supabase
    .from('pros')
    .update({ service_areas: [...existing, zipCode] })
    .eq('id', pro.id);

  if (writeError) return { ok: false, error: writeError.message };
  return { ok: true };
}
