'use server';

import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import { saveSignupDetailsCore, type SignupDetailsInput, type SignupResult } from './signup-core';

export async function saveSignupDetails(input: SignupDetailsInput): Promise<SignupResult> {
  const requestHeaders = headers();
  const ip = requestHeaders.get('x-nf-client-connection-ip')
    || requestHeaders.get('x-forwarded-for')?.split(',')[0].trim()
    || requestHeaders.get('x-real-ip')
    || 'unknown';
  return saveSignupDetailsCore(input, {
    adminClient: createServiceRoleClient(),
    ip,
    userAgent: requestHeaders.get('user-agent') || 'unknown',
    checkLimit: async () => {
      const result = await checkRateLimit('signup', ip, RATE_LIMITS.auth);
      return result.allowed;
    },
  });
}
