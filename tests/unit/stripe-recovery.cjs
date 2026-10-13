// Offline integration harness: real services/route, synthetic process env,
// entirely mocked Stripe/Supabase/email. SQL concurrency is modeled explicitly;
// this suite does not execute PostgreSQL or prove its locking implementation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let db, deliveredEvent, latestSubscription, mailResult = true, sentMail = 0;
const logger = new Proxy({}, { get: () => () => {} });
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'next/headers') return { headers: () => ({ get: () => 'mock_signature' }) };
  if (request.includes('stripe/disputes')) return {};
  if (request === '@/lib/stripe/config' || (request === './config' && parent.filename.includes('/lib/stripe/'))) return { ...original.call(this, path.resolve('lib/stripe/config.ts'), parent, main), stripe: { subscriptions: { retrieve: async () => typeof latestSubscription === 'function' ? latestSubscription() : latestSubscription } }, getStripe: () => ({ webhooks: { constructEvent: () => deliveredEvent } }) };
  if (request.includes('supabase/service-role')) return { createServiceRoleClient: () => db };
  if (request === '@/lib/supabase/server') return { createClient: async () => { throw new Error('Unexpected user DB call'); } };
  if (request.includes('utils/logger')) return { createLogger: () => logger };
  if (request.includes('stripe/dunning')) return { processDunningEvent: async () => {} };
  if (request.includes('email/lead-unlock')) return { sendAdminOpsAlert: async () => {}, sendAdminSaleNotification: async () => {}, sendLeadContactEmail: async () => { sentMail++; return mailResult; } };
  if (request.startsWith('@/')) request = path.resolve(request.slice(2));
  return original.call(this, request, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { WebhookEventService } = require('../../lib/stripe/webhook-event-service.ts');
const { SubscriptionService } = require('../../lib/stripe/subscription-service.ts');
const event = { id: 'evt_mock', type: 'invoice.paid', data: { object: { id: 'in_mock' } } };
const invoice = { id: 'in_mock', amount_paid: 3000, currency: 'usd', payment_intent: null, parent: { subscription_details: { subscription: 'sub_mock', metadata: { venture: 'boc' } } } };
const ledger = new WebhookEventService();
const subscriptions = new SubscriptionService();
const claimContext = (e, c) => ({ eventId: e.id, claimToken: c.claim_token });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

// A contract fake with a controllable clock and atomic rollback boundary.
// The behavior is assumed from the proposed RPC contract, not SQL-verified.
function database() {
  const records = new Map(), payments = new Map(), handoffs = new Map(), subscriptionRows = new Map(), snapshotReservations = new Map();
  let clock = 0, subscription = null, effects = 0, failAfterInsert = false, proLinked = false, subscriptionWrites = 0;
  let blocked, entered, acceptanceWrites = 0, proSubscriptionId = null, proOwnerId = null, proCreated = 0;
  const fake = {
    records, payments, handoffs, subscriptionRows,
    get proSubscriptionId() { return proSubscriptionId; },
    get proOwnerId() { return proOwnerId; },
    unknownLegacyOwner(id) { proSubscriptionId = id; proOwnerId = id; proCreated = 0; },
    get proLinked() { return proLinked; },
    get subscriptionWrites() { return subscriptionWrites; },
    get subscription() { return subscription; },
    get effects() { return effects; },
    get acceptanceWrites() { return acceptanceWrites; },
    subscriptionReady() { subscription = { cleaner_id: 'pro_mock' }; },
    legacyPartialSubscription() { subscription = { cleaner_id: 'pro_mock', stripe_subscription_id: 'sub_mock', tier: 'basic', status: 'active', eventCreated: 0 }; },
    expire() { clock += 301000; },
    failNextAfterInsert() { failAfterInsert = true; },
    blockNextFulfillment() { blocked = deferred(); entered = deferred(); return { entered: entered.promise, release: blocked.resolve }; },
    from(table) {
      if (table === 'notification_logs') {
        return { select() { return this; }, eq() { return this; }, in() { return this; }, or() { return this; }, order() { return this; }, limit() { return this; },
          then(resolve) { return Promise.resolve({ data: [...handoffs.entries()].filter(([, job]) => job.state !== 'accepted').map(([dedupe_hash]) => ({ dedupe_hash })) }).then(resolve); } };
      }
      const fixtures = {
        subscriptions: subscription,
        lead_acceptances: { status: 'captured' },
        pros: { business_name: 'Mock pro', business_email: 'mock@example.invalid', user_id: 'user_mock' },
        quote_requests: { city: 'Mock city', service_type: 'mock_service', customer: { full_name: 'Mock customer', email: 'customer@example.invalid', phone: null } },
      };
      assert.ok(table in fixtures);
      return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: fixtures[table] }), single: async () => ({ data: fixtures[table] }) };
    },
    async rpc(name, args) {
      if (name === 'claim_stripe_webhook_event') {
        const row = records.get(args.p_event_id);
        const isNew = !row || row.status === 'failed' || row.status === 'pending' || (row.status === 'processing' && row.at < clock - 300000 && row.recoverable);
        if (isNew) records.set(args.p_event_id, { status: 'processing', at: clock, token: args.p_claim_token, type: args.p_event_type, created: args.p_payload.created, recoverable: ['invoice.paid', 'invoice.payment_succeeded', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(args.p_event_type) || (args.p_event_type === 'checkout.session.completed' && args.p_payload.data.object.mode === 'payment' && args.p_payload.data.object.metadata?.type === 'lead_unlock') });
        return { data: [{ is_new: isNew, event_status: records.get(args.p_event_id).status, claim_token: isNew ? args.p_claim_token : null }] };
      }
      if (name === 'claim_paid_lead_handoff') {
        const job = handoffs.get(args.p_dedupe_hash);
        if (!job || job.state === 'accepted' || (job.state === 'dispatched' && job.at >= clock - 300000) || (job.nextAt && job.nextAt > clock)) return { data: [] };
        job.state = 'dispatched'; job.token = args.p_claim_token; job.at = clock;
        return { data: [{ id: args.p_dedupe_hash, quote_request_id: 'quote_mock', dispatch_context: { cleaner_id: 'pro_mock', lead_acceptance_id: 'accept_mock' } }] };
      }
      if (name === 'finish_paid_lead_handoff') {
        const job = handoffs.get(args.p_id);
        if (!job || job.token !== args.p_claim_token || job.state !== 'dispatched') return { error: { message: 'Handoff claim lost' } };
        job.state = args.p_success ? 'accepted' : 'failed'; job.nextAt = args.p_success ? null : clock + 120000;
        return {};
      }
      const row = records.get(args.p_event_id);
      const valid = () => { const current = records.get(args.p_event_id); return current && current.status === 'processing' && current.token === args.p_claim_token; };
      if (name === 'finish_stripe_webhook_event') {
        if (!valid()) return { error: { message: 'Webhook claim lost' } };
        row.status = args.p_error_message === null ? 'processed' : 'failed';
        row.at = clock;
        return {};
      }
      if (name === 'begin_stripe_subscription_sync') {
        if (!valid()) return { error: { message: 'Webhook claim lost' } };
        snapshotReservations.set(args.p_subscription_id, args.p_snapshot_token);
        return { data: true };
      }
      if (blocked) { const wait = blocked; blocked = null; entered.resolve(); await wait.promise; }
      if (!valid()) return { error: { message: 'Webhook claim lost' } };
      if (name === 'sync_stripe_subscription') {
        const snapshot = args.p_subscription;
        if (snapshotReservations.get(snapshot.stripe_subscription_id) !== args.p_snapshot_token) return { error: { message: 'Subscription snapshot superseded' } };
        if (failAfterInsert) { failAfterInsert = false; return { error: { message: 'Injected pro-link failure; transaction rolled back' } }; }
        const previous = subscriptionRows.get(snapshot.stripe_subscription_id) || (subscription?.stripe_subscription_id === snapshot.stripe_subscription_id ? subscription : null);
        if (previous?.status === 'canceled' && row.type !== 'customer.subscription.deleted') return { data: false };
        if (previous?.eventCreated > row.created) return { data: false };
        if (proOwnerId && proOwnerId !== snapshot.stripe_subscription_id && proCreated === 0) return { error: { message: 'Current subscription generation unknown; reconcile ownership first' } };
        if (snapshot.stripe_created === proCreated && (!proOwnerId || proOwnerId !== snapshot.stripe_subscription_id)) return { error: { message: 'Ambiguous equal-second subscription generations' } };
        subscription = row.type === 'customer.subscription.created' && previous ? { ...previous, stripe_created: snapshot.stripe_created } : { ...snapshot, eventCreated: row.created };
        subscriptionRows.set(snapshot.stripe_subscription_id, subscription); subscriptionWrites++;
        if (snapshot.stripe_created >= proCreated) {
          proOwnerId = snapshot.stripe_subscription_id;
          proCreated = snapshot.stripe_created; proLinked = subscription.status !== 'canceled';
          proSubscriptionId = proLinked ? snapshot.stripe_subscription_id : null;
        }
        return { data: true };
      }
      if (name === 'fulfill_stripe_lead_unlock') {
        if (payments.has(args.p_payment_intent_id)) return { data: false };
        if (failAfterInsert) { failAfterInsert = false; return { error: { message: 'Injected capture failure; transaction rolled back' } }; }
        payments.set(args.p_payment_intent_id, { amount: args.p_amount_cents / 100 });
        acceptanceWrites++;
        handoffs.set(`boc:lead-handoff:${args.p_payment_intent_id}`, { state: 'queued', at: clock });
        return { data: true };
      }
      assert.equal(name, 'fulfill_stripe_paid_invoice');
      assert.equal(args.p_subscription_id, 'sub_mock');
      if (!subscription) return { error: { message: 'Subscription not available yet' } };
      if (payments.has(args.p_invoice_id)) return { data: false };
      if (failAfterInsert) {
        failAfterInsert = false;
        return { error: { message: 'Injected dunning failure; transaction rolled back' } };
      }
      payments.set(args.p_invoice_id, { amount: args.p_amount_paid / 100, paymentIntent: args.p_payment_intent_id });
      effects++;
      return { data: true };
    },
  };
  return fake;
}

