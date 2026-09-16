# Boss of Clean — Second-Opinion Review of Codex Recon (READ ONLY)

**Date:** 2026-09-16
**Reviewer:** Claude Code (Fable 5.1), independent pass over `docs/audit/RECON_2026-09-16.md`
**Method:** Read / grep only. Every cited file:line in the Codex table was opened. No edits, commits, deploys, migrations, or DB writes. This file is the only artifact produced.
**Inputs assumed true (from the separate Supabase MCP scan, not re-verified here):** `guard_users_role_change` trigger protects `users.role`; `pros_update` allows a pro to write its own verification/tier columns; `subscriptions_cleaners_insert_own` / `_update_own` exist; `create_quote_request` and `check_and_increment_customer_limits` are anon-callable SECURITY DEFINER with no auth check; admin RPCs check `is_admin()` internally.

---

## 1. Codex findings → verdict

| ID | Codex sev | Verdict | Evidence (one line) |
|---|---|---|---|
| F-08 | BLOCKER | **CONFIRMED** | `lib/actions/tcpa.ts:20,49,94` and `lib/actions/pro-signup.ts:20` are `'use server'` exports that take `userId` from the caller and write via `createServiceRoleClient()` with zero identity check; callable by anyone who POSTs the action id. |
| F-01 | BLOCKER | **CONFIRMED** | `app/api/cleaner/billing/upgrade/route.ts:126-150` sets `metadata` and `subscription_data.metadata` without `VENTURE_KEY`; `lib/stripe/subscription-service.ts:210-219` returns false and skips the event when the marker is absent. Reachable from `app/dashboard/pro/billing/page.tsx:144`. |
| F-03 | HIGH | **SEVERITY CHANGE ↓ MEDIUM** | Fallback at `middleware.ts:97,149` is real, but it only fires when the `users` self-read fails. The auth trigger pre-creates the row and `users_select` permits self-read, so a user cannot induce the failure; data access behind the page is still gated by `is_admin()` RLS and `verifyAdmin()` in `app/dashboard/admin/actions.ts:18-37`. Defense-in-depth gap, not a reachable escalation. Fix stays: fail closed. |
| F-05 | HIGH | **CONFIRMED** | `app/api/admin/signup-notification/route.ts:9-16` and `document-upload-notification/route.ts:18-25` have no auth, no rate limit; `lib/email/resend.ts:175-177` (`generateInfoBox`) interpolates values raw even though `escapeHtml` exists 10 lines above. Browser calls it directly at `components/auth/AuthForm.tsx:202`. |
| F-06 | HIGH | **CONFIRMED** | `app/api/contact/route.ts:14-34` service-role insert with no length bounds or rate limit; `:56-66` raw `${message}` in admin HTML; `:83-120` sends a branded confirmation to caller-supplied `email` containing caller-supplied `message` → usable as an open relay for phishing under the Boss of Clean brand. |
| F-04 | HIGH | **CONFIRMED (scope narrowed)** | `app/api/quote/route.ts:70-78` optional auth; `:197-217` passes caller-controlled `cleaner_id` and session-derived `customerId` (null for anon) into the anon-callable RPC. Only front-end caller is `lib/quoteClient.ts:94`, imported solely by `app/qa/quote-demo/page.tsx:4` — so prod UI never uses it, but the endpoint is live and rate-limited to 10/min/IP only. Anon can flood pros with fake leads. |
| F-02 | HIGH | **SEVERITY CHANGE ↓ LOW** | DB scan confirms `guard_users_role_change` blocks escalation, and `supabase/03-auth-setup.sql:14-20` whitelists `customer`/`cleaner` at signup. `app/auth/select-role/page.tsx:62-68` browser update can only set what the trigger allows. Residual: none beyond keeping the trigger. |
| F-20 | MEDIUM | **CONFIRMED** | `app/quote-request/actions.ts:86-93` validates only presence + zip regex; `tcpa_consent_at` is set unconditionally at `:131` with no affirmative field. `app/api/cleaners/onboarding/route.ts:98-179` accepts arbitrary types into `onboarding_data` and column writes. |
| F-21 | MEDIUM | **CONFIRMED** | `RATE_LIMITS.auth` defined `lib/middleware/rate-limit.ts:21-22`, zero references outside the file. `AuthForm.tsx:138` and `AuthContext.tsx:172` call `supabase.auth.signUp` directly from the browser. |
| F-09 | MEDIUM | **CONFIRMED + sharpened** | `lib/middleware/rate-limit.ts:44-80` fails open on every error path. Additionally the RPC is granted to `anon` (`20260709120000_revoke_rpc_execute_lockdown.sql`, GRANT block) and takes `p_identifier`/`p_max_requests` from the caller, so anyone can pre-exhaust a victim IP's counter with `p_max_requests=1`. See N-04. |
| F-22 | MEDIUM | **CONFIRMED** | `unlock/route.ts:163` success_url `/dashboard/pro/leads?unlocked=`; `lead-unlock.ts:63` same page; `pro/leads/actions.ts:126` filters `!== 'captured'`, so the just-paid lead disappears from the landing view. |
| F-23 | MEDIUM | **CONFIRMED** | `app/api/webhooks/stripe/route.ts:60-401` switch has no `charge.refunded` / `refund.*` case; `grep -i refund` in `lib/stripe/*.ts` hits only a type union in `invoices.ts:16`. |
| F-24 | MEDIUM | **CONFIRMED** | `app/api/stripe/portal/route.ts:53-62` uses `findCustomerByEmail(user.email)` and takes `data[0]`; `lib/stripe/mcp.ts:131-134` `limit: 1`. `pros.stripe_customer_id` exists (written at `upgrade/route.ts:122`) but is not used here. |
| F-07 | MEDIUM | **CONFIRMED** | `availability/[cleanerId]/route.ts:26-30` raw service-role client; `:44-53` no date validation; `:120-123` unbounded day loop over caller-supplied range. |
| F-10 | MEDIUM | **SEVERITY CHANGE ↑ HIGH** | DB scan resolved Codex's open question: `pros_update` (`20260710170200_…top5.sql:65-67`) has no column restriction, so a pro can PATCH `insurance_verified=true`, `verification_level`, `subscription_tier` via REST today. Code sends `insurance_verified` from the browser at `pro/setup/page.tsx:155` and `pro/profile/page.tsx:113-114`. Also `pros_insert` (`:63-64`) is equally unrestricted — see N-01. |
| F-12 | MEDIUM | **CONFIRMED** | `bookings/create/route.ts:56` destructures `estimatedPrice` from body; `:151` stores it as `estimated_price` with `status: 'confirmed'`, no server recomputation. |
| F-14 | LOW | **CONFIRMED** | `unsubscribe/route.ts:42,89` log `{ token }` on invalid attempts. |
| F-16 | LOW | **CONFIRMED** | `AuthContext.tsx:88,121` `console.log` emails; `admin/actions.ts:74` `console.log` cleanerId. |
| F-17 | LOW | **CONFIRMED** | `app/qa/quote-demo/page.tsx` is a `'use client'` page with no env gate; it is also the only UI path into `/api/quote` (F-04). |

