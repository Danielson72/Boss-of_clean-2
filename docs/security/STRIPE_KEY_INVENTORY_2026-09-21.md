# Stripe credential inventory — 2026-09-21

## Finding

The server creates one lazy Stripe SDK client in `lib/stripe/config.ts`, and every server-side Stripe call ultimately uses that client. The client reads `STRIPE_SECRET_KEY`; no application code reads `STRIPE_BOC_RESTRICTED_KEY`.

The connected Netlify configuration contains both names, but at least one deploy context still supplies an unrestricted live-mode `sk_live_...` credential through `STRIPE_SECRET_KEY`. Its value was exposed during this review and must be treated as compromised. This document intentionally does not contain any credential value. Historical key revocation could not be confirmed from the available integrations.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is used only by the browser client. `STRIPE_WEBHOOK_SECRET` is a separate per-endpoint signing secret used only for local signature checking. Stripe confirms that webhook signing secrets are separate from API keys.

Netlify secret scanning is currently disabled (`SECRETS_SCAN_ENABLED=false`).

## API operations found in source

| Stripe resource | Operations | Required restricted-key access |
|---|---|---|
| Checkout Sessions | create, retrieve, expire | Write |
| Customers | create, retrieve, update, list by email | Write |
| Subscriptions | retrieve, update, cancel | Write |
| Payment Methods | list | Read |
| Invoices | list, retrieve, create preview | Write |
| Billing Portal Sessions | create | Write |
| Prices | referenced by Checkout and expanded on subscription reads | Read |
| Products | referenced by Checkout price configuration | Read |

No source call creates refunds, changes payouts, changes bank accounts, or mutates disputes. Webhook dispute handlers use the signed event payload and local database only.

The permission list above is derived from current code paths. Stripe's Dashboard remains the authority for the exact permission labels presented while creating the key.

## Rotation runbook — human dashboard step required

1. In a Stripe sandbox, create a restricted test key with only the access listed above. Stripe recommends restricted keys and describes them as drop-in replacements for secret keys.
2. Put that test key in the preview deploy's server-only `STRIPE_SECRET_KEY` value. Do not place it in a public variable or chat.
3. Run subscription Checkout, lead-unlock Checkout, billing portal, invoice display, cancellation, reactivation, and repeated webhook-delivery tests.
4. Review Stripe Workbench request logs for permission failures. Reduce permissions that prove unnecessary; add a permission only when a named code path demonstrates the need.
5. Create the equivalent live restricted key. Update Netlify `STRIPE_SECRET_KEY` in a coordinated deploy, verify health and a controlled live smoke test, then expire the exposed unrestricted live key in Stripe.
6. Remove the unused `STRIPE_BOC_RESTRICTED_KEY` variable after confirming no external function consumes it. Enable Netlify secret scanning and confirm builds still pass.
7. Record the key name, owner, creation date, deploy contexts, and next rotation date. Never record the key value.

## References

- [Stripe restricted API keys](https://docs.stripe.com/keys/restricted-api-keys)
- [Stripe API keys and webhook signing secrets](https://docs.stripe.com/keys)
- [Stripe key-management best practices](https://docs.stripe.com/keys-best-practices)

## Status

- Code inventory: complete.
- Replacement key creation: blocked on Stripe Dashboard access.
- Sandbox permission test: blocked on a newly created restricted test key.
- Live cutover and old-key expiration: blocked until the sandbox test passes and the deploy window is coordinated.
