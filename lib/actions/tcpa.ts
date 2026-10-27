'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { recordProSmsConsentCore, revokeProSmsConsentCore } from './tcpa-core';

function clientIp(): string {
  const requestHeaders = headers();
  const forwarded = requestHeaders.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : (requestHeaders.get('x-real-ip') || 'unknown');
}

export async function recordProSmsConsent(): Promise<void> {
  return recordProSmsConsentCore(
    await createClient(),
    clientIp(),
    headers().get('user-agent') || 'unknown'
  );
}

export async function revokeProSmsConsent(): Promise<void> {
  return revokeProSmsConsentCore(await createClient());
}
