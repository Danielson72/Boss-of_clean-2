import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { submitQuoteRequestCore, type SubmitQuoteDeps } from '../../app/quote-request/submit-core';
import type { NewLeadEmailData } from '../../lib/email/notifications';

/**
 * Submits a quote through the server-action body (submit-core) with Resend
 * mocked and an in-memory Supabase fake, and asserts the new-lead fan-out:
 *   - exactly one Resend send for the one matched pro
 *   - exactly one notification_logs row, ending in delivery_state 'dispatched'
 *   - exactly one notifications row (type new_lead, read=false) for that pro
 * Also covers: no notification_preferences row => email still sent (default ON),
 * and an explicit email_enabled=false row => 'unsubscribed', no send.
 */

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const PRO_USER_ID = '22222222-2222-4222-8222-222222222222';
const PRO_ID = '33333333-3333-4333-8333-333333333333';
const QUOTE_ID = '44444444-4444-4444-8444-444444444444';

type Row = Record<string, unknown>;
type Fault = { table: string; op: 'insert' | 'update'; throws?: boolean };

/** Minimal chainable PostgREST fake: enough surface for submit-core + new-lead. */
function makeFakeSupabase(opts: {
  userId: string | null;
  tables: Record<string, Row[]>;
  fault?: Fault;
}) {
  const tables = opts.tables;
  const writes: { table: string; op: 'insert' | 'update'; row: Row }[] = [];

  function builder(table: string) {
    const rows = () => (tables[table] ??= []);
    let filters: Array<(r: Row) => boolean> = [];
    let pending: { op: 'insert' | 'update'; row: Row } | null = null;
    let wantSingle: 'single' | 'maybe' | null = null;
    let head = false;

    const apply = () => rows().filter((r) => filters.every((f) => f(r)));

    const exec = () => {
      if (opts.fault?.table === table && opts.fault.op === pending?.op) {
        if (opts.fault.throws) throw new Error('Simulated database failure');
        return { data: null, error: { message: 'Simulated database failure' } };
      }
      if (pending?.op === 'insert') {
        const row = { id: pending.row.id ?? `${table}-${rows().length + 1}`, ...pending.row };
        rows().push(row);
        writes.push({ table, op: 'insert', row });
        return { data: wantSingle ? row : [row], error: null, count: 1 };
      }
      if (pending?.op === 'update') {
        const matched = apply();
        matched.forEach((r) => Object.assign(r, pending!.row));
        writes.push({ table, op: 'update', row: pending.row });
        return { data: wantSingle ? matched[0] ?? null : matched, error: null, count: matched.length };
      }
      const matched = apply();
      if (head) return { data: null, error: null, count: matched.length };
      if (wantSingle === 'single') {
        return matched.length === 1
          ? { data: matched[0], error: null }
          : { data: null, error: { code: matched.length === 0 ? 'PGRST116' : 'PGRST117', message: 'single() mismatch' } };
      }
      if (wantSingle === 'maybe') return { data: matched[0] ?? null, error: null };
      return { data: matched, error: null, count: matched.length };
    };

    const q: Record<string, unknown> = {
      select: (_cols?: string, o?: { head?: boolean }) => {
        head = !!o?.head;
        return q;
      },
      insert: (row: Row) => {
        pending = { op: 'insert', row };
        return q;
      },
      update: (row: Row) => {
        pending = { op: 'update', row };
        return q;
      },
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return q;
      },
      contains: (col: string, vals: unknown[]) => {
        filters.push((r) => Array.isArray(r[col]) && vals.every((v) => (r[col] as unknown[]).includes(v)));
        return q;
      },
      order: () => q,
      limit: () => q,
      single: () => {
        wantSingle = 'single';
        return q;
      },
      maybeSingle: () => {
        wantSingle = 'maybe';
        return q;
      },
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve().then(exec).then(resolve, reject),
    };
    return q;
  }

  const client = {
    auth: {
      getUser: async () =>
        opts.userId
          ? { data: { user: { id: opts.userId } }, error: null }
          : { data: { user: null }, error: { message: 'no session' } },
    },
    from: (table: string) => builder(table),
  };

  return { client: client as unknown as SupabaseClient, tables, writes };
}

