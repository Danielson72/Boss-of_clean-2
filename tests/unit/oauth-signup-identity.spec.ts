import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { completeSignupCore, type CompleteSignupDeps, type CompleteSignupInput } from '../../lib/actions/oauth-signup-core';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
type Row = Record<string, unknown>;

function setup(userId: string | null) {
  const tables: Record<string, Row[]> = {
    users: [
      { id: USER_A, role: 'customer', phone: null, tcpa_consent_at: null },
      { id: USER_B, role: 'customer', phone: 'original', tcpa_consent_at: 'original' },
    ],
    pros: [{ id: 'other-pro', user_id: USER_B, service_areas: ['32801'] }],
    florida_zipcodes: [{ zip_code: '32703' }],
  };
  const writes: Array<{ table: string; ids: unknown[] }> = [];
  const adminClient = {
    from(table: string) {
      let filter: { column: string; value: unknown } | null = null;
      let update: Row | null = null;
      let insert: Row | null = null;
      const matching = () => tables[table].filter((row) => !filter || row[filter.column] === filter.value);
      const run = () => {
        if (insert) {
          tables[table].push({ id: `new-${table}`, ...insert });
          writes.push({ table, ids: [insert.user_id] });
          return { data: null, error: null };
        }
        const rows = matching();
        if (update) {
          rows.forEach((row) => Object.assign(row, update));
          writes.push({ table, ids: rows.map((row) => row.id ?? row.zip_code) });
        }
        return { data: rows[0] ?? null, error: null };
      };
      const query = {
        select: () => query,
        update: (value: Row) => { update = value; return query; },
        insert: (value: Row) => { insert = value; return query; },
        eq: (column: string, value: unknown) => { filter = { column, value }; return query; },
        maybeSingle: async () => run(),
        then: (resolve: (result: ReturnType<typeof run>) => unknown) => Promise.resolve(resolve(run())),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const userClient = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
  } as unknown as SupabaseClient;
  const deps: CompleteSignupDeps = {
    userClient, adminClient, ip: '203.0.113.9', userAgent: 'unit-test', checkLimit: async () => true,
  };
  const input: CompleteSignupInput = {
    role: 'cleaner', phone: '(407) 555-0100', businessName: 'Local Services', zipCode: '32703', consented: true,
  };
  return { deps, input, tables, writes };
}

test('Google signup completion writes only the signed-in account', async () => {
  const state = setup(USER_A);
  const otherBefore = JSON.stringify({ user: state.tables.users[1], pro: state.tables.pros[0] });

  expect(await completeSignupCore(state.input, state.deps)).toEqual({ ok: true, role: 'cleaner' });
  expect(state.tables.users[0].role).toBe('cleaner');
  expect(state.tables.users[0].phone).toBe('+14075550100');
  expect(state.tables.pros[1].user_id).toBe(USER_A);
  expect(state.tables.pros[1].service_areas).toEqual(['32703']);
  expect(JSON.stringify({ user: state.tables.users[1], pro: state.tables.pros[0] })).toBe(otherBefore);
  expect(state.writes).toEqual([
    { table: 'pros', ids: [USER_A] },
    { table: 'users', ids: [USER_A] },
  ]);
});

test('anonymous completion cannot write an account', async () => {
  const state = setup(null);
  expect((await completeSignupCore(state.input, state.deps)).ok).toBe(false);
  expect(state.writes).toEqual([]);
});

test('a completed account cannot repeat signup writes', async () => {
  const state = setup(USER_B);
  expect(await completeSignupCore(state.input, state.deps)).toEqual({ ok: true, role: 'customer' });
  expect(state.writes).toEqual([]);
});

test('a pro with consent but no service area can finish setup', async () => {
  const state = setup(USER_A);
  state.tables.users[0].role = 'cleaner';
  state.tables.users[0].phone = '+14075550100';
  state.tables.users[0].tcpa_consent_at = 'original';
  state.tables.pros.push({ id: 'new-pro', user_id: USER_A, service_areas: [] });

  expect(await completeSignupCore(state.input, state.deps)).toEqual({ ok: true, role: 'cleaner' });
  expect(state.tables.pros[1].service_areas).toEqual(['32703']);
});