**Net:** 15 CONFIRMED, 0 DISPUTED, 3 severity changes (F-03 ↓, F-02 ↓, F-10 ↑). Codex's cited line numbers were accurate in every case.

---

## 2. New findings (not in Codex table)

| ID | Severity | file:line | Finding | Fix |
|---|---|---|---|---|
| N-01 | **HIGH** | `supabase/migrations/20260710170200_perf_policy_consolidation_top5.sql:63-64`; `app/auth/select-role/page.tsx:74-80`; `app/dashboard/pro/profile/page.tsx:120-124` | The planned column-level `REVOKE UPDATE` leaves the **INSERT** path open. `pros_insert` allows any authed user to insert their own pros row with `insurance_verified=true`, `verification_level='verified'`, `subscription_tier='pro'` set in the initial payload. Two browser code paths insert pros rows today (select-role, profile auto-create), so a self-inserted verified row is reachable via REST with the anon key + a valid session. | Extend the revoke to `REVOKE INSERT (cols…)` as well, or move verification/tier columns behind a trigger that resets them to defaults on INSERT unless `is_admin()`. |
| N-02 | **MEDIUM** | `app/api/stripe/checkout/route.ts:33-36,62-80`; `app/api/webhooks/stripe/route.ts:76-79` | Route accepts `?plan=boc_per_lead` (mode `payment`) but sets no `type: 'lead_unlock'` metadata, so the webhook's `checkout.session.completed` branch skips it. Any authed pro who hits the URL directly pays `STRIPE_PRICE_BOC_PER_LEAD` and nothing is recorded in `payments` or `lead_acceptances`. UI (`lib/stripe/client.ts:23`) only offers `basic`/`pro`, so it is reachable only by direct request. | Reject `boc_per_lead` in this route (the canonical path is `/api/leads/[quoteId]/unlock`), or remove the plan from `STRIPE_PRICES`. |
| N-03 | **MEDIUM** | `app/api/cleaner/billing/upgrade/route.ts:89-92` | `pros.subscription_tier` write after a Stripe subscription update ignores the returned error (no destructure). Tier drift today is silent; after the planned REVOKE it becomes guaranteed silent failure. Stripe bills the new tier; DB still shows old tier. | Move the write to the webhook path (`subscription-service.ts:280` already does this with service role) and drop the inline write, or check the error and use service role. |
| N-04 | **MEDIUM** | `lib/middleware/rate-limit.ts:50-62`; `supabase/migrations/20260709120000_revoke_rpc_execute_lockdown.sql` (GRANT to anon) | Rate limiter calls `check_rate_limit` with the raw anon key over PostgREST, and the RPC is anon-executable with caller-supplied `p_identifier`, `p_endpoint`, `p_max_requests`. An attacker can call it directly to (a) lock out a victim IP on `quote-request`/`review-ip`/`message-ip` by pre-incrementing with `p_max_requests=1`, or (b) inflate the `rate_limits` table. | Switch the limiter to the service-role key server-side and revoke anon EXECUTE. Note the limiter runs in Edge middleware (`middleware.ts:4-7`), so the service-role env must be available there. |
| N-05 | **LOW** | `app/api/pro/documents/route.ts:154` | Server route calls the public `document-upload-notification` endpoint over HTTP instead of calling `sendResendEmail` directly. Harmless in itself, but it is the reason F-05's route exists; fixing F-05 should inline this call. | Inline the email send; delete the public route. |
| N-06 | **LOW** | `components/dashboard/CleanerProfileForm.tsx:96-104,112-123` | Dead component (zero importers) that writes `insurance_verified` and `background_checked` from the browser. Not reachable, but it will confuse the F-10 cleanup and would break under the revoke if ever wired. | Delete. |