test('ledger outage and empty/malformed/tokenless claims fail closed', async () => {
  for (const response of [{ error: { message: 'offline' } }, { data: [] }, { data: [{ is_new: true, event_status: 'processed' }] }, { data: [{ is_new: true, event_status: 'processing' }] }]) {
    db = { rpc: async () => response };
    await assert.rejects(ledger.recordEvent(event));
  }
});
test('ledger completion failures remain retryable', async () => {
  db = { rpc: async () => ({ error: { message: 'offline' } }) };
  await assert.rejects(ledger.markProcessed(event.id, 'mock_token'));
  await assert.rejects(ledger.markFailed(event.id, 'mock_token', 'failure'));
});
test('simultaneous duplicate claims have one owner; crash lease gets a fresh token', async () => {
  db = database();
  const claims = await Promise.all([ledger.recordEvent(event), ledger.recordEvent(event)]);
  assert.equal(claims.filter(c => c.is_new).length, 1);
  db.expire();
  const recovery = await ledger.recordEvent(event);
  assert.equal(recovery.is_new, true);
  assert.notEqual(recovery.claim_token, claims[0].claim_token);
  await ledger.markProcessed(event.id, recovery.claim_token);
  assert.equal((await ledger.recordEvent(event)).event_status, 'processed');
});
test('unconverted failed-invoice handler is not reclaimed while old worker may still write', async () => {
  db = database();
  const unconverted = { ...event, type: 'invoice.payment_failed' };
  await ledger.recordEvent(unconverted); db.expire();
  assert.equal((await ledger.recordEvent(unconverted)).is_new, false);
});
test('expired worker cannot complete or fail the newer claim', async () => {
  db = database();
  const old = await ledger.recordEvent(event);
  db.expire();
  const current = await ledger.recordEvent(event);
  await assert.rejects(ledger.markProcessed(event.id, old.claim_token), /claim lost/);
  await assert.rejects(ledger.markFailed(event.id, old.claim_token, 'old error'), /claim lost/);
  assert.equal(db.records.get(event.id).status, 'processing');
  assert.equal(db.records.get(event.id).token, current.claim_token);
  await ledger.markProcessed(event.id, current.claim_token);
});
test('invoice before subscription stays retryable, then records once after replay', async () => {
  db = database();
  const first = await ledger.recordEvent(event);
  await assert.rejects(subscriptions.handlePaymentSucceeded(invoice, claimContext(event, first)), /not available yet/);
  await ledger.markFailed(event.id, first.claim_token, 'subscription not available');
  db.subscriptionReady();
  const retry = await ledger.recordEvent(event);
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(event, retry));
  await ledger.markProcessed(event.id, retry.claim_token);
  assert.equal(db.payments.size, 1);
  assert.equal(db.effects, 1);
});
test('different event IDs concurrently fulfilling invoice without payment intent apply effects once', async () => {
  db = database(); db.subscriptionReady();
  const other = { ...event, id: 'evt_other', type: 'invoice.payment_succeeded' };
  const [a, b] = await Promise.all([ledger.recordEvent(event), ledger.recordEvent(other)]);
  const gate = db.blockNextFulfillment();
  const first = subscriptions.handlePaymentSucceeded(invoice, claimContext(event, a));
  await gate.entered;
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(other, b));
  gate.release(); await first;
  assert.equal(db.payments.size, 1);
  assert.equal(db.payments.get(invoice.id).paymentIntent, null);
  assert.equal(db.effects, 1);
});
test('failure after payment insert rolls back effects; retry applies the entire invoice once', async () => {
  db = database(); db.subscriptionReady(); db.failNextAfterInsert();
  const first = await ledger.recordEvent(event);
  await assert.rejects(subscriptions.handlePaymentSucceeded(invoice, claimContext(event, first)), /rolled back/);
  assert.equal(db.payments.size, 0); assert.equal(db.effects, 0);
  await ledger.markFailed(event.id, first.claim_token, 'transaction failed');
  const retry = await ledger.recordEvent(event);
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(event, retry));
  // Worker dies after transaction, before marking the outer event processed.
  db.expire();
  const crashRetry = await ledger.recordEvent(event);
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(event, crashRetry));
  await ledger.markProcessed(event.id, crashRetry.claim_token);
  assert.equal(db.payments.size, 1); assert.equal(db.effects, 1);
});
test('stale invoice worker cannot fulfill after claim is reclaimed', async () => {
  db = database(); db.subscriptionReady();
  const old = await ledger.recordEvent(event);
  db.expire();
  const current = await ledger.recordEvent(event);
  await assert.rejects(subscriptions.handlePaymentSucceeded(invoice, claimContext(event, old)), /claim lost/);
  assert.equal(db.payments.size, 0); assert.equal(db.effects, 0);
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(event, current));
  assert.equal(db.payments.size, 1); assert.equal(db.effects, 1);
});
test('missing fulfillment result fails closed rather than acknowledging an invoice', async () => {
  db = database(); db.subscriptionReady();
  const claim = await ledger.recordEvent(event);
  db.rpc = async () => ({ data: null });
  await assert.rejects(subscriptions.handlePaymentSucceeded(invoice, claimContext(event, claim)), /no result/);
});
test('route returns 503 for active claims, then fulfills paid lead once across duplicates', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'offline_mock_only';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_mock_only';
  const { POST } = require('../../app/api/webhooks/stripe/route.ts');
  db = database();
  db.from = () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: null }) });
  deliveredEvent = { id: 'evt_lead_mock', type: 'checkout.session.completed', data: { object: {
    id: 'cs_mock', mode: 'payment', payment_status: 'paid', payment_intent: 'pi_mock', amount_total: 3000,
    metadata: { venture: 'boc', type: 'lead_unlock', quote_request_id: 'quote_mock', cleaner_id: 'pro_mock', amount_cents: '3000', lead_acceptance_id: 'accept_mock' },
  } } };
  await ledger.recordEvent(deliveredEvent); // Simulate original worker dying.
  const req = { text: async () => '{}' };
  assert.equal((await POST(req)).status, 503); assert.equal(db.acceptanceWrites, 0);
  db.expire();
  assert.equal((await POST(req)).status, 200);
  assert.equal((await POST(req)).status, 200);
  assert.equal(db.payments.size, 1); assert.equal(db.acceptanceWrites, 1);
});
test('reclaimed lead worker cannot write capture or overwrite processed recovery', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'offline_mock_only';
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_mock_only';
  const { POST } = require('../../app/api/webhooks/stripe/route.ts');
  db = database();
  db.from = () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: null }) });
  const gate = db.blockNextFulfillment();
  const old = POST({ text: async () => '{}' });
  await gate.entered;
  db.expire();
  assert.equal((await POST({ text: async () => '{}' })).status, 200);
  gate.release();
  assert.equal((await old).status, 500);
  assert.equal(db.records.get(deliveredEvent.id).status, 'processed');
  assert.equal(db.payments.size, 1); assert.equal(db.acceptanceWrites, 1);
});
test('lead payment/capture failure rolls back and can retry without duplicate writes', async () => {
  const { POST } = require('../../app/api/webhooks/stripe/route.ts');
  db = database(); db.failNextAfterInsert();
  db.from = () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: null }) });
  assert.equal((await POST({ text: async () => '{}' })).status, 200);
  assert.equal(db.payments.size, 1); assert.equal(db.acceptanceWrites, 1);
});
test('PR159 guards prevent webhook/unlock DB access when Stripe config is missing', async () => {
  const webhook = require('../../app/api/webhooks/stripe/route.ts');
  const unlock = require('../../app/api/leads/[quoteId]/unlock/route.ts');
  db = new Proxy({}, { get() { throw new Error('Unexpected DB access'); } });
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await webhook.POST({ text() { throw new Error('Unexpected body access'); } })).status, 503);
  assert.equal((await unlock.POST({}, { params: { quoteId: 'quote_mock' } })).status, 503);
  process.env.STRIPE_SECRET_KEY = 'sk_test_offline_mock_only';
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await webhook.POST({ text() { throw new Error('Unexpected body access'); } })).status, 503);
});

