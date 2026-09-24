import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordProSmsConsentCore, revokeProSmsConsentCore } from '../../lib/actions/tcpa-core';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
type Row = Record<string, unknown>;

function fakeClient(signedInId: string | null) {
  const rows: Record<string, Row[]> = {
    pros: [
      { user_id: USER_A, business_phone: '+14075550100', sms_consent_at: null },
      { user_id: USER_B, business_phone: '+14075550200', sms_consent_at: 'original' },
    ],
    notification_preferences: [
      { user_id: USER_A, sms_enabled: false },
      { user_id: USER_B, sms_enabled: true },
    ],
  };
  const writes: Array<{ table: string; userIds: unknown[] }> = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: signedInId ? { id: signedInId } : null }, error: null }),
    },
    from(table: string) {
      let filter: { column: string; value: unknown } | null = null;
      let changes: Row | null = null;
      let upsert: Row | null = null;
      const matching = () => rows[table].filter((row) => !filter || row[filter.column] === filter.value);
      const run = () => {
        if (upsert) {
          const row = rows[table].find((item) => item.user_id === upsert!.user_id);
          if (row) Object.assign(row, upsert);
          else rows[table].push(upsert);
          writes.push({ table, userIds: [upsert.user_id] });
          return { data: null, error: null };
        }
        const selected = matching();
        if (changes) {
          selected.forEach((row) => Object.assign(row, changes));
          writes.push({ table, userIds: selected.map((row) => row.user_id) });
        }
        return { data: selected[0] ?? null, error: null };
      };
      const query = {
        select: () => query,
        update: (value: Row) => { changes = value; return query; },
        upsert: (value: Row) => { upsert = value; return query; },
        eq: (column: string, value: unknown) => { filter = { column, value }; return query; },
        single: async () => run(),
        then: (resolve: (result: ReturnType<typeof run>) => unknown) => Promise.resolve(resolve(run())),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, rows, writes };
}

test('a signed-in pro can change only their own SMS consent', async () => {
  const state = fakeClient(USER_A);
  const otherBefore = JSON.stringify({ pro: state.rows.pros[1], preferences: state.rows.notification_preferences[1] });

  await recordProSmsConsentCore(state.client, '203.0.113.9', 'unit-test');
  expect(state.rows.pros[0].sms_consent_phone).toBe('+14075550100');
  expect(state.rows.notification_preferences[0].sms_enabled).toBe(true);

  await revokeProSmsConsentCore(state.client);
  expect(state.rows.pros[0].sms_consent_at).toBeNull();
  expect(state.rows.notification_preferences[0].sms_enabled).toBe(false);
  expect(JSON.stringify({ pro: state.rows.pros[1], preferences: state.rows.notification_preferences[1] })).toBe(otherBefore);
  expect(state.writes.every((write) => write.userIds.every((id) => id === USER_A))).toBe(true);
});

test('an anonymous caller cannot record or revoke pro SMS consent', async () => {
  const state = fakeClient(null);
  await expect(recordProSmsConsentCore(state.client, '203.0.113.9', 'unit-test')).rejects.toThrow('Sign in required');
  await expect(revokeProSmsConsentCore(state.client)).rejects.toThrow('Sign in required');
  expect(state.writes).toEqual([]);
});