**Areas checked with nothing new to add:** middleware auth boundaries (Codex §1.2 accurate; `/api/*` is intentionally not gated by middleware and every route was inventoried in §1.4); service-role usage in server actions (all 10 `'use server'` files enumerated by Codex; no eleventh file exists); NEXT_PUBLIC_ vars (six names total across `app/ lib/ components/ middleware.ts`, all intended-public; no secret-shaped name found); Stripe webhook signature and cents→dollars (confirmed as stated).

---

## 3. Part B — Gate check for planned DB revocations

### 3.1 RPC call sites

| RPC | file:line | Client | Runs in | Notes |
|---|---|---|---|---|
| `create_quote_request` | `app/api/quote/route.ts:197` | `@/lib/supabase/server` (anon key + cookies → role `anon` or `authenticated`) | Route handler (server) | Only UI caller: `lib/quoteClient.ts:94` ← `app/qa/quote-demo/page.tsx:4`. No prod page uses it. |
| `check_and_increment_customer_limits` | `app/api/quote/route.ts:87` (check) and `:238` (increment) | same server anon-key client | Route handler (server) | Same single caller chain as above. |
| `check_rate_limit` | `lib/middleware/rate-limit.ts:50` (raw `fetch` to `/rest/v1/rpc/check_rate_limit`, `Authorization: Bearer <anon key>`) | Anon key, no user JWT → role `anon` | Edge middleware (`middleware.ts:23-39`) and server action `app/quote-request/actions.ts:51`; also `app/api/boc-chat/route.ts:15`, `app/api/david/route.ts:139`, `app/api/search/autocomplete` | **Not in planned revoke.** Requires `anon` EXECUTE to keep working. Fails open on error, so revoking would silently disable rate limiting rather than break requests. |
| `pro_response_time_stats` | `lib/services/response-time.ts:28` | Passed-in client | `app/professionals/page.tsx:129` (server client), `app/cleaner/[slug]/page.tsx:194` (server client), **`app/search/page.tsx:267` (browser client, `'use client'`)** | **Not in planned revoke.** Needs `anon` + `authenticated` EXECUTE (granted in `20260717120000_pro_response_time_stats.sql:53`). Read-only aggregate; fine to keep. |

### 3.2 Direct client-side writes

**`subscriptions`** (all via `@/lib/supabase/server` anon-key SSR client, role `authenticated`, in route handlers):

| file:line | Op | Columns | Depends on policy |
|---|---|---|---|
| `app/api/cleaner/billing/cancel/route.ts:63-70` | update | `cancel_at`, `status` | `subscriptions_cleaners_update_own` — error not checked |
| `app/api/cleaner/billing/reactivate/route.ts:76-82` | update | `cancel_at`, `status` | `subscriptions_cleaners_update_own` — error not checked |

