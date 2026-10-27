import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeToE164 } from '@/lib/phone';

export interface CompleteSignupInput {
  role: 'customer' | 'cleaner';
  phone: string;
  businessName: string;
  zipCode: string;
  consented: boolean;
}

export interface CompleteSignupDeps {
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
  ip: string;
  userAgent: string;
  checkLimit: (userId: string) => Promise<boolean>;
}

export type CompleteSignupResult =
  | { ok: false; error: string }
  | { ok: true; role: 'customer' | 'cleaner' };

export async function completeSignupCore(
  input: CompleteSignupInput,
  deps: CompleteSignupDeps
): Promise<CompleteSignupResult> {
  const { data: { user }, error: authError } = await deps.userClient.auth.getUser();
  if (authError || !user) return { ok: false, error: 'Sign in required.' };
  if (!(await deps.checkLimit(user.id))) {
    return { ok: false, error: 'Too many attempts. Please wait a few minutes.' };
  }
  if (!input || typeof input !== 'object' || typeof input.phone !== 'string'
    || typeof input.businessName !== 'string' || typeof input.zipCode !== 'string'
    || (input.role !== 'customer' && input.role !== 'cleaner')) {
    return { ok: false, error: 'Invalid account details.' };
  }
  if (input.consented !== true) return { ok: false, error: 'Contact consent is required.' };
  const phone = normalizeToE164(input.phone);
  if (!phone) return { ok: false, error: 'Please enter a valid US phone number.' };

  const { data: profile, error: profileError } = await deps.adminClient
    .from('users')
    .select('role, phone, tcpa_consent_at')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || !profile || profile.role === 'admin') {
    return { ok: false, error: 'Account setup is unavailable.' };
  }
  if (profile.phone && profile.tcpa_consent_at) {
    if (profile.role !== 'cleaner') return { ok: true, role: 'customer' };
    const { data: pro } = await deps.adminClient
      .from('pros')
      .select('service_areas')
      .eq('user_id', user.id)
      .maybeSingle();
    if (pro?.service_areas?.length) return { ok: true, role: 'cleaner' };
  }

  const role = profile.role === 'cleaner' ? 'cleaner' : input.role;
  if (role === 'cleaner') {
    const businessName = input.businessName.trim();
    if (!businessName || businessName.length > 200 || !/^\d{5}$/.test(input.zipCode)) {
      return { ok: false, error: 'Enter a business name and five-digit ZIP code.' };
    }
    const { data: zip, error: zipError } = await deps.adminClient
      .from('florida_zipcodes')
      .select('zip_code')
      .eq('zip_code', input.zipCode)
      .maybeSingle();
    if (zipError || !zip) return { ok: false, error: 'ZIP code is outside our Florida service area.' };

    const { data: pro, error: proError } = await deps.adminClient
      .from('pros')
      .select('id, service_areas')
      .eq('user_id', user.id)
      .maybeSingle();
    if (proError) return { ok: false, error: 'Could not set up your pro profile.' };
    if (pro) {
      const areas: string[] = pro.service_areas ?? [];
      if (!areas.includes(input.zipCode)) {
        const { error: areaError } = await deps.adminClient
          .from('pros')
          .update({ service_areas: [...areas, input.zipCode] })
          .eq('id', pro.id);
        if (areaError) return { ok: false, error: 'Could not save your service ZIP code.' };
      }
    } else {
      const { error: insertError } = await deps.adminClient.from('pros').insert({
        user_id: user.id,
        business_name: businessName,
        approval_status: 'pending',
        service_areas: [input.zipCode],
      });
      if (insertError) return { ok: false, error: 'Could not set up your pro profile.' };
    }
  }

  const { error: updateError } = await deps.adminClient
    .from('users')
    .update({
      role,
      phone,
      tcpa_consent_at: new Date().toISOString(),
      tcpa_consent_ip: deps.ip,
      tcpa_consent_ua: deps.userAgent.slice(0, 512),
    })
    .eq('id', user.id);
  if (updateError) return { ok: false, error: 'Could not finish account setup.' };
  return { ok: true, role };
}
