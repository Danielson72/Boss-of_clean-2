# Phase C — Stripe API Surface Audit (BOC)

**Ticket:** DLD-531
**Mode:** INVESTIGATE-ONLY (no code, env, or Stripe-config changes)
**Date:** 2026-05-27
**Author:** CTO agent
**BOC LLC Stripe LIVE account:** `acct_1TNEvGRxaMzY49UQ`
**Webhook endpoint:** `bossofclean.com/api/webhooks/stripe`
**Stripe Node SDK version:** `stripe@^18.4.0`, apiVersion `2025-07-30.basil`

---

## 0. Workspace note (must read before next agent picks this up)

The Paperclip project workspace registration for "Boss of Clean" points to:

- Primary: `/Users/danielalvarez/Desktop/Boss-of_clean-2-main/` — contains only `docs/`, `skills/`, `skills-lock.json`. **No source code.**
- Secondary: `/Users/danielalvarez/DLD-Brands/BossOfClean/` — only contains extraction-report metadata. **No source code.**

The **actual** Next.js 13.5 source tree lives at:

- `/Users/danielalvarez/Boss-of-Clean/` (Next.js 13.5.1, App Router, `package.json` with `stripe@^18.4.0`)

A stale archive copy is also at `/Users/danielalvarez/Boss-of-Clean/Boss of clean files/Boss-of_clean-2-main/` — ignore.

This audit was performed against `/Users/danielalvarez/Boss-of-Clean/`. The deliverable was written to **both** that tree and the registered Paperclip workspace path so it's discoverable from either entry point.

**Recommendation:** open a small follow-up to update the project workspace `cwd` in Paperclip (PATCH/POST on `/api/projects/12635779-90bc-4125-b4fb-cc3773baaaf3/workspaces` for workspace id `6e052357-caa2-4364-bd81-b81cde8de841`) so future agents land in a tree that actually contains the code.

---

## 1. Inventory — every Stripe SDK call site

Paths are relative to `/Users/danielalvarez/Boss-of-Clean/`. Read-only audit; nothing in this list was modified.

### 1.1 Server-side (uses `STRIPE_SECRET_KEY` — i.e. the key being scoped to `rk_live_`)