No client-side (browser or anon-key) **insert** into `subscriptions` exists. All other writers (`lib/stripe/subscription-service.ts:262,321,376`, `lib/stripe/dunning.ts:92,175,247`) use `createServiceRoleClient()` and are unaffected.

**`pros`** — writes on the anon-key path (browser client or anon-key SSR client). Service-role writers (`tcpa.ts`, `pro-signup.ts`, `disputes.ts`, `dunning.ts`, `subscription-service.ts`) omitted; they bypass grants.

| file:line | Client | Op | Columns set | Touches revoke-list? |
|---|---|---|---|---|
| `app/auth/select-role/page.tsx:74-80` | browser | insert | `user_id`, `business_name`, `approval_status` | no |
| `app/auth/callback/route.ts:161-167` | server anon-key | insert | `user_id`, `business_name`, `approval_status` | no |
| `app/dashboard/pro/setup/page.tsx:140-159` | browser | insert | business fields, `insurance_verified`, `license_number`, `instant_booking`, `approval_status` | **`insurance_verified`** (INSERT, not UPDATE) |
| `app/dashboard/pro/profile/page.tsx:120-124` | browser | insert | defaults incl. `insurance_verified:false`, `license_verified:false`, `approval_status` | **`insurance_verified`, `license_verified`** (INSERT, not UPDATE) |
| `app/dashboard/pro/profile/page.tsx:194,215` | browser | update | `profile_image_url`, `updated_at` | no |
| `app/dashboard/pro/profile/page.tsx:312-328` | browser | update | business/contact/address/images, `updated_at` | no |
| `app/dashboard/pro/service-areas/page.tsx:125-131` | browser | update | `service_areas`, `updated_at` | no |
| `app/dashboard/pro/availability/page.tsx:116-119` | browser | update | `instant_booking`, `updated_at` | no |
| `app/api/cleaners/onboarding/route.ts:184` | server anon-key | update | onboarding/business fields, `primary_category` | no |
| `app/api/cleaners/onboarding/route.ts:211` | server anon-key | insert | `user_id`, `business_name`, `business_email`, onboarding, `approval_status`, `primary_category`, `services` | no |
| `app/api/cleaners/onboarding/submit/route.ts:129-137` | server anon-key | update | `onboarding_step`, `onboarding_completed_at`, `approval_status`, images | no |
| `app/api/pros/categories/route.ts:92-97` | server anon-key | update | `primary_category`, `services`, `updated_at` | no |
| `app/api/cleaner/billing/upgrade/route.ts:89-92` | server anon-key | update | **`subscription_tier`** | **YES — UPDATE** |
| `app/api/cleaner/billing/upgrade/route.ts:120-123` | server anon-key | update | `stripe_customer_id` | no |
| `app/api/admin/documents/[id]/route.ts:135` | server anon-key (admin session) | update | `approval_status`, `approved_at` | no (admin) |
| `lib/services/badges.ts:181-184` | passed-in | update | `response_time_hours` | no |
| `components/dashboard/CleanerProfileForm.tsx:96-104` | browser | update | incl. `insurance_verified`, `background_checked` | **YES — but component is dead (0 importers)** |

### 3.3 Verdicts

| Planned change | Verdict | Detail |
|---|---|---|
| **(1)** Column-level `REVOKE UPDATE (insurance_verified, license_verified, background_check_verified, photo_verified, verification_level, subscription_tier)` on `pros` FROM anon, authenticated | **NEEDS CODE CHANGE FIRST** — `app/api/cleaner/billing/upgrade/route.ts:89-92` | That line updates `subscription_tier` as the authenticated pro. After the revoke it fails, and the error is unchecked, so Stripe upgrades while the DB tier stays stale. Fix: delete the inline write (webhook `subscription-service.ts:280` already sets tier via service role) or switch that one write to `createServiceRoleClient()`. Everything else is SAFE: the browser inserts at `setup:155` / `profile:113-114` are INSERTs and are not blocked by an UPDATE revoke. **Gap:** the revoke does not cover INSERT (N-01); recommend `REVOKE INSERT` on the same columns in the same migration. `CleanerProfileForm.tsx` is dead code and can be ignored or deleted. |
| **(2)** Drop `subscriptions_cleaners_insert_own` and `subscriptions_cleaners_update_own` | **WILL BREAK `app/api/cleaner/billing/cancel/route.ts:63-70` and `reactivate/route.ts:76-82`** | Both update `subscriptions` as the authenticated pro and rely on the update-own policy. Failure is silent (errors unchecked): Stripe cancels/reactivates, local row does not. Dropping `_insert_own` alone is SAFE (no anon-key insert exists). Fix before dropping `_update_own`: switch those two writes to `createServiceRoleClient()` after the existing `user_id` ownership check, or drop the writes and rely on `customer.subscription.updated` (`subscription-service.ts:321`) which already syncs `cancel_at`/`status` via service role. |
| **(3)** `REVOKE EXECUTE` on `create_quote_request` and `check_and_increment_customer_limits` FROM anon, authenticated | **WILL BREAK `app/api/quote/route.ts:87,197,238`** — but that route's only UI consumer is `app/qa/quote-demo/page.tsx`. | Production quote flow is `app/quote-request/actions.ts` (direct RLS insert, no RPC) and is unaffected. Recommend: apply the revoke and, in the same PR, delete `app/api/quote/route.ts`, `lib/quoteClient.ts`, `app/qa/quote-demo/page.tsx`, and the `/api/quote` rate-limit block at `middleware.ts:35-39`. If the route must stay for now, the revoke turns it into a 500 rather than a data risk, which is acceptable; it does not affect any paying path. Keep `check_rate_limit` (anon) and `pro_response_time_stats` (anon + authenticated) grants intact. |

