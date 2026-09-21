import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateCallerConsent } from '../../lib/actions/tcpa-core';

test('user A cannot use a privileged consent update to mutate user B', async () => {
  const rows = [
    { id: 'user-a', phone: 'old-a' },
    { id: 'user-b', phone: 'old-b' },
  ];

  const admin = {
    from: () => ({
      update: (update: Record<string, unknown>) => ({
        eq: async (_column: string, value: string) => {
          const row = rows.find((candidate) => candidate.id === value);
          if (row) Object.assign(row, update);
          return { error: null };
        },
      }),
    }),
  } as unknown as SupabaseClient;

  await updateCallerConsent(admin, 'user-a', {
    tcpa_consent_at: '2026-09-20T00:00:00.000Z',
    tcpa_consent_ip: '192.0.2.1',
    tcpa_consent_ua: 'test-agent',
    phone: 'new-a',
  });

  expect(rows.find((row) => row.id === 'user-a')?.phone).toBe('new-a');
  expect(rows.find((row) => row.id === 'user-b')?.phone).toBe('old-b');
});