| # | File:Line | Call | Stripe resource | Action |
|---|---|---|---|---|
| 1 | `lib/stripe/config.ts:15` | `new Stripe(secretKey, { apiVersion: '2025-07-30.basil' })` | client init | — |
| 2 | `lib/stripe/config.ts:102` | `stripe.webhooks.constructEvent(body, signature, secret)` | Webhooks (HMAC verify) | local crypto only — no API call |
| 3 | `lib/stripe/subscription-service.ts:31` | `stripe.checkout.sessions.create({mode: 'subscription', ...})` | Checkout Sessions | write |
| 4 | `lib/stripe/subscription-service.ts:77` | `stripe.customers.retrieve(id)` | Customers | read |
| 5 | `lib/stripe/subscription-service.ts:87` | `stripe.customers.create({...})` | Customers | write |
| 6 | `lib/stripe/subscription-service.ts:355` | `stripe.subscriptions.cancel(id)` | Subscriptions | write |
| 7 | `lib/stripe/invoices.ts:115` | `stripe.invoices.list(params)` | Invoices | read |
| 8 | `lib/stripe/invoices.ts:130` | `stripe.invoices.retrieve(id, {expand: ['lines']})` | Invoices | read |
| 9 | `lib/stripe/invoices.ts:152` | `stripe.invoices.createPreview({customer, subscription})` | Invoices (preview only — no invoice persisted) | read |
| 10 | `lib/stripe/invoices.ts:198` | `stripe.invoices.sendInvoice(id)` | Invoices | write (currently UNUSED — no route calls `sendInvoice`) |
| 11 | `lib/stripe/mcp.ts:56` | `stripe.checkout.sessions.create({...})` | Checkout Sessions | write |
| 12 | `lib/stripe/mcp.ts:95` | `stripe.billingPortal.sessions.create({customer, return_url})` | Billing Portal Sessions | write |
| 13 | `lib/stripe/mcp.ts:132` | `stripe.customers.list({email, limit: 1})` | Customers | read |
| 14 | `lib/stripe/mcp.ts:168` | `stripe.prices.list({limit})` | Prices | read (only used by an unreferenced debug helper) |
| 15 | `lib/stripe/billing-service.ts:48` | `stripe.customers.retrieve(id)` | Customers | read |
| 16 | `lib/stripe/billing-service.ts:54` | `stripe.paymentMethods.list({customer, type: 'card'})` | Payment Methods | read |
| 17 | `lib/stripe/billing-service.ts:87` | `stripe.invoices.list({customer, limit, expand})` | Invoices | read |
| 18 | `lib/stripe/billing-service.ts:120` | `stripe.subscriptions.retrieve(id, {expand: ['items.data.price']})` | Subscriptions + Prices (via expand) | read |
| 19 | `lib/stripe/billing-service.ts:159` | `stripe.subscriptions.retrieve(id, {expand: ['default_payment_method', 'items.data.price']})` | Subscriptions + PM + Prices (via expand) | read |
| 20 | `lib/stripe/billing-service.ts:236` | `stripe.customers.update(id, {invoice_settings: {default_payment_method}})` | Customers | write |
| 21 | `lib/stripe/billing-service.ts:267` | `stripe.invoices.createPreview(params)` | Invoices (preview) | read |
| 22 | `app/api/webhooks/stripe/route.ts:200` | `stripe.webhooks.constructEvent(body, signature, webhookSecret)` | Webhooks (HMAC verify) | local crypto only — no API call |
| 23 | `app/api/cleaner/billing/route.ts:63` | `stripe.subscriptions.retrieve(id, {expand: ['default_payment_method']})` | Subscriptions + PM (expand) | read |
| 24 | `app/api/cleaner/billing/reactivate/route.ts:49` | `stripe.subscriptions.retrieve(id)` | Subscriptions | read |
| 25 | `app/api/cleaner/billing/reactivate/route.ts:62` | `stripe.subscriptions.update(id, {cancel_at_period_end: false})` | Subscriptions | write |
| 26 | `app/api/cleaner/billing/cancel/route.ts:55` | `stripe.subscriptions.update(id, {cancel_at_period_end: true})` | Subscriptions | write |
| 27 | `app/api/cleaner/billing/upgrade/route.ts:65` | `stripe.subscriptions.retrieve(id)` | Subscriptions | read |
| 28 | `app/api/cleaner/billing/upgrade/route.ts:71` | `stripe.subscriptions.update(id, {items, proration_behavior, metadata})` | Subscriptions | write |
| 29 | `app/api/cleaner/billing/upgrade/route.ts:110` | `stripe.customers.create({email, metadata})` | Customers | write |
| 30 | `app/api/cleaner/billing/upgrade/route.ts:126` | `stripe.checkout.sessions.create({mode: 'subscription', ...})` | Checkout Sessions | write |

### 1.2 Client-side (uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_live_…`)

| # | File:Line | Call | Notes |
|---|---|---|---|
| C1 | `lib/stripe/client.ts:15` | `loadStripe(publishableKey)` | initializes Stripe.js |
| C2 | `lib/stripe/client.ts:41` | `stripe.redirectToCheckout({sessionId})` | client-side redirect |

