import type Stripe from 'stripe';
import { VENTURE_BOC, VENTURE_KEY } from './config';

export type VentureDecision = 'ours' | 'foreign' | 'undetermined';

type MetadataCarrier = { metadata?: Stripe.Metadata | null };

function decideFromMetadata(metadata?: Stripe.Metadata | null): VentureDecision {
  const venture = metadata?.[VENTURE_KEY];
  if (venture === VENTURE_BOC) return 'ours';
  if (venture) return 'foreign';
  return 'undetermined';
}

/**
 * Reject explicitly foreign shared-account events before they enter our
 * idempotency ledger. Missing stamps remain eligible for legacy event types.
 */
export function classifyEventVenture(event: Stripe.Event): VentureDecision {
  const object = event.data.object as unknown as MetadataCarrier & {
    parent?: {
      subscription_details?: { metadata?: Stripe.Metadata | null } | null;
    } | null;
  };

  if (
    event.type.startsWith('checkout.session.') ||
    event.type.startsWith('customer.subscription.')
  ) {
    return decideFromMetadata(object.metadata);
  }

  if (event.type.startsWith('invoice.')) {
    return decideFromMetadata(object.parent?.subscription_details?.metadata);
  }

  return 'undetermined';
}

export interface LeadUnlockMetadata {
  quoteRequestId: string;
  cleanerId: string;
  amountCents: number;
  leadAcceptanceId: string | null;
  paymentIntentId: string;
}

/** Fail closed before releasing contact data for a malformed or unpaid event. */
export function parsePaidLeadUnlock(session: Stripe.Checkout.Session): LeadUnlockMetadata | null {
  if (session.mode !== 'payment' || session.metadata?.type !== 'lead_unlock') {
    return null;
  }
  if (session.metadata[VENTURE_KEY] !== VENTURE_BOC) {
    return null;
  }
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return null;
  }

  const quoteRequestId = session.metadata.quote_request_id;
  const cleanerId = session.metadata.cleaner_id;
  const amountCents = Number(session.metadata.amount_cents);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (
    !quoteRequestId ||
    !cleanerId ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    !paymentIntentId
  ) {
    throw new Error(`Invalid paid lead-unlock Checkout Session ${session.id}`);
  }

  if (session.amount_total !== null && session.amount_total !== amountCents) {
    throw new Error(`Lead-unlock amount mismatch for Checkout Session ${session.id}`);
  }

  return {
    quoteRequestId,
    cleanerId,
    amountCents,
    leadAcceptanceId: session.metadata.lead_acceptance_id || null,
    paymentIntentId,
  };
}

/** Stable across double-clicks and ambiguous Stripe network responses. */
export function leadUnlockCheckoutIdempotencyKey(
  leadAcceptanceId: string,
  replacedSessionId?: string | null
): string {
  return `boc:lead-unlock:${leadAcceptanceId}:${replacedSessionId || 'initial'}`;
}
