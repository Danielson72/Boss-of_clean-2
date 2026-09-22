import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isFreshSignup, saveSignupDetailsCore, type SignupDetailsInput, type SignupDeps } from '../../lib/actions/signup-core';

test('existing-email signup stub is not treated as a new account', () => {
  expect(isFreshSignup({ identities: [] })).toBe(false);
  expect(isFreshSignup(null)).toBe(false);
  expect(isFreshSignup({ identities: [{}] })).toBe(true);
});

type Row = Record<string, unknown>;
const NEW_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const NONCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function setup(ageMs = 0) {
  const tables: Record<string, Row[]> = {
    users: [
      { id: NEW_ID, role: 'cleaner', phone: null },
      { id: OTHER_ID, role: 'cleaner', phone: 'original' },
    ],
    pros: [
      { id: 'new-pro', user_id: NEW_ID, service_areas: [] },
      { id: 'other-pro', user_id: OTHER_ID, service_areas: ['32801'] },
    ],
    florida_zipcodes: [{ zip_code: '32703' }],
  };
  const writes: Array<{ table: string; ids: unknown[] }> = [];
  let authReads = 0;
  const adminClient = {
    auth: {
      admin: {
        getUserById: async (id: string) => {
          authReads++;
          const user = id === NEW_ID
            ? { id, created_at: new Date(Date.now() - ageMs).toISOString(), user_metadata: { signup_nonce: NONCE } }
            : id === OTHER_ID
              ? { id, created_at: new Date().toISOString(), user_metadata: { signup_nonce: 'different' } }
              : null;
          return { data: { user }, error: null };
        },
      },
    },
    from(table: string) {
      let changes: Row | null = null;
      let filter: { column: string; value: unknown } | null = null;
      const matching = () => tables[table].filter((row) => !filter || row[filter.column] === filter.value);
      const run = () => {
        const rows = matching();
        if (changes) {
          rows.forEach((row) => Object.assign(row, changes));
          writes.push({ table, ids: rows.map((row) => row.id ?? row.zip_code) });
        }
        return { data: rows[0] ?? null, error: null };
      };
      const query = {
        select: () => query,
        update: (value: Row) => { changes = value; return query; },
        eq: (column: string, value: unknown) => { filter = { column, value }; return query; },
        maybeSingle: async () => run(),
        then: (resolve: (result: ReturnType<typeof run>) => unknown) => Promise.resolve(resolve(run())),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const deps: SignupDeps = {
    adminClient,
    ip: '203.0.113.9',
    userAgent: 'unit-test',
    checkLimit: async () => true,
  };
  const input: SignupDetailsInput = {
    userId: NEW_ID,
    nonce: NONCE,
    fullName: 'New Person',
    businessName: 'Local Services',
    phone: '(407) 555-0100',
    zipCode: '32703',
    consented: true,
  };
  return { deps, input, tables, writes, get authReads() { return authReads; } };
}

test('fresh signup proof writes consent and ZIP only for its new account', async () => {
  const state = setup();
  const beforeOther = JSON.stringify({ user: state.tables.users[1], pro: state.tables.pros[1] });

  expect(await saveSignupDetailsCore(state.input, state.deps)).toEqual({ ok: true, setupIssue: undefined });
  expect(state.tables.users[0].phone).toBe('+14075550100');
  expect(state.tables.users[0].tcpa_consent_ip).toBe('203.0.113.9');
  expect(state.tables.pros[0].service_areas).toEqual(['32703']);
  expect(JSON.stringify({ user: state.tables.users[1], pro: state.tables.pros[1] })).toBe(beforeOther);
  expect(state.writes).toEqual([
    { table: 'users', ids: [NEW_ID] },
    { table: 'pros', ids: ['new-pro'] },
  ]);
});

test('another account ID with the wrong proof causes no elevated writes', async () => {
  const state = setup();
  const result = await saveSignupDetailsCore({ ...state.input, userId: OTHER_ID }, state.deps);
  expect(result.ok).toBe(false);
  expect(state.writes).toEqual([]);
});

test('an old signup proof cannot be replayed', async () => {
  const state = setup(16 * 60 * 1000);
  expect((await saveSignupDetailsCore(state.input, state.deps)).ok).toBe(false);
  expect(state.writes).toEqual([]);
});

test('missing consent and rate limit stop before account lookup or writes', async () => {
  const state = setup();
  expect((await saveSignupDetailsCore({ ...state.input, consented: false }, state.deps)).ok).toBe(false);
  expect(state.authReads).toBe(0);

  state.deps.checkLimit = async () => false;
  expect((await saveSignupDetailsCore(state.input, state.deps)).ok).toBe(false);
  expect(state.authReads).toBe(0);
  expect(state.writes).toEqual([]);
});