---

## 4. Recommended app-layer PR order (one PR each)

1. **PR-1 — Service-role writes ahead of the DB gate (unblocks all three revocations).** `upgrade/route.ts:89-92` remove inline tier write; `cancel/route.ts:63-70` and `reactivate/route.ts:76-82` switch to service role or remove in favor of webhook sync, and check errors. Ship this, verify a cancel/reactivate round-trip in the Stripe test clock, then apply migrations (1) and (2). Success criterion: cancel → `subscriptions.cancel_at` populated with the anon-key policies dropped.
2. **PR-2 — Kill the legacy anon quote path (F-04, F-17, gate (3)).** Delete `app/api/quote/route.ts`, `lib/quoteClient.ts`, `app/qa/quote-demo/page.tsx`, the two modal type imports, and `middleware.ts:35-39`. Then apply revoke (3). Success criterion: `grep -rn "api/quote'" app lib components` returns 0.
3. **PR-3 — F-08 unauthenticated service-role actions (BLOCKER).** `recordUserTcpaConsent` / `seedProServiceArea`: bind to a server-verified proof. Cleanest option: perform these writes inside the `handle_new_user` trigger from `raw_user_meta_data` (phone, zip, consent timestamp) and delete the two actions; the trigger already creates the pros row. `recordProSmsConsent` / `revokeProSmsConsent`: resolve `userId` from `getUser()` instead of the argument (caller always has a session at `setup/page.tsx:167`). Success criterion: no `'use server'` export accepts a `userId` parameter.
4. **PR-4 — F-01 venture stamp on new subscription checkout (BLOCKER).** Add `[VENTURE_KEY]: VENTURE_BOC` to both `metadata` and `subscription_data.metadata` in `upgrade/route.ts:126-150`, or route it through `api/stripe/checkout` which already stamps. Also reject `boc_per_lead` in `api/stripe/checkout` (N-02). Success criterion: test-mode `customer.subscription.created` from the upgrade route produces a `subscriptions` row.
5. **PR-5 — F-06 + F-05 + N-05 public email routes.** Contact: bound lengths, rate-limit via `rateLimitRoute`, `escapeHtml` every interpolation, drop the caller-addressed confirmation or send it without the caller's message body. Delete `signup-notification` and `document-upload-notification` routes; send from the trigger path (signup) and inline in `pro/documents/route.ts:154`. Success criterion: `generateInfoBox` callers pass escaped values or the helper escapes internally.
6. **PR-6 — F-10 / N-01 strip trust fields from self-service payloads.** Remove `insurance_verified` / `license_verified` from `setup/page.tsx:155`, `profile/page.tsx:113-114`; delete `CleanerProfileForm.tsx`. Pair with the INSERT revoke.
7. **PR-7 — N-04 / F-09 rate limiter hardening.** Move `check_rate_limit` to service-role, revoke anon EXECUTE, decide fail-closed for `quote-request`.
8. **PR-8 — F-03 middleware fail-closed** (`middleware.ts:97,149` redirect to `/login` on missing DB role) plus `docs/skills/AUTH_PLAYBOOK.md:35-37` correction.
9. **PR-9 — Mediums batch:** F-24 use `pros.stripe_customer_id` in portal; F-22 stable post-payment landing; F-12 server-side price; F-07 availability range cap + rate limit; F-20 shared validation.
10. **PR-10 — Lows:** F-14, F-16 log hygiene.

Nothing above touches `app/how-it-works/page.tsx`.
