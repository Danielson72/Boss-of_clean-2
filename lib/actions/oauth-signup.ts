'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';
import {
  completeSignupCore,
  type CompleteSignupInput,
  type CompleteSignupResult,
} from './oauth-signup-core';

export async function completeOauthSignup(input: CompleteSignupInput): Promise<CompleteSignupResult> {
  const requestHeaders = headers();
  const ip = requestHeaders.get('x-nf-client-connection-ip')
    || requestHeaders.get('x-forwarded-for')?.split(',')[0].trim()
    || requestHeaders.get('x-real-ip')
    || 'unknown';

  return completeSignupCore(input, {
    userClient: await createClient(),
    adminClient: createServiceRoleClient(),
    ip,
    userAgent: requestHeaders.get('user-agent') || 'unknown',
    checkLimit: async (userId) => {
      const result = await checkRateLimit('complete-signup', userId, RATE_LIMITS.auth);
      return result.allowed;
    },
  });
}