function baseTables(extra: Record<string, Row[]> = {}): Record<string, Row[]> {
  return {
    users: [{ id: CUSTOMER_ID, full_name: 'Test Customer', email: 'customer@example.test' }],
    quote_requests: [],
    pros: [
      {
        id: PRO_ID,
        user_id: PRO_USER_ID,
        business_name: 'Test Pro LLC',
        business_phone: null,
        approval_status: 'approved',
        email_opted_in: true,
        service_areas: ['33101'],
        user: { email: 'pro@example.test' },
      },
    ],
    notifications: [],
    notification_logs: [],
    notification_preferences: [],
    ...extra,
  };
}

function makeDeps(tables: Record<string, Row[]>, fault?: Fault) {
  const customerDb = makeFakeSupabase({ userId: CUSTOMER_ID, tables });
  // Service-role client shares the same in-memory tables.
  const adminDb = makeFakeSupabase({ userId: null, tables, fault });

  // Resend mock: force the inserted quote id so assertions can reference it.
  const resendCalls: NewLeadEmailData[] = [];
  const confirmationCalls: unknown[] = [];
  const deps: SubmitQuoteDeps = {
    ip: '203.0.113.9',
    supabase: customerDb.client,
    adminSupabase: adminDb.client,
    sendNewLeadEmail: async (data) => {
      resendCalls.push(data);
      return { success: true, id: 're_mock_123' };
    },
    sendQuoteConfirmationEmail: async (data) => {
      confirmationCalls.push(data);
      return { success: true, id: 're_mock_conf' };
    },
    sendAdminOpsAlert: async () => undefined,
    notifyProBySms: async () => undefined,
  };
  return { deps, tables, resendCalls, confirmationCalls, writes: [...customerDb.writes, ...adminDb.writes], adminDb, customerDb };
}

const QUOTE = {
  service_type: 'house_cleaning',
  property_type: 'home' as const,
  zip_code: '33101',
  city: 'Miami',
  bedrooms: 3,
  bathrooms: 2,
  preferred_date: '2026-09-20',
  flexibility: 'flexible' as const,
  tcpa_user_agent: 'unit-test',
};

test('quote submit → one Resend call, one notification_logs row (dispatched), one notifications row', async () => {
  const tables = baseTables();
  // Pre-seed the id the fake will assign to the quote row so it is stable.
  const { deps, resendCalls, confirmationCalls } = makeDeps(tables);
  (tables.quote_requests as Row[]).length = 0;

  const result = await submitQuoteRequestCore(QUOTE, deps);

  expect(result.success).toBe(true);
  expect(result.matchCount).toBe(1);
  expect(result.quoteId).toBeTruthy();

  // Exactly one pro email via Resend, addressed to the pro, referencing the quote.
  expect(resendCalls).toHaveLength(1);
  expect(resendCalls[0].to).toBe('pro@example.test');
  expect(resendCalls[0].leadId).toBe(result.quoteId);
  expect(resendCalls[0].zipCode).toBe('33101');

  // Exactly one notification_logs row, for the pro, email/resend, dispatched with provider id.
  expect(tables.notification_logs).toHaveLength(1);
  const log = tables.notification_logs[0];
  expect(log.recipient_id).toBe(PRO_USER_ID);
  expect(log.recipient_channel).toBe('email');
  expect(log.provider).toBe('resend');
  expect(log.event_type).toBe('new_lead');
  expect(log.quote_request_id).toBe(result.quoteId);
  expect(log.delivery_state).toBe('dispatched');
  expect(log.provider_message_id).toBe('re_mock_123');
  expect(log.dispatched_at).toBeTruthy();

  // Exactly one in-app notification for the pro, unread, pointing at quote-requests.
  expect(tables.notifications).toHaveLength(1);
  const notif = tables.notifications[0];
  expect(notif.user_id).toBe(PRO_USER_ID);
  expect(notif.type).toBe('new_lead');
  expect(notif.action_url).toBe('/dashboard/pro/quote-requests');
  expect(notif.read ?? false).toBe(false);

  // Customer confirmation was awaited and sent once.
  expect(confirmationCalls).toHaveLength(1);

  // Operational dispatch details must not reach the customer.
  expect(Object.keys(result).sort()).toEqual(['matchCount', 'quoteId', 'success']);
});

