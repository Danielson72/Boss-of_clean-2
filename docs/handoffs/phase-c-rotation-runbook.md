# Phase C — Env Var Inventory & `sk_live_` Rotation Runbook (BOC)

**Ticket:** DLD-532
**Mode:** DOCUMENTATION-ONLY (no env changes, no deploys, no value disclosure)
**Date:** 2026-05-27
**Author:** CTO agent
**Hard dependency for:** DLD-533 (key rotation — human-required, do NOT auto-start)
**Sibling audit:** [`phase-c-stripe-api-audit.md`](./phase-c-stripe-api-audit.md) (DLD-531) defines the `rk_live_` scope list.

---

## 0. Safety contract (read before doing anything)

- **No values appear in this document.** Only env var NAMES, scope flags, context lists, and timestamps. Every command in §3 / §6 was either (a) read-only or (b) value-piped through `jq` / `python` to drop secrets before terminal display.
- **No env vars were changed by this ticket.** This is recon only. The rotation itself is a separate, human-required ticket (DLD-533).
- **No deploys.** Saturday is Sabbath — no merges, no pushes, no scheduled jobs on Saturday.
- **No git push happened.** A push will be required during the actual rotation (§5 step 5) to activate the new value.

---

## 1. Workspace location (must read)

Same workspace quirk as the prior audit applies. The Paperclip project workspace for "Boss of Clean" registers `/Users/danielalvarez/Desktop/Boss-of_clean-2-main/` as the primary cwd, but the **actual Next.js 13.5 source tree** is at:

- `/Users/danielalvarez/Boss-of-Clean/` (linked Netlify project — `.netlify/state.json` → site `0c5ad35e-93ed-4512-892d-e9949e3d238f`)

All `netlify` CLI commands in this runbook must be run from that path. A copy of this runbook also lives at `/Users/danielalvarez/Boss-of-Clean/docs/handoffs/phase-c-rotation-runbook.md` for discoverability from the code tree.

---

## 2. Netlify site metadata (snapshot 2026-05-27)

| Field | Value |
|---|---|
| Site ID | `0c5ad35e-93ed-4512-892d-e9949e3d238f` |
| Site name | `bossofclean2` |
| Custom domain | `bossofclean.com` |
| Admin URL | `https://app.netlify.com/projects/bossofclean2` |
| Connected repo | `Danielson72/Boss-of_clean-2` (branch `main`) |
| Build command | `npm run build` |
| Publish dir | `.next` |
| Functions region | `us-east-2` |
| Plugins | `@netlify/plugin-nextjs@5`, `@netlify/plugin-lighthouse@6` |
| Last published deploy | `6a149cddab0ec700087ae374` (commit `a232486`, 2026-05-25T19:03:46Z) |

Build env baked into `netlify.toml` (non-secret):

- `NODE_VERSION=20`
- `NEXT_TELEMETRY_DISABLED=1`
- `NODE_OPTIONS=--max-old-space-size=4096`

---

## 3. Env var inventory — names only

Source: `netlify env:list --json` from `/Users/danielalvarez/Boss-of-Clean/`, piped through `python3` to drop values. Values were NEVER printed to stdout or written here. Scope/context metadata pulled via `netlify api getEnvVar` (per-var, metadata only — no values requested or displayed).

### 3.1 Stripe (this is the rotation surface)

| Name | Scopes | Contexts | `is_secret` | Last updated | Notes |
|---|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | builds, functions, runtime | branch-deploy, deploy-preview, dev, production | ✅ true | 2026-05-15 | **THIS IS THE `sk_live_…` BEING ROTATED.** Currently powers `lib/stripe/config.ts:11`. |
| `STRIPE_BOC_RESTRICTED_KEY` | builds, functions, runtime | branch-deploy, deploy-preview, dev, dev-server, production | ✅ true | 2026-05-08 | **Empty slot — placeholder for the `rk_live_…` swap defined by DLD-454.** Not currently referenced by code. |
| `STRIPE_WEBHOOK_SECRET` | builds, functions, runtime | branch-deploy, deploy-preview, dev, production | ✅ true | 2026-05-15 | **DO NOT TOUCH during sk_live_ rotation.** Webhook signing key is independent of API key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | builds, functions, post_processing, runtime | branch-deploy, deploy-preview, dev, production | ❌ false (public by design) | 2026-05-15 | `pk_live_…`. Out of scope for this rotation. |
| `STRIPE_BASIC_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Subscription tier price IDs. Not secrets. |
| `STRIPE_PRO_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | — |
| `STRIPE_ENTERPRISE_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Not referenced by active code; legacy archive only. |
| `STRIPE_FREE_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Not referenced by active code. |
| `STRIPE_LEAD_UNLOCK_STANDARD_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Pre-provisioned for DLD-517 (Pay-on-Acceptance). Not referenced by active code yet. |
| `STRIPE_LEAD_UNLOCK_DEEPCLEAN_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Same — pre-provisioned for DLD-517. |
| `STRIPE_LEAD_UNLOCK_SPECIALTY_PRICE_ID` | builds, functions, runtime | (default) | non-secret | — | Same — pre-provisioned for DLD-517. |