**These are NOT in scope for the `rk_live_` swap.** The publishable key stays as `pk_live_…` and continues to live in `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### 1.3 Stripe imports — files that touch `Stripe` types or runtime

- Runtime (`import Stripe from 'stripe'`): `lib/stripe/config.ts`, `lib/stripe/invoices.ts`
- Type-only (`import type Stripe from 'stripe'`): `lib/stripe/subscription-service.ts`, `lib/stripe/disputes.ts`, `lib/stripe/billing-service.ts`, `lib/stripe/mcp.ts`, `lib/stripe/webhook-event-service.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/cleaner/billing/reactivate/route.ts`
- Client SDK (`@stripe/stripe-js`): `lib/stripe/client.ts`

`lib/stripe/dunning.ts` and `lib/stripe/webhook-event-service.ts` are pure database/orchestration logic — no outbound SDK calls. They consume `Stripe.Event` payloads via types only.

---

## 2. Webhook events received

Endpoint: `POST /api/webhooks/stripe` (file `app/api/webhooks/stripe/route.ts`)

Verified via `STRIPE_WEBHOOK_SECRET`. Events handled:

| Event type | Handler | Notes |
|---|---|---|
| `checkout.session.completed` | inline, branches by `mode` and `metadata.type` | `mode=subscription` → no-op (subscription event fires separately); `mode=payment & metadata.type=lead_unlock` → updates `lead_acceptances` row to `captured` |
| `customer.subscription.created` | `subscriptionService.handleSubscriptionCreated` | inserts `subscriptions`, updates `pros.subscription_tier/expires_at` |
| `customer.subscription.updated` | `subscriptionService.handleSubscriptionUpdated` | updates `subscriptions.status`, `pros.subscription_expires_at` |
| `customer.subscription.deleted` | `subscriptionService.handleSubscriptionDeleted` | resets `pros` to free tier, marks `subscriptions.status=canceled` |
| `invoice.payment_succeeded` | `subscriptionService.handlePaymentSucceeded` | inserts `payments` row, resets dunning state |
| `invoice.payment_failed` | `subscriptionService.handlePaymentFailed` | inserts failed `payments` row, processes dunning |
| `payment_intent.succeeded` | log-only | no DB writes |
| `payment_intent.payment_failed` | log-only | no DB writes |
| `charge.dispute.created` | `handleDisputeCreated` | inserts `disputes`, flags `pros.dispute_status` |
| `charge.dispute.closed` | `handleDisputeClosed` | updates `disputes.status` + clears `pros.dispute_status` if no open disputes remain |

Idempotency is enforced via `webhookEventService.recordEvent` (DB-backed dedup using `event.id`). Retry envelope inside the handler: 3 attempts with 1s/2s/4s backoff before returning 500 (Stripe will then retry on its own schedule).

**These event types are what the Stripe Dashboard webhook endpoint must be subscribed to.** No API permission is required to *receive* webhooks — the gating is on the webhook signing secret.

---

## 3. Pay-on-Acceptance / Lead-Unlock flow status

The webhook receiver at `app/api/webhooks/stripe/route.ts:64-99` already handles the **completion** side of a per-lead checkout (mode=`payment`, metadata.type=`lead_unlock`, metadata fields `quote_request_id`, `cleaner_id`, `amount_cents`, plus `stripe_checkout_session_id` on `lead_acceptances`).

The **creation** side of that checkout session does NOT exist in the repo yet — there is no route that creates a one-time payment Checkout Session tagged with `type: 'lead_unlock'`. That is in-flight work, scoped under:

- **DLD-517** — "BOC A9: Pay-on-Acceptance Stripe flow — pro pays for lead, then PII reveals"

When DLD-517 lands, the only NEW Stripe SDK call it will introduce is another `stripe.checkout.sessions.create({mode: 'payment', ...})` site. That is already covered by the existing `checkout_sessions: write` permission grant, so **this audit's scoping recommendation does not change** when DLD-517 ships.

---

## 4. Stripe resources NOT touched by code today

Calling these out so the `rk_live_` swap can deliberately *exclude* them and we shrink the blast radius if the key leaks:

| Resource | Status | Notes |
|---|---|---|
| Payment Intents | not called via SDK | only referenced as IDs inside webhook payloads |
| Charges | not called via SDK | only referenced inside dispute event payloads |
| Refunds | **no code** | refund-on-bad-lead is not implemented |
| Disputes (mutate) | **no code** | we receive `charge.dispute.created/closed` but never call `disputes.update` to submit evidence — admin evidence submission is not implemented |
| Products | **no code** | products are managed manually in the Stripe Dashboard |
| Coupons / Promotion Codes | **no code** | `allow_promotion_codes: true` on checkout sessions, but no SDK calls to create/list them |
| Setup Intents | **no code** | not used |
| Connect (accounts, transfers, payouts) | **no code** | BOC is single-account (no marketplace split-payments) |
| Treasury | **no code** | not used |
| Tax | **no code** | no `tax.calculations.create` etc. |
| Reporting | **no code** | not used |

---

## 5. Recommended `rk_live_` restricted-key scopes

Minimum scopes to keep the current code working with no regressions:

| Permission | Why |
|---|---|
| `customers: Read + Write` | Subscription service, billing service, upgrade route, portal lookup |
| `subscriptions: Read + Write` | Create/update/cancel/reactivate flows |
| `checkout_sessions: Write` | Subscription checkout + per-lead checkout (DLD-517) |
| `billing_portal_sessions: Write` | `/api/stripe/portal` |
| `invoices: Read` | Billing dashboard, billing history, `createPreview` upcoming-invoice |
| `payment_methods: Read` | List cards on file in billing dashboard |
| `prices: Read` (optional) | Only used by `mcp.ts:listPrices()` debug helper — no production route calls it. Safe to omit and grant later if needed. |

**Explicitly NOT needed today** (deny / leave unchecked):

- `invoices: Write` — `sendInvoice` is exported but unused; add when wired to a route
- `refunds: *` — no refund SDK calls
- `disputes: Write` — no evidence-submission code
- `payment_intents: *` — never invoked from code (event payloads only)
- `charges: *` — never invoked from code (event payloads only)
- `products: *` — managed in dashboard
- `connect`, `treasury`, `tax`, `reporting`, `setup_intents`, `coupons` — unused

Webhook signing secret stays separate: `STRIPE_WEBHOOK_SECRET` is not part of the restricted-key scope and continues to live in Netlify env vars unchanged. The Stripe Dashboard webhook endpoint must remain subscribed to the 10 event types listed in §2.

---

## 6. Observations / risks for the swap ticket

1. **Two Stripe init paths share one env var.** `lib/stripe/config.ts` exports both an eager `stripe` proxy and a lazy `getStripe()`, both reading `STRIPE_SECRET_KEY`. Swapping that single env var to `rk_live_…` swaps both. No code change required for the rotation itself.
2. **Two checkout creation paths.** `lib/stripe/subscription-service.ts:31` (direct) and `lib/stripe/mcp.ts:56` (wrapper, used by `/api/stripe/checkout`). Both need `checkout_sessions: write`. Future cleanup could collapse to one path; out of scope here.
3. **`STRIPE_USE_MCP=true` branches are dormant in production.** The MCP wrapper always falls through to the SDK in Netlify (no MCP tool available at runtime). No `rk_live_` implication — treat as SDK-only.
4. **Unused write paths.** `invoices.sendInvoice` (file/line: `lib/stripe/invoices.ts:198`) and the MCP `listPrices` helper (`lib/stripe/mcp.ts:168`) are exported but have no consumers grepping the repo. Recommend the swap ticket grants the minimum permissions in §5 and revisits if a feature wires them up.
5. **No refund / no Connect / no Treasury.** This is a single-account, subscription-plus-one-time-payment Stripe surface. The restricted key can stay narrow.
6. **Webhook receive endpoint** at `app/api/webhooks/stripe/route.ts` only uses `STRIPE_WEBHOOK_SECRET` and SDK type imports. Even though `stripe.webhooks.constructEvent` is called via the proxy, it performs no API call — it's local HMAC. So a restricted key that is missing API permissions still verifies webhooks correctly.
7. **Disputes evidence submission** is not implemented. When admin evidence submission lands, the rk_live_ key will need `disputes: Write`.
8. **PaymentIntent retrieval** is not implemented. We store `stripe_payment_intent_id` in `payments` and `lead_acceptances` but never call `paymentIntents.retrieve`. If support tooling adds that, grant `payment_intents: Read`.
9. **Refunds** are mentioned in the dispute flow but only via outbound notification email — no `refunds.create` call exists. Lead-refund support would need `refunds: Write`.
10. **`apiVersion: '2025-07-30.basil'`** is pinned in `lib/stripe/config.ts:16`. The restricted key inherits whatever API version is set on the account / pinned in the SDK call — no version coupling concern here.

---

## 7. Next-step tickets this audit unblocks

This document is the scoping spec for:

- **DLD-454** — "Swap BOC sk_live_ secret key for scoped rk_live_ restricted key" (currently `blocked`, medium priority) — can move forward using §5 as the exact scope list.

It is intentionally *not* a green-light to do the swap. The swap itself still requires:

1. Daniel (Board) to generate the `rk_live_…` key in the BOC LLC Stripe Dashboard with the §5 scopes checked.
2. The accompanying env-var inventory + rotation runbook from **DLD-532** ("Phase C: Env var inventory & sk_live_ rotation runbook") so the rotation is reversible.
3. A Netlify env-var update (not Saturday — Sabbath rule).
4. A post-rotation smoke test of subscription create + cancel + reactivate + billing-portal redirect.

No code changes are required for the rotation itself.

---

## 8. What was NOT changed by this audit

Per the safety contract on DLD-531:

- No Stripe config or env var was touched.
- No code was modified.
- No git push, merge, or deploy was performed.
- Only files written: this report (in both the canonical code tree and the Paperclip-registered workspace) and the workspace audit todo list state.
