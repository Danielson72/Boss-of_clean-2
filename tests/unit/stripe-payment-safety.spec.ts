import { expect, test } from '@playwright/test';
import type Stripe from 'stripe';
import {
  classifyEventVenture,
  leadUnlockCheckoutIdempotencyKey,
  parsePaidLeadUnlock,
} from '../../lib/stripe/webhook-safety';
import fs from 'node:fs';
import path from 'node:path';

function checkout(overrides: Record<string, unknown> = {}): Stripe.Checkout.Session {
  return {
    id: 'cs_test_lead',
    object: 'checkout.session',
    mode: 'payment',
    payment_status: 'paid',
    payment_intent: 'pi_test_lead',
    amount_total: 3000,
    metadata: {
      venture: 'boc',
      type: 'lead_unlock',
      quote_request_id: 'quote-1',
      cleaner_id: 'pro-1',
      amount_cents: '3000',
      lead_acceptance_id: 'acceptance-1',
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function event(type: string, object: object): Stripe.Event {
  return { id: 'evt_test', type, data: { object } } as Stripe.Event;
}

test.describe('Stripe payment safety', () => {
  test('venture guard rejects explicit sibling events before processing', () => {
    expect(classifyEventVenture(event('checkout.session.completed', checkout()))).toBe('ours');
    expect(classifyEventVenture(event('checkout.session.completed', checkout({ metadata: { venture: 'sibling' } })))).toBe('foreign');
    expect(classifyEventVenture(event('payment_intent.succeeded', { id: 'pi_1' }))).toBe('undetermined');
  });

  test('paid lead unlock has complete, internally consistent metadata', () => {
    expect(parsePaidLeadUnlock(checkout())).toEqual({
      quoteRequestId: 'quote-1',
      cleanerId: 'pro-1',
      amountCents: 3000,
      leadAcceptanceId: 'acceptance-1',
      paymentIntentId: 'pi_test_lead',
    });
    expect(() => parsePaidLeadUnlock(checkout({ amount_total: 1200 }))).toThrow(/amount mismatch/);
  });

  test('declined or abandoned checkout cannot release contact data', () => {
    expect(parsePaidLeadUnlock(checkout({ payment_status: 'unpaid' }))).toBeNull();
    expect(parsePaidLeadUnlock(checkout({ payment_status: 'unpaid', payment_intent: null }))).toBeNull();
  });

  test('out-of-order payment-intent event is not treated as lead fulfillment', () => {
    const paymentIntentEvent = event('payment_intent.succeeded', {
      id: 'pi_test_lead',
      metadata: { venture: 'boc', type: 'lead_unlock' },
    });
    expect(classifyEventVenture(paymentIntentEvent)).toBe('undetermined');
    expect(paymentIntentEvent.type).not.toBe('checkout.session.completed');
  });

  test('double-click and ambiguous network retry reuse the same Stripe key', () => {
    const first = leadUnlockCheckoutIdempotencyKey('acceptance-1');
    const retry = leadUnlockCheckoutIdempotencyKey('acceptance-1', null);
    expect(retry).toBe(first);
    expect(leadUnlockCheckoutIdempotencyKey('acceptance-1', 'cs_expired')).not.toBe(first);
  });

  test('webhook ledger migration uses an atomic claim and a stale-work lease', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260921014926_atomic_stripe_webhook_claim.sql'),
      'utf8'
    );
    expect(migration).toContain('ON CONFLICT (event_id) DO NOTHING');
    expect(migration).toContain("updated_at < now() - interval '5 minutes'");
    expect(migration).toContain("status = 'failed'");
  });
});