### 3.2 Supabase

| Name | Scopes | Contexts | `is_secret` | Last updated | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | builds, functions, post_processing, runtime | all | ❌ false | 2025-08-11 | Project URL. Out of scope. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | builds, functions, runtime | branch-deploy, deploy-preview, dev, dev-server, production | ✅ true | 2025-08-11 | RLS-gated anon key. Out of scope for sk_live_ rotation. |
| `SUPABASE_SERVICE_ROLE_KEY` | builds, functions, runtime | branch-deploy, deploy-preview, dev, dev-server, production | ✅ true | 2025-08-11 | Server-side service-role key. Out of scope for sk_live_ rotation. |

### 3.3 Notification / email / admin

| Name | `is_secret` | Notes |
|---|---|---|
| `RESEND_API_KEY` | ✅ true | Email sender. Out of scope. |
| `ADMIN_EMAIL` | ❌ false | Out of scope. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | ❌ false | Out of scope. Not currently referenced in active code. |

### 3.4 Site config

| Name | Notes |
|---|---|
| `SITE_URL` | Server-side site URL. |
| `NEXT_PUBLIC_SITE_URL` | Client-side site URL. |

### 3.5 Build / runtime config (non-secret)

| Name | Notes |
|---|---|
| `NODE_VERSION` | Overrides toml-baked value if set in UI. |
| `NODE_OPTIONS` | Heap size flag for Next build. |
| `NEXT_TELEMETRY_DISABLED` | Disables Next telemetry. |
| `SECRETS_SCAN_ENABLED` | Netlify secret-scanning gate. |
| `SECRETS_SCAN_OMIT_KEYS` | List of env names the scanner should not flag. |
| `SECRETS_SCAN_OMIT_PATHS` | List of paths the scanner should not crawl. |

### 3.6 Discrepancies — code references not in Netlify

These names appear in `process.env.*` reads in `/Users/danielalvarez/Boss-of-Clean/` source but are **NOT** currently set in the Netlify env. They are not blockers for the sk_live_ rotation, but flag for awareness:

| Name | Referenced at | Risk |
|---|---|---|
| `STRIPE_PRICE_BOC_PER_LEAD` | `lib/stripe/config.ts:34` | Reads to `undefined`. Used by per-lead pricing helper. Likely dead code now that the lead-unlock price IDs (§3.1) have their own dedicated names. Not a rotation blocker. |
| `STRIPE_USE_MCP` | `lib/stripe/mcp.ts:26` | Defaults to `false` when unset → SDK path. Safe. |
| `TWILIO_ACCOUNT_SID` | `lib/sms/twilio.ts:23`, `lib/sms/notifications.ts:65` | SMS would 500 if exercised. SMS flow is not on the critical sk_live_ rotation path — flag separately. |
| `TWILIO_AUTH_TOKEN` | `lib/sms/twilio.ts:24`, `lib/sms/notifications.ts:65` | Same. |
| `TWILIO_PHONE_NUMBER` | `lib/sms/twilio.ts:47` | Same. |
| `ANTHROPIC_API_KEY` | `app/api/boc-chat/route.ts:27` | BOC chat route would 500 if exercised. Out of scope for sk_live_ rotation. |

### 3.7 `netlify env:list` "empty default" quirk (must read)

`netlify env:list --json` returns the `all` context value for each var by default. When a var has only **per-context** values (no `all` default), the `--json` map shows that var with an empty string. The actual values are present in their per-context slots — they just aren't in the `all` default.

