# Stripe payment-safety review — 2026-09-21

## Scope

This change covers the Boss of Clean webhook ledger and the paid lead-unlock Checkout path. It does not rotate live credentials or alter Stripe dashboard configuration.

## Controls

| Risk | Control |
|---|---|
| Shared-account event crosses ventures | Explicit foreign venture stamps are rejected before the event is written or handled. Missing stamps remain eligible only for legacy compatibility. |
| Duplicate simultaneous webhook deliveries | `record_webhook_event` claims `event_id` with an atomic `INSERT ... ON CONFLICT` operation. |
| Worker dies after claiming an event | A five-minute processing lease permits a later Stripe retry to reclaim the event. |
| Ledger database is unavailable | Event handling fails closed with HTTP 500; no money-side mutation runs without a durable claim. |
| Handler succeeds but the completion mark fails | The route returns HTTP 500 so Stripe retries. Domain writes remain independently idempotent. |
| Double-click or ambiguous Checkout network response | Lead Checkout creation uses a stable Stripe idempotency key derived from the local acceptance row and the session generation it replaces. |
| Unpaid or malformed completion event | Contact release requires a paid Checkout Session, a payment intent, required IDs, a positive integer amount, and matching total. |
| Duplicate lead payment record | `payments.stripe_payment_intent_id` is unique; the handler treats the database conflict as an existing payment. |
| Duplicate lead unlock | `lead_acceptances` is unique per quote/pro and capture is keyed to the linked Checkout Session. |

## Scenario evidence

- Duplicate delivery: one database claimant processes; a concurrent delivery gets a retryable response until the first records success. A later duplicate gets a 2xx without repeating business writes.
- Out-of-order `payment_intent.succeeded`: it does not release lead contact; fulfillment remains tied to the paid Checkout completion.
- Declined payment: no paid completion is accepted, so contact remains closed.
- Abandoned Checkout: the pending row remains reusable; an open session is resumed and an expired session is replaced.
- Handler failure: the event becomes `failed`, the route returns 500, and Stripe's next delivery can reclaim it.
- Network ambiguity during Checkout creation: the same local attempt uses the same Stripe idempotency key and cannot create a second session.

## Deployment gate

The migration must be reviewed before application. After deploy, send signed test-mode events to the preview endpoint and confirm one ledger row, one payment row, and one captured acceptance for repeated delivery of the same event ID.