test('no notification_preferences row → email still sent (default ON)', async () => {
  const tables = baseTables({ notification_preferences: [] });
  const { deps, resendCalls } = makeDeps(tables);
  const result = await submitQuoteRequestCore(QUOTE, deps);
  expect(result.success).toBe(true);
  expect(resendCalls).toHaveLength(1);
  expect(tables.notification_logs[0].delivery_state).toBe('dispatched');
});

test('explicit email_enabled=false → no Resend call, log row unsubscribed, in-app row still created', async () => {
  const tables = baseTables({
    notification_preferences: [{ user_id: PRO_USER_ID, email_enabled: false }],
  });
  const { deps, resendCalls } = makeDeps(tables);
  const result = await submitQuoteRequestCore(QUOTE, deps);
  expect(result.success).toBe(true);
  expect(resendCalls).toHaveLength(0);
  expect(tables.notification_logs).toHaveLength(1);
  expect(tables.notification_logs[0].delivery_state).toBe('unsubscribed');
  expect(tables.notifications).toHaveLength(1);
});

test('Resend failure → log row failed with error, submission still succeeds', async () => {
  const tables = baseTables();
  const { deps } = makeDeps(tables);
  deps.sendNewLeadEmail = async () => ({ success: false, error: 'RESEND_API_KEY is not set' });
  const result = await submitQuoteRequestCore(QUOTE, deps);
  expect(result.success).toBe(true);
  expect(tables.notification_logs).toHaveLength(1);
  expect(tables.notification_logs[0].delivery_state).toBe('failed');
  expect(tables.notification_logs[0].failed_at).toBeTruthy();
  expect((tables.notification_logs[0].provider_response_raw as { error: string }).error).toContain('RESEND_API_KEY');
  expect(result).not.toHaveProperty('notified');
});


test('email_opted_in=false overrides email_enabled=true', async () => {
  const tables = baseTables({ notification_preferences: [{ user_id: PRO_USER_ID, email_enabled: true }] });
  tables.pros[0].email_opted_in = false;
  const { deps, resendCalls } = makeDeps(tables);
  const result = await submitQuoteRequestCore(QUOTE, deps);
  expect(result.success).toBe(true);
  expect(resendCalls).toHaveLength(0);
  expect(tables.notification_logs[0].delivery_state).toBe('unsubscribed');
});

test('email_opted_in=false with missing preferences does not send', async () => {
  const tables = baseTables();
  tables.pros[0].email_opted_in = false;
  const { deps, resendCalls } = makeDeps(tables);
  await submitQuoteRequestCore(QUOTE, deps);
  expect(resendCalls).toHaveLength(0);
  expect(tables.notification_logs[0].delivery_state).toBe('unsubscribed');
});

for (const throws of [false, true]) {
  test(`log insert failure (throws=${throws}) prevents email`, async () => {
    const tables = baseTables();
    const { deps, resendCalls } = makeDeps(tables, { table: 'notification_logs', op: 'insert', throws });
    expect((await submitQuoteRequestCore(QUOTE, deps)).success).toBe(true);
    expect(resendCalls).toHaveLength(0);
    expect(tables.notification_logs).toHaveLength(0);
  });

  test(`in-app insert failure (throws=${throws}) still sends email`, async () => {
    const tables = baseTables();
    const { deps, resendCalls } = makeDeps(tables, { table: 'notifications', op: 'insert', throws });
    await submitQuoteRequestCore(QUOTE, deps);
    expect(resendCalls).toHaveLength(1);
    expect(tables.notification_logs[0].delivery_state).toBe('dispatched');
  });

  for (const success of [true, false]) {
    test(`log update failure (throws=${throws}, sent=${success}) leaves no queued row`, async () => {
      const tables = baseTables();
      const { deps } = makeDeps(tables, { table: 'notification_logs', op: 'update', throws });
      let calls = 0;
      deps.sendNewLeadEmail = async () => {
        calls++;
        return success ? { success: true, id: 'provider-id' } : { success: false, error: 'Send failed' };
      };
      expect((await submitQuoteRequestCore(QUOTE, deps)).success).toBe(true);
      expect(calls).toBe(1);
      expect(tables.notification_logs[0].delivery_state).toBe('failed');
      expect(tables.notification_logs[0].provider_response_raw).toEqual({ error: 'Dispatch outcome not recorded; check server logs before retrying.' });
    });
  }
}