Observed for: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_BOC_RESTRICTED_KEY`. (For `STRIPE_BOC_RESTRICTED_KEY` the slot is genuinely empty — that's the rk_live_ landing pad.)

**Implication for the runbook:** when setting the new key in §5, use `netlify env:set <NAME> <VALUE> --context production` (or use the UI per-context). Do not assume `--context all` will satisfy the production runtime if the existing setup is per-context.

---

## 4. Rotation runbook — swap exposed `sk_live_` (manual, human-driven)

> **Goal:** swap the exposed `sk_live_…` value currently held in `STRIPE_SECRET_KEY` for a fresh value generated in the Stripe Dashboard, with zero downtime for live checkout / billing flows.
>
> **Pre-req:** Daniel is at the keyboard. Not Saturday. No active payment intents mid-flight (or Daniel accepts that an in-flight `payments_intent.succeeded` may need to be retried by Stripe — they retry on 500 / signature mismatch).
>
> **Out of scope here:** the scoped `rk_live_…` restricted-key migration. That is DLD-454 and is unblocked by the `STRIPE_BOC_RESTRICTED_KEY` slot already provisioned in §3.1. This runbook only addresses the immediate rotation of the leaked unrestricted `sk_live_…`.

### 4.1 Order of operations (no-gap rotation)

```
1. (Stripe Dashboard) Generate new sk_live_ key.    ← key exists, NOT in code path yet
2. (Netlify) Set STRIPE_SECRET_KEY = new value, all 4 contexts.
3. (Verify) `netlify env:get STRIPE_SECRET_KEY` shows the new value in production context.
4. (Stripe Dashboard) DO NOT yet revoke the old key — production deploy still serves it.
5. (Git) Push a no-op commit to main to force Netlify to rebuild with the new env. Wait for `state=ready`.
6. (Verify) Hit a low-risk live endpoint that touches Stripe (see §4.4). Confirm 200, not 401.
7. (Verify) Send a Stripe Dashboard test webhook → confirm `200 OK` from `/api/webhooks/stripe`.
8. (Stripe Dashboard) NOW revoke the old leaked key. Confirm `Revoked` status appears in the dashboard.
9. (Verify, post-revoke) Re-hit the live endpoint from step 6. Confirm still 200. If 401, the new value is wrong in Netlify — see §7 rollback.
10. (Paperclip) Comment on DLD-533 with timestamps for steps 1-9, then close.
```

### 4.2 Why the git push in step 5 is non-negotiable

Setting a Netlify env var does **not** retroactively re-bind the value to the currently-running production deploy. The deploy that's serving `bossofclean.com` right now was built with the old value baked into the function bundle. A new build is required to bind the new value.

Routes to trigger a rebuild, in order of preference:

1. **Push a no-op commit to `main`** (preferred — leaves an audit trail). Example:
   ```bash
   cd /Users/danielalvarez/Boss-of-Clean
   git commit --allow-empty -m "ops: trigger rebuild for STRIPE_SECRET_KEY rotation (DLD-533)

   Co-Authored-By: Paperclip <noreply@paperclip.ing>"
   git push origin main
   ```
2. **Trigger a deploy without a commit** via UI (`Deploys → Trigger deploy → Clear cache and deploy site`) — works but leaves no git audit trail. Not preferred.
3. **`netlify deploy --prod`** from the CLI — also bypasses git history. Not preferred.

Use option 1.

### 4.3 Local shell quirk for `netlify` CLI (`PATH` + `/bin/zsh`)

When running the Netlify CLI from this Mac, the agent/automation context can lose access to Homebrew's binaries (`/opt/homebrew/bin`) and the user's shell defaults. If a `netlify` command fails with `command not found` or unexpected resolution errors, prefix the invocation:

```bash
/bin/zsh -lc 'export PATH=/opt/homebrew/bin:$PATH && netlify <args>'
```

This applies to **any** Netlify CLI step in §4.1 (`env:set`, `env:get`, `env:list`, `api`, `deploy`). It does **not** apply to the in-cloud Netlify build — that build is driven by `netlify.toml` (`npm run build`) inside Netlify's container, where PATH is correct by default.

### 4.4 Recommended live smoke endpoints (post-rebuild verification)

| Endpoint | Method | What it proves | Expected |
|---|---|---|---|
| `GET /api/cleaner/billing` (auth'd as a test pro) | GET | `stripe.subscriptions.retrieve` works with new key | 200 + subscription JSON |
| `POST /api/stripe/portal` (auth'd as a test pro) | POST | `stripe.billingPortal.sessions.create` works | 200 + redirect URL |
| Send a `payment_intent.succeeded` test event from Stripe Dashboard → `https://bossofclean.com/api/webhooks/stripe` | external | `stripe.webhooks.constructEvent` HMAC still verifies (this is independent of the API key, but confirms `STRIPE_WEBHOOK_SECRET` wasn't accidentally touched) | 200 OK in Stripe Dashboard event log |

If any of these returns `401 Unauthorized` from Stripe, the new key is not bound to the function runtime. Go to §7 rollback.

### 4.5 What to **never** do during this rotation