test('existing service-role helper still rejects missing credentials before constructing client', () => {
  const { createServiceRoleClient } = original.call(Module, path.resolve('lib/supabase/service-role.ts'), module, false);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.throws(() => createServiceRoleClient(), /Missing SUPABASE_SERVICE_ROLE_KEY/);
});

const subscriptionSnapshot = {
  id: 'sub_mock', created: 50, customer: 'cus_mock', status: 'active',
  metadata: { venture: 'boc', cleaner_id: 'pro_mock', tier: 'basic' },
  items: { data: [{ current_period_start: 1000, current_period_end: 2000 }] },
};
function subscriptionEvent(type = 'created', created = 100) {
  return { id: `evt_subscription_${type}_${created}`, created, type: `customer.subscription.${type}`, data: { object: subscriptionSnapshot } };
}
test('subscription-created crash is reclaimed and invoice-before-subscription can then complete', async () => {
  db = database();
  const createdEvent = subscriptionEvent();
  const old = await ledger.recordEvent(createdEvent); // worker dies before transaction
  const paidClaim = await ledger.recordEvent(event);
  await assert.rejects(subscriptions.handlePaymentSucceeded(invoice, claimContext(event, paidClaim)), /not available yet/);
  db.expire();
  const recovery = await ledger.recordEvent(createdEvent);
  assert.equal(recovery.is_new, true);
  await assert.rejects(subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(createdEvent, old)), /claim lost/);
  await subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(createdEvent, recovery));
  await ledger.markProcessed(createdEvent.id, recovery.claim_token);
  assert.equal(db.proLinked, true);
  const paidRetry = await ledger.recordEvent(event);
  await subscriptions.handlePaymentSucceeded(invoice, claimContext(event, paidRetry));
  assert.equal(db.payments.size, 1);
});
test('subscription insert/pro linkage roll back together; retry does not hit duplicate insert', async () => {
  db = database(); db.failNextAfterInsert();
  const e = subscriptionEvent(); const first = await ledger.recordEvent(e);
  await assert.rejects(subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(e, first)), /rolled back/);
  assert.equal(db.subscription, null); assert.equal(db.proLinked, false);
  await ledger.markFailed(e.id, first.claim_token, 'link failed');
  const retry = await ledger.recordEvent(e);
  await subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(e, retry));
  assert.equal(db.subscription.stripe_subscription_id, 'sub_mock'); assert.equal(db.proLinked, true);
});
test('legacy partial subscription creation repairs missing pro linkage without duplicate subscription', async () => {
  db = database(); db.legacyPartialSubscription();
  const e = subscriptionEvent(); const claim = await ledger.recordEvent(e);
  await subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(e, claim));
  assert.equal(db.proLinked, true); assert.equal(db.subscriptionWrites, 1);
  assert.equal(db.subscription.tier, 'basic');
});
test('delete-before-create makes a tombstone; delayed create cannot resurrect it', async () => {
  db = database();
  const deleted = subscriptionEvent('deleted', 200);
  const d = await ledger.recordEvent(deleted);
  await subscriptions.handleSubscriptionDeleted(subscriptionSnapshot, claimContext(deleted, d));
  const created = subscriptionEvent('created', 100);
  const c = await ledger.recordEvent(created);
  await subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(created, c));
  assert.equal(db.subscription.status, 'canceled'); assert.equal(db.proLinked, false);
});
test('subscription updated refreshes the Stripe snapshot and updates atomically with the claim', async () => {
  db = database(); latestSubscription = { ...subscriptionSnapshot, status: 'past_due' };
  const e = subscriptionEvent('updated', 200); const c = await ledger.recordEvent(e);
  await subscriptions.handleSubscriptionUpdated(subscriptionSnapshot, claimContext(e, c));
  assert.equal(db.subscription.status, 'past_due'); assert.equal(db.proLinked, true);
});
test('handoff job survives failed send and retries; successful send suppresses later sends', async () => {
  const { dispatchPaidLeadHandoff } = require('../../lib/notifications/paid-lead-handoff.ts');
  db = database(); const e = { ...event, id: 'evt_queue' }; const c = await ledger.recordEvent(e);
  const args = { p_event_id: e.id, p_claim_token: c.claim_token, p_payment_intent_id: 'pi_queue', p_amount_cents: 3000 };
  await db.rpc('fulfill_stripe_lead_unlock', args);
  assert.equal(db.handoffs.size, 1);
  // Simulate repeated fulfillment after an ambiguous commit response.
  await db.rpc('fulfill_stripe_lead_unlock', args); assert.equal(db.handoffs.size, 1);
  const sentBefore = sentMail; mailResult = false;
  assert.equal(await dispatchPaidLeadHandoff('pi_queue'), false);
  assert.equal(db.handoffs.get('boc:lead-handoff:pi_queue').state, 'failed');
  assert.equal(await dispatchPaidLeadHandoff('pi_queue'), false); // backoff
  assert.equal(sentMail, sentBefore + 1);
  db.expire(); mailResult = true;
  assert.equal(await dispatchPaidLeadHandoff('pi_queue'), true);
  assert.equal(await dispatchPaidLeadHandoff('pi_queue'), false);
  assert.equal(sentMail, sentBefore + 2);
  assert.equal(db.handoffs.get('boc:lead-handoff:pi_queue').state, 'accepted');
});
test('handoff crash before send is reclaimable and stale completion cannot overwrite recovery', async () => {
  db = database(); db.handoffs.set('boc:lead-handoff:pi_queue', { state: 'queued', at: 0 });
  const a = { p_dedupe_hash: 'boc:lead-handoff:pi_queue', p_claim_token: 'old' };
  await db.rpc('claim_paid_lead_handoff', a); db.expire();
  await db.rpc('claim_paid_lead_handoff', { ...a, p_claim_token: 'new' });
  const stale = await db.rpc('finish_paid_lead_handoff', { p_id: a.p_dedupe_hash, p_claim_token: 'old', p_success: true });
  assert.match(stale.error.message, /claim lost/);
  assert.equal(db.handoffs.get(a.p_dedupe_hash).token, 'new');
});

