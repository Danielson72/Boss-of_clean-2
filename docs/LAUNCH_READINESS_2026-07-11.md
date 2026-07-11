# Boss of Clean — Launch Readiness Report (2026-07-11)

## Go / No-Go: **GO**, with 3 small pre-launch fixes and 2 your-keyboard checks below.

Everything on the critical path is live and verified: security lockdown applied
and advisor-clean, RLS consolidation applied (top-6 tables; remaining 15
prepared in PR #83, NOT applied), David AI live site-wide on z-ai/glm-5.2 with
full-marketplace scope, DLD-564 pro pages live, Phase 4 UI merged (live
Lighthouse mobile 97 perf / 96 a11y, CLS 0), Node 22 pinned and building green.

## Launch-rehearsal E2E (production, 375px, non-cleaning service)

| Step | Result |
|---|---|
| Signup as new customer (mobile) | ✅ clean, 16px inputs, no zoom issues |
| Email verification | ✅ delivered + confirmed (see F2, F3) |
| Login → customer dashboard | ✅ |
| Quote request: **Pressure Washing** → Sonz of Thunder | ✅ submitted; row `78112799…` `service_type=pressure_washing` `pending` — multi-service flow proven |
| David widget logged-in on mobile | ✅ accurate audience-aware answer, no layout break |
| Pro responds with quote → customer accepts → $30 unlock | ⛔ **requires Daniel**: needs the `dalvarez@sotsvc.com` pro login, and the unlock uses the LIVE card (per instructions, stop before payment). ~10-minute manual rehearsal. |

Screenshots: `docs/screenshots/e2e-launch/01–10`.

## Findings (fix nothing without reporting — none fixed unless noted)

- **F1 — Signup email says "join our cleaning platform."** Stale scope copy.
  Not in the repo → it's the Supabase Auth "Confirm signup" template
  (dashboard-managed). 2-minute dashboard edit; suggested copy: "join
  Florida's marketplace for home and business service pros."
- **F2 — Verify-link lands on /login with an unused ?code param** when opened
  in a different browser than signup (normal PKCE behavior; email still
  confirms and password login works). Cosmetic; consider stripping the param
  or showing "email confirmed — please sign in."
- **F3 — Refund/review policies are drafts only** (`docs/legal-drafts/`, PR
  #71). No live /refund-policy route and no footer link. /terms and /privacy
  render clean (no placeholder text). Decide: publish before launch or accept
  terms+privacy as sufficient day-one.
- **F4 — Duplicate DLD-567 PRs.** My #85 (path fix, merged) supersedes #80
  (service-role approach, still open) — **close #80**. Also open from the
  ticket batch: #81 (DLD-566 receipt_url — nice-to-have) and #83 (DLD-572
  phase-2 RLS migration — prepared, NOT applied, post-launch).
- **F5 — Footer was cleaning-only** — fixed and live in #85 (now driven by
  service_categories, same as homepage + David).

## Open items
1. Daniel: manual pro-side rehearsal (quote response → accept → live $30
   unlock) — the only untested production leg; webhook + capture path was
   proven with real July payments.
2. Daniel: Supabase dashboard email-template copy fix (F1).
3. Decision: publish refund/review policy pages or defer (F3).
4. Close PR #80 as superseded; schedule #81, #83 post-launch.
5. Post-launch calendar: Stripe CLI keys expire 2026-10-02 (DLD-571);
   84 unused-index review after real traffic.

## DLD-567 status
Fixed in code (uid-prefixed upload path), merged in #85, deployed green.
**No migration was needed and nothing was applied to the DB** — zero existing
job-photos objects/rows meant a pure code fix was the least invasive option.

## Test artifacts created today (cleanup whenever)
`dalvarez+launch-e2e@sotsvc.com` customer + pressure-washing quote
`78112799…` (marked LAUNCH REHEARSAL TEST). The purge script pattern from
`scripts/purge-test-data.ts` can be adapted.