- **Never echo or copy-paste the key value into a Paperclip comment, terminal log, or git commit.** Stripe revokes pasted keys aggressively, and the leak is what triggered this rotation in the first place.
- **Never set the new value via `netlify env:set STRIPE_SECRET_KEY <value>` in a shared terminal session that's being recorded** — the value goes into shell history. Use the Netlify UI (Site → Project configuration → Environment variables → Edit) for the value entry.
- **Never delete `STRIPE_SECRET_KEY` and re-create it.** If the key is removed even briefly, every live function invocation hitting Stripe between delete and re-add will 500. Edit in place.
- **Never touch `STRIPE_WEBHOOK_SECRET` during this rotation.** It is independent of the API key. Touching it requires re-pointing the Stripe Dashboard webhook endpoint, which is a separate, larger change.
- **Never run this on Saturday.** Sabbath.

---

## 5. Step-by-step UI walkthrough (Netlify side)

For the non-CLI path, which is the recommended path for value entry:

1. Open `https://app.netlify.com/projects/bossofclean2/configuration/env`.
2. Find `STRIPE_SECRET_KEY` in the list.
3. Click **Options → Edit**.
4. For **each** of the 4 contexts (`production`, `deploy-preview`, `branch-deploy`, `dev`), paste the new `sk_live_…` value.
   - Keep `Mark as secret` checked.
   - Keep scopes as `Builds`, `Functions`, `Runtime`.
5. Click **Save**.
6. Push the no-op commit (§4.2 option 1).
7. Watch the deploy at `https://app.netlify.com/projects/bossofclean2/deploys`. Wait for `Published`.
8. Run §4.4 smoke checks.
9. Revoke the old key in the Stripe Dashboard (`https://dashboard.stripe.com/apikeys` → Revoke).
10. Re-run §4.4 smoke checks.

---

## 6. Re-running the inventory (for future audits)

To regenerate §3 without leaking values:

```bash
# 1. Names only
cd /Users/danielalvarez/Boss-of-Clean
netlify env:list --json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(k) for k in sorted(d.keys())]"

# 2. Per-var context + scope metadata (no value printed)
netlify api getEnvVar \
  --data='{"account_id":"NETLIFY","site_id":"0c5ad35e-93ed-4512-892d-e9949e3d238f","key":"STRIPE_SECRET_KEY"}' \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
meta = {k: d.get(k) for k in ['scopes','is_secret','updated_at']}
meta['contexts'] = sorted({x.get('context','') for x in d.get('values',[])})
print(json.dumps(meta, indent=2))
"
```

Both commands keep values out of stdout. If you need to verify a specific value, do it **interactively** in the Netlify UI (no terminal capture).

---

## 7. Rollback plan

If §4.1 step 6 or step 9 returns `401 Unauthorized` from Stripe:

1. **Do not revoke the old key.** (If you've already revoked it, skip to step 4.)
2. In the Netlify UI, edit `STRIPE_SECRET_KEY` and paste the **old** `sk_live_…` value back into the production context.
3. Push another no-op commit to force a rebuild. Wait for `state=ready`. Re-run §4.4 — should return 200.
4. If you've already revoked the old key in Stripe: generate a second NEW `sk_live_…` from the Stripe Dashboard, set that as `STRIPE_SECRET_KEY`, rebuild, verify. The original old leaked key remains revoked.
5. File a comment on DLD-533 with what failed and the recovery path taken.

---

## 8. Open follow-ups this runbook leaves behind

| Item | Ticket | Status |
|---|---|---|
| Update Paperclip project workspace `cwd` to the real BOC source path (`/Users/danielalvarez/Boss-of-Clean/`) | (none yet — recommended in DLD-531 sibling audit) | Open recommendation |
| Migrate `STRIPE_SECRET_KEY` consumer to `STRIPE_BOC_RESTRICTED_KEY` (scoped `rk_live_`) | DLD-454 | Blocked until DLD-533 completes |
| Decide fate of `STRIPE_PRICE_BOC_PER_LEAD` reference at `lib/stripe/config.ts:34` (dead code vs missing env) | (file under DLD-517 — Pay-on-Acceptance) | Open question |
| Twilio env vars referenced but not set in Netlify | (separate SMS ticket) | Out of scope for sk_live_ rotation |
| `ANTHROPIC_API_KEY` not set in Netlify but referenced by `/api/boc-chat` | (separate BOC chat ticket) | Out of scope for sk_live_ rotation |

---

## 9. Sign-off contract (what this ticket does and does not authorize)

- ✅ **Does** authorize DLD-533 to proceed using §4 and §5 as the exact rotation script.
- ✅ **Does** authorize re-running §6 commands on subsequent audits.
- ❌ **Does NOT** authorize: rotation execution (DLD-533 is human-required), `rk_live_` migration (DLD-454 separate), webhook secret rotation, deletion of any env var, Saturday work.
- ❌ **Does NOT** disclose any env var value. Anyone needing to verify a value should do so interactively in the Netlify UI or via `netlify env:get <NAME> --context production` in a private (not recorded) terminal session.