test('bounded outbox drain retries queued jobs after webhook process has exited', async () => {
  const { retryPendingPaidLeadHandoffs } = require('../../lib/notifications/paid-lead-handoff.ts');
  db = database(); mailResult = true;
  db.handoffs.set('boc:lead-handoff:pi_drain', { state: 'queued', at: 0 });
  assert.equal(await retryPendingPaidLeadHandoffs(), 1);
  assert.equal(await retryPendingPaidLeadHandoffs(), 0);
  assert.equal(db.handoffs.get('boc:lead-handoff:pi_drain').state, 'accepted');
});

test('replacement B creation is not vetoed by later old A update clock', async () => {
  db = database();
  const a = { ...subscriptionSnapshot, id: 'sub_A', created: 50 };
  const b = { ...subscriptionSnapshot, id: 'sub_B', created: 100 };
  const aUpdated = { ...subscriptionEvent('updated', 200), id: 'evt_A_updated', data: { object: a } };
  latestSubscription = a;
  const ca = await ledger.recordEvent(aUpdated);
  await subscriptions.handleSubscriptionUpdated(a, claimContext(aUpdated, ca));
  assert.equal(db.proSubscriptionId, 'sub_A');
  const bCreated = { ...subscriptionEvent('created', 100), id: 'evt_B_created', data: { object: b } };
  const cb = await ledger.recordEvent(bCreated);
  await subscriptions.handleSubscriptionCreated(b, claimContext(bCreated, cb));
  assert.equal(db.proSubscriptionId, 'sub_B');
  const aLater = { ...aUpdated, id: 'evt_A_later', created: 300 };
  const cal = await ledger.recordEvent(aLater);
  await subscriptions.handleSubscriptionUpdated(a, claimContext(aLater, cal));
  assert.equal(db.proSubscriptionId, 'sub_B');
  const bUpdated = { ...subscriptionEvent('updated', 150), id: 'evt_B_updated', data: { object: b } };
  latestSubscription = b;
  const cbu = await ledger.recordEvent(bUpdated);
  await subscriptions.handleSubscriptionUpdated(b, claimContext(bUpdated, cbu));
  assert.equal(db.proSubscriptionId, 'sub_B');
});
test('equal-second blocked stale snapshot cannot commit after fresh reservation and application', async () => {
  db = database();
  const first = { ...subscriptionEvent('updated', 200), id: 'evt_fetch_old' };
  const second = { ...first, id: 'evt_fetch_new' };
  const [a, b] = await Promise.all([ledger.recordEvent(first), ledger.recordEvent(second)]);
  const entered = deferred(), stale = deferred();
  let fetches = 0;
  latestSubscription = () => { if (fetches++ === 0) { entered.resolve(); return stale.promise; } return { ...subscriptionSnapshot, status: 'active' }; };
  const old = subscriptions.handleSubscriptionUpdated(subscriptionSnapshot, claimContext(first, a));
  await entered.promise;
  await subscriptions.handleSubscriptionUpdated(subscriptionSnapshot, claimContext(second, b));
  assert.equal(db.subscription.status, 'active');
  stale.resolve({ ...subscriptionSnapshot, status: 'past_due' });
  await assert.rejects(old, /snapshot superseded/);
  assert.equal(db.subscription.status, 'active'); assert.equal(db.subscriptionWrites, 1);
});

