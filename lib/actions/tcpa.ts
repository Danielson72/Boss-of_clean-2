'use server';

import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function recordUserTcpaConsent(userId: string, userAgent: string): Promise<void> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : (headersList.get('x-real-ip') || 'unknown');

  const supabase = createServiceRoleClient();
  await supabase
    .from('users')
    .update({
      tcpa_consent_at: new Date().toISOString(),
      tcpa_consent_ip: ip,
      tcpa_consent_ua: userAgent.slice(0, 512),
    })
    .eq('id', userId);
}
