import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeToE164 } from '@/lib/phone';

export interface SignupDetailsInput {
  userId: string;
  nonce: string;
  fullName: string;
  businessName: string;
  phone: string;
  zipCode: string;
  consented: boolean;
}

export interface SignupDeps {
  adminClient: SupabaseClient;
  ip: string;
  userAgent: string;
  checkLimit: () => Promise<boolean>;
}

export type SignupResult =
  | { ok: false; error: string }
  | { ok: true; setupIssue?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROOF_WINDOW_MS = 15 * 60 * 1000;

export function isFreshSignup(user: { identities?: unknown[] } | null): boolean {
  return !!user?.identities?.length;
}

/** A fresh, unguessable signup nonce in auth metadata binds the browser to the new account. */
export async function saveSignupDetailsCore(
  input: SignupDetailsInput,
  deps: SignupDeps
): Promise<SignupResult> {
  if (!(await deps.checkLimit())) {
    return { ok: false, error: 'Too many signup attempts. Please wait a few minutes.' };
  }
  if (!input || typeof input !== 'object' || typeof input.userId !== 'string'
    || typeof input.nonce !== 'string' || typeof input.fullName !== 'string'
    || typeof input.businessName !== 'string' || typeof input.phone !== 'string'
    || typeof input.zipCode !== 'string' || !UUID.test(input.userId)
    || !UUID.test(input.nonce) || input.consented !== true) {
    return { ok: false, error: 'Invalid signup details.' };
  }
  const phone = normalizeToE164(input.phone);
  const fullName = input.fullName.trim();
  const businessName = input.businessName.trim();
  if (!phone || fullName.length > 200 || businessName.length > 200) {
    return { ok: false, error: 'Invalid contact details.' };
  }

  const { data: { user }, error: authError } = await deps.adminClient.auth.admin.getUserById(input.userId);
  const age = user ? Date.now() - new Date(user.created_at).getTime() : Infinity;
  if (authError || !user || user.user_metadata?.signup_nonce !== input.nonce
    || !Number.isFinite(age) || age < -60_000 || age > PROOF_WINDOW_MS) {
    return { ok: false, error: 'Signup session expired. Please confirm your email and finish your account setup.' };
  }

  const { data: profile, error: profileError } = await deps.adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile || !['customer', 'cleaner'].includes(profile.role)) {
    return { ok: false, error: 'Account setup is unavailable.' };
  }

  if (profile.role === 'cleaner') {
    if (!businessName || !/^\d{5}$/.test(input.zipCode)) {
      return { ok: false, error: 'Enter a business name and five-digit ZIP code.' };
    }
    const { data: zip, error: zipError } = await deps.adminClient
      .from('florida_zipcodes')
      .select('zip_code')
      .eq('zip_code', input.zipCode)
      .maybeSingle();
    if (zipError || !zip) return { ok: false, error: 'ZIP code is outside our Florida service area.' };
  }

  let setupIssue: string | undefined;
  const { data: savedProfile, error: updateError } = await deps.adminClient
    .from('users')
    .update({
      phone,
      full_name: fullName || null,
      tcpa_consent_at: new Date().toISOString(),
      tcpa_consent_ip: deps.ip,
      tcpa_consent_ua: deps.userAgent.slice(0, 512),
    })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();
  if (updateError || !savedProfile) setupIssue = 'your phone number';

  if (profile.role === 'cleaner') {
    const { data: pro, error: proError } = await deps.adminClient
      .from('pros')
      .select('id, service_areas')
      .eq('user_id', user.id)
      .maybeSingle();
    if (proError || !pro) {
      setupIssue = setupIssue ? `${setupIssue} or your service ZIP code` : 'your service ZIP code';
    } else {
      const areas: string[] = pro.service_areas ?? [];
      if (!areas.includes(input.zipCode)) {
        const { error: areaError } = await deps.adminClient
          .from('pros')
          .update({ service_areas: [...areas, input.zipCode] })
          .eq('id', pro.id);
        if (areaError) {
          setupIssue = setupIssue ? `${setupIssue} or your service ZIP code` : 'your service ZIP code';
        }
      }
    }
  }

  return { ok: true, setupIssue };
}