test('unknown legacy owner generation fails closed rather than replacing its linkage', async () => {
  db = database(); db.unknownLegacyOwner('sub_legacy_newer');
  const e = subscriptionEvent(); const c = await ledger.recordEvent(e);
  await assert.rejects(subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(e, c)), /generation unknown/);
  assert.equal(db.proSubscriptionId, 'sub_legacy_newer'); assert.equal(db.subscriptionWrites, 0);
});
test('different subscription IDs created within one second require explicit ownership reconciliation', async () => {
  db = database();
  const a = subscriptionEvent(); const ca = await ledger.recordEvent(a);
  await subscriptions.handleSubscriptionCreated(subscriptionSnapshot, claimContext(a, ca));
  const other = { ...subscriptionSnapshot, id: 'sub_equal_generation' };
  const b = { ...subscriptionEvent(), id: 'evt_equal_generation', data: { object: other } };
  const cb = await ledger.recordEvent(b);
  await assert.rejects(subscriptions.handleSubscriptionCreated(other, claimContext(b, cb)), /Ambiguous equal-second/);
  assert.equal(db.proSubscriptionId, 'sub_mock');
});

test('canceled A retains generation identity: same-second B create/update/cancel all require reconciliation', async () => {
  db = database();
  const a = { ...subscriptionSnapshot, id: 'sub_A', created: 50 };
  const b = { ...subscriptionSnapshot, id: 'sub_B', created: 50 };
  const canceled = { ...subscriptionEvent('deleted', 200), id: 'evt_A_canceled', data: { object: a } };
  const ca = await ledger.recordEvent(canceled);
  await subscriptions.handleSubscriptionDeleted(a, claimContext(canceled, ca));
  assert.equal(db.proSubscriptionId, null); assert.equal(db.proOwnerId, 'sub_A');
  for (const action of ['created', 'updated', 'deleted']) {
    const e = { ...subscriptionEvent(action, 300), id: `evt_B_${action}`, data: { object: b } };
    const c = await ledger.recordEvent(e); latestSubscription = b;
    const handler = { created: 'handleSubscriptionCreated', updated: 'handleSubscriptionUpdated', deleted: 'handleSubscriptionDeleted' }[action];
    await assert.rejects(subscriptions[handler](b, claimContext(e, c)), /Ambiguous equal-second/);
    assert.equal(db.proSubscriptionId, null); assert.equal(db.proOwnerId, 'sub_A');
    assert.equal(db.subscriptionRows.has('sub_B'), false);
  }
  // A's own stale update must also preserve its terminal cancellation.
  const stale = { ...subscriptionEvent('updated', 100), id: 'evt_A_stale', data: { object: a } };
  const cs = await ledger.recordEvent(stale); latestSubscription = a;
  await subscriptions.handleSubscriptionUpdated(a, claimContext(stale, cs));
  assert.equal(db.proSubscriptionId, null); assert.equal(db.proOwnerId, 'sub_A');
  // A genuinely later generation C can still establish a replacement.
  const newer = { ...a, id: 'sub_C', created: 51 };
  const ce = { ...subscriptionEvent('created', 350), id: 'evt_C_created', data: { object: newer } };
  const cc = await ledger.recordEvent(ce);
  await subscriptions.handleSubscriptionCreated(newer, claimContext(ce, cc));
  assert.equal(db.proSubscriptionId, 'sub_C'); assert.equal(db.proOwnerId, 'sub_C');
});
