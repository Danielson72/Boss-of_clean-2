'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { guardPublicSubmission } from '@/lib/security/submission-guard';

const requestSchema = z.object({
  email: z.string().trim().email(),
  website: z.string().max(0).optional(),
});

function clientIp(): string {
  const requestHeaders = headers();
  const forwarded = requestHeaders.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || requestHeaders.get('x-real-ip') || 'unknown';
}

function origin(): string {
  const requestHeaders = headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
  if (!host) throw new Error('Unable to determine password reset callback host');
  return `${protocol}://${host}`;
}

export async function requestPasswordReset(input: {
  email: string;
  website?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const guard = await guardPublicSubmission(
    input.website,
    () => checkRateLimit('password-reset', clientIp(), RATE_LIMITS.passwordReset),
  );
  if (guard.silentlyDrop) return { ok: true };
  if (!guard.allowed) {
    return { ok: false, error: 'Too many reset requests. Please try again later.' };
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Please enter a valid email address.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin()}/auth/callback?next=/auth/reset-password`,
  });
  if (error) return { ok: false, error: 'We could not send reset instructions. Please try again.' };
  return { ok: true };
}
