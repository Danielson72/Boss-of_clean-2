'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { normalizeToE164 } from '@/lib/phone';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { guardPublicSubmission } from '@/lib/security/submission-guard';

const signUpSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['customer', 'cleaner']),
  fullName: z.string().trim().min(1).max(120),
  businessName: z.string().trim().max(160).optional(),
  phone: z.string().trim().min(1).max(32),
  zipCode: z.string().trim().regex(/^\d{5}$/).optional(),
  tcpaConsented: z.literal(true),
  website: z.string().max(0).optional(),
});

export type SignUpAccountInput = z.input<typeof signUpSchema>;

export interface SignUpAccountResult {
  ok: boolean;
  needsEmailConfirmation?: boolean;
  existingAccount?: boolean;
  setupIssue?: string;
  error?: string;
}

function requestOrigin(): string {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost || requestHeaders.get('host');
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https');

  if (!host) {
    throw new Error('Unable to determine signup callback host');
  }

  return `${protocol}://${host}`;
}

function requestIp(): string {
  const requestHeaders = headers();
  const forwarded = requestHeaders.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || requestHeaders.get('x-real-ip') || 'unknown';
}

/**
 * Creates the auth account and performs its privileged setup in one trusted
 * server action. The service-role writes are scoped exclusively to the user ID
 * returned by Supabase Auth; callers cannot choose a target account.
 */
export async function signUpAccount(input: SignUpAccountInput): Promise<SignUpAccountResult> {
  const ip = requestIp();
  const guard = await guardPublicSubmission(
    typeof input === 'object' && input ? (input as { website?: unknown }).website : undefined,
    () => checkRateLimit('signup', ip, RATE_LIMITS.auth),
  );
  if (guard.silentlyDrop) {
    return { ok: true, needsEmailConfirmation: true };
  }
  if (!guard.allowed) {
    return {
      ok: false,
      error: `Too many signup attempts. Please try again in ${guard.retryAfter || 60} seconds.`,
    };
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Please check your signup information and try again.' };
  }

  const values = parsed.data;
  const phone = normalizeToE164(values.phone);
  if (!phone) {
    return { ok: false, error: 'Please enter a valid US phone number.' };
  }
  if (values.role === 'cleaner' && !values.zipCode) {
    return { ok: false, error: 'Please enter a valid five-digit service ZIP code.' };
  }

  const supabase = await createClient();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${requestOrigin()}/auth/callback`,
      data: {
        role: values.role,
        full_name: values.fullName,
        business_name: values.businessName || undefined,
      },
    },
  });

  if (signUpError) {
    return { ok: false, error: signUpError.message };
  }
  if (!authData.user) {
    return { ok: false, error: 'Account creation did not complete. Please try again.' };
  }
  if (!authData.user.identities || authData.user.identities.length === 0) {
    return {
      ok: false,
      existingAccount: true,
      error: 'An account with this email already exists. Please sign in instead.',
    };
  }

  const userId = authData.user.id;
  const admin = createServiceRoleClient();
  const userAgent = headers().get('user-agent') || 'unknown';
  const { error: profileError } = await admin
    .from('users')
    .update({
      phone,
      full_name: values.fullName,
      tcpa_consent_at: new Date().toISOString(),
      tcpa_consent_ip: ip,
      tcpa_consent_ua: userAgent.slice(0, 512),
    })
    .eq('id', userId);

  let setupIssue = profileError ? 'your phone number' : undefined;

  if (values.role === 'cleaner' && values.zipCode) {
    const { data: servedZip } = await admin
      .from('florida_zipcodes')
      .select('zip_code')
      .eq('zip_code', values.zipCode)
      .maybeSingle();

    if (!servedZip) {
      setupIssue = setupIssue
        ? `${setupIssue} or your service ZIP code`
        : 'your service ZIP code';
    } else {
      const { data: pro, error: proReadError } = await admin
        .from('pros')
        .select('id, service_areas')
        .eq('user_id', userId)
        .maybeSingle();

      if (proReadError || !pro) {
        setupIssue = setupIssue
          ? `${setupIssue} or your service ZIP code`
          : 'your service ZIP code';
      } else {
        const currentAreas: string[] = pro.service_areas ?? [];
        if (!currentAreas.includes(values.zipCode)) {
          const { error: areaError } = await admin
            .from('pros')
            .update({ service_areas: [...currentAreas, values.zipCode] })
            .eq('id', pro.id)
            .eq('user_id', userId);
          if (areaError) {
            setupIssue = setupIssue
              ? `${setupIssue} or your service ZIP code`
              : 'your service ZIP code';
          }
        }
      }
    }
  }

  return {
    ok: true,
    needsEmailConfirmation: !authData.session,
    setupIssue,
  };
}
