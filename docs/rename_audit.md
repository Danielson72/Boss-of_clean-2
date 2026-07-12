# Rename Audit — `cleaner` → `pro` / `pros`

**Scope:** Read-only audit of `/Users/danielalvarez/Boss-of-Clean` (branch `feature/dld-539-pwa`).
**Date:** 2026-05-31.
**Goal:** Catalog every remaining reference to the old "cleaner" naming that should now be "pro"/"pros" (`cleaner_id`, `cleaners` table refs, `cleaner` in routes/types/components/SQL). No source files were modified.

---

## Count summary per group

| Group | Meaning | Count (line-level findings) |
|-------|---------|------------------------------|
| **A** | Pure UI / cosmetic (visible copy, comments, identifiers, route slugs, test descriptions) | **~966** |
| **B** | Data / query logic (`.from('cleaners')`, `.eq('cleaner_id', …)`, TS type fields, API/route field names, exported fn/type names that carry ids) | **~512** |
| **C** | RLS / schema-touching (DDL, RLS policies, indexes, triggers, functions, enum, storage buckets) | **~445** |
| | **Total non-`.md` line matches scanned** | **2,693** |

> Counts are approximate at the line level because long identical runs (e.g. repeated `idx_cleaners_*` index lines, repeated marketing copy, repeated RLS subqueries) were collapsed with a noted count by the per-directory audit passes. The *intent* — which files/lines are A/B/C and what each should become — is exhaustive below.

### How to read these counts

A very large share of group A is **intentional consumer-facing product language**. "Cleaner" is still a legitimate customer-facing word for a service provider in marketing copy, FAQ answers, email bodies, and hero taglines ("Find Any Cleaner in…"). Those are listed and marked **keep — consumer copy**; they are *not* rename targets. The rename effort proper is groups **B** and **C** plus the non-consumer slice of A (component names, internal vars, comments, internal route segments).

---

## ⚠️ Critical nuance: `portfolio_photos.pro_id` stores `auth.uid()`, NOT `pros.id`

**Verified status: the live application code handles this correctly.** All three runtime consumers of `portfolio_photos` query `pro_id` against the authenticated user id (`user.id` = `auth.uid()`), each with an explicit confirming comment:

| File | Lines | Evidence |
|------|-------|----------|
| [app/api/cleaner/portfolio/route.ts](../app/api/cleaner/portfolio/route.ts) | 73, 77, 121, 125, 154, 156, 228, 247, 311, 323 | `// pro_id stores auth user id (matches RLS: pro_id = auth.uid())`; queries use `.eq('pro_id', user.id)` |
| [app/dashboard/pro/portfolio/page.tsx](../app/dashboard/pro/portfolio/page.tsx) | 55–61 | `// pro_id stores auth user id to match RLS policy pro_id = auth.uid()`; `.eq('pro_id', user.id)` |
| [app/cleaner/[slug]/page.tsx](../app/cleaner/%5Bslug%5D/page.tsx) | 136–145 | `getCleanerPortfolio(proUserId)` is passed the **auth user id**, not `pros.id`; `.eq('pro_id', proUserId)` |

**No code was found that wrongly joins `portfolio_photos.pro_id` to `pros.id` or treats it as a `pros` FK.** Do not "fix" these queries to join `pros` — that would be the bug.

**The one stale artifact** is the seed SQL, which contradicts production (see Group C, `supabase/16-portfolio-photos.sql`): it still defines `cleaner_id UUID REFERENCES public.cleaners(id)`, whereas the live column is `pro_id` holding `auth.uid()` with no FK to `pros`. Flagged below.

> Note on a previously-overstated flag: [app/api/cleaner/portfolio/route.ts:37](../app/api/cleaner/portfolio/route.ts#L37) `cleaner_id: row.pro_id` is **not a correctness bug** — it maps the real DB column `pro_id` (an auth uid) onto a legacy DTO field still named `cleaner_id`. It is a **Group B naming inconsistency** only. The value plumbing is correct.

---

## Schema ground-truth (why "keep" appears so often in SQL)

Migration [supabase/migrations/20260515152653_dld444_rename_cleaners_to_pros.sql](../supabase/migrations/20260515152653_dld444_rename_cleaners_to_pros.sql) already:

- Renamed table `public.cleaners` → `public.pros`.
- Created a **backwards-compat view** `public.cleaners` (`security_invoker = on`) aliasing `pros`, so all old `.from('cleaners')` / `FROM cleaners` references keep working.
- **Intentionally did NOT** rename: FK columns `cleaner_id` (~20 tables), sibling tables (`cleaner_documents`, `cleaner_availability`, `cleaner_blocked_dates`, `cleaner_reviews`), `cleaner_response*` columns, index/constraint/trigger names (`idx_cleaners_*`, `unique_*_cleaner_*`, `generate_cleaner_slug`, `enforce_cleaner_location_complete`), the `cleaner_directory` view, the `user_role` enum value `'cleaner'`, and the storage bucket `cleaner-documents`.

Consequences for this audit:
- The **numbered seed files** (`supabase/01-*.sql` … `supabase/23-*.sql`, `complete-schema.sql`, `schema.sql`) are the **pre-rename historical schema**, superseded by the migration. Their `cleaners`/`cleaner_id` references are marked **legacy — superseded by view**; the target name is `pros`/`pro_id` but re-running them is not how the live DB is built.
- The rename migration itself is **correct as-is** — its dual references to both names are by design.
- Anything still named `cleaner_*` that the migration deliberately deferred is **stale-but-functional**; renaming it is follow-up cleanup, not a live bug (except the storage bucket and the portfolio seed, noted below).

---

# GROUP A — Pure UI / cosmetic

> Visible copy, comments, cosmetic identifiers, internal route segments, test descriptions. The largest sub-bucket is **intentional consumer copy (keep)**.

### A.1 Intentional consumer-facing copy — **KEEP** (representative; ~hundreds of lines)

| File | Lines | Current text (sample) | Disposition |
|------|-------|------------------------|-------------|
| [lib/data/service-types.ts](../lib/data/service-types.ts) | 18–246 (~18) | FAQ answers: "professional cleaners", "window cleaners", "carpet cleaners", "STR cleaners" | keep — consumer copy |
| [lib/email/notifications.ts](../lib/email/notifications.ts) | 119–184 (~6) | "this lead will be available to other cleaners…" | keep — consumer email copy |
| [lib/email/review-request.ts](../lib/email/review-request.ts) | 38–84 | "helps other customers find great cleaners…" | keep — consumer email copy |
| [lib/boc-assistant-knowledge.ts](../lib/boc-assistant-knowledge.ts) | 5, 14 | assistant knowledge: "PROS (CLEANERS / SERVICE PROVIDERS)" | keep — consumer/assistant copy |
| [app/about/page.tsx](../app/about/page.tsx) | 60 | "from cleaners and landscapers to handymen…" | keep — consumer copy |
| [app/str-turnover/page.tsx](../app/str-turnover/page.tsx) | 241 | "Get an exact quote from cleaners in your area." | keep — consumer copy |
| [app/services/[serviceType]/ServicePageClient.tsx](../app/services/%5BserviceType%5D/ServicePageClient.tsx) | 128 | "// Calculate average price from cleaners offering this service" | keep — consumer-context comment |
| [tests/mobile-hero.spec.ts](../tests/mobile-hero.spec.ts) | 60 | locator `p:has-text("Find Any Cleaner in")` | keep — asserts marketing tagline |
| [.github/ISSUE_TEMPLATE/feature_spec.yml](../.github/ISSUE_TEMPLATE/feature_spec.yml) | 56 | `- label: Cleaners (service providers)` | keep — consumer/role label |
| (app/ marketing surfaces) | various | "Find professional cleaners", "Top-Rated Cleaners", "Perfect Cleaner", "Cleaner profile not found" (user-facing error) | keep — consumer copy |

### A.2 Cosmetic identifiers / comments / internal route slugs — rename in cleanup

| File | Lines | Current text | Correct equivalent |
|------|-------|--------------|--------------------|
| [middleware.ts](../middleware.ts) | 2, 131 | `// The 'cleaner' role maps to '/dashboard/pro'`; `// Also catch old /dashboard/cleaner paths` | update comments to reflect role wording; backwards-compat redirect logic itself = keep |
| [lib/utils/dashboard-path.ts](../lib/utils/dashboard-path.ts) | 3 | `// The 'cleaner' role maps to '/dashboard/pro'` | cosmetic comment; keep until enum renamed |
| [lib/email/booking-confirmation.ts](../lib/email/booking-confirmation.ts) | 4 | comment "Sent to a cleaner when admin rejects…" | "Sent to a pro…" |
| [lib/quoteClient.ts](../lib/quoteClient.ts) | 6, 96, 159 | comments "Cleaner data…", "cleaner tier limits", "Cleaner ID is required" | "Pro …" |
| Component **files/symbols** (cosmetic rename — see also B for their query-bearing props): `components/search/CleanerCard.tsx` → `ProCard.tsx`; `components/booking/CleanerBookingList.tsx` → `ProBookingList.tsx`; `components/dashboard/CleanerProfileForm.tsx` → `ProProfileForm.tsx`; `components/modals/CleanerCapacityModal.tsx` → `ProCapacityModal.tsx`; `components/admin/TopCleanersTable.tsx` → `TopProsTable.tsx`; `app/dashboard/admin/components/cleaner-detail-modal.tsx` → `pro-detail-modal.tsx` | filenames + identifiers | `Cleaner*` | `Pro*` (cascade to `components/search/index.ts` exports lines 13–14, 149) |
| Internal **route segments** (cosmetic slug, but redirect/links must follow): `app/cleaner/[slug]/` → `app/pro/[slug]/`; `app/book/[cleanerId]/` → `app/book/[proId]/`; `app/api/cleaner/*` → `app/api/pro/*`; `app/api/cleaners/*` → `app/api/pros/*`; `app/api/availability/[cleanerId]/` → `app/api/availability/[proId]/` | path segments | `cleaner`/`cleaners`/`cleanerId` | `pro`/`pros`/`proId` (note: `app/api/pro/documents/route.ts` already exists alongside legacy `app/api/cleaner/*`) |
| [ralph/PRD.json](../ralph/PRD.json) | 8, 20–37 (~12) | spec text "cleaner subscription tiers", "total cleaners", "Top cleaners…", "cleaner dashboard", "cleaner profiles", `components/search/CleanerCard.tsx` | "pro …" / `ProCard.tsx` (spec doc) |
| [scripts/check-rls-and-schema.js](../scripts/check-rls-and-schema.js) | 51, 170–171 | log message "…cleaners missing location data"; loop var `cleaner` | cosmetic; "pros" in log, var optional |
| [tests/lead-unlock.spec.ts](../tests/lead-unlock.spec.ts) | ~8 | skip messages "Requires authenticated cleaner session" | "…pro session" |
| [tests/payment-flows.spec.ts](../tests/payment-flows.spec.ts) | 10, 61–76, 387, 554, 631 | doc comment + section comments "(requires cleaner auth)"; test names "free/basic/pro tier cleaner …" | "…pro auth"; rephrase "pro tier cleaner" → e.g. "pro tier user" to avoid "pro tier pro" |
| [supabase/04-sample-data.sql](../supabase/04-sample-data.sql) | 4, 10, 19, 104 | comments "sample cleaners…" | "sample pros…" (cosmetic in legacy seed) |
| [supabase/03-auth-setup.sql](../supabase/03-auth-setup.sql) | 7 | comment "Only 'customer' and 'cleaner' are allowed…" | tied to enum value; see Group C |
| [supabase/seed-test-verticals.mjs](../supabase/seed-test-verticals.mjs) | 2, 91–92, 409–470 (~16) | comments + object keys/fn names using "cleaner" | "pro" (test seed) |

---

# GROUP B — Data / query logic

> Supabase queries on the `cleaners` view / `cleaner_id` columns / sibling tables, TS interface & field names that carry ids, exported function/type names, API & route field names, Stripe metadata keys, test mocks asserting these.

### B.1 TypeScript type layer (`lib/types/*`) — field & type renames

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [lib/types/database.ts](../lib/types/database.ts) | 75–77 | interface `DbCleaner` (+comment) | `DbPro` (keep `DbCleaner` as deprecated alias if needed) |
| | 120–124 | `CleanerWithUser` | `ProWithUser` |
| | 131, 163, 216, 237, 313, 325, 355, 513, 516 | `cleaner_id: string` on DbSubscription / DbQuoteRequest / DbReview / DbPayment / DbLeadMatch / DbBooking / DbMessage etc. | `pro_id: string` |
| | 179 | `cleaner_response: string \| null` (DbReview) | `pro_response` (DB column deferred; type may stay until column renamed) |
| | 252–254 | `DbCleanerServiceArea` + `cleaner_id` | `DbProServiceArea` + `pro_id` |
| | 390, 403 | `CleanerUpdate`, `CleanerInsert` | `ProUpdate`, `ProInsert` |
| [lib/types/api.ts](../lib/types/api.ts) | 10, 67, 85, 171, 173, 230, 269, 310–486 (~20) | `CleanerSearchResult`, `CleanerProfileFormData`, fields `cleaner_id`, response key `cleaner?` | `ProSearchResult`, `ProProfileFormData`, `pro_id`, `pro?` |

### B.2 Auth role plumbing (`'cleaner'` literal) — coupled to the `user_role` enum (Group C)

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [lib/types/database.ts](../lib/types/database.ts) | 10 | `UserRole = 'customer' \| 'cleaner' \| 'admin'` | `'pro'` (must land with enum migration) |
| [lib/context/AuthContext.tsx](../lib/context/AuthContext.tsx) | 7, 14, 18, 31, 171, 202, 214 | `'cleaner'` literals, `isCleaner` flag, `dbRole === 'cleaner'` | `'pro'`, `isPro` |
| [lib/auth/auth-service.ts](../lib/auth/auth-service.ts) | 8, 140, 150, 152 | role literal; `getCleanerProfile()`; return key `{ cleaner }` | `'pro'`; `getProProfile()`; `{ pro }` |
| [lib/auth/protected-route.tsx](../lib/auth/protected-route.tsx) | 9, 18, 46, 50 | role literal; `isCleaner`; `requireRole === 'cleaner'` | `'pro'`; `isPro` |
| [lib/utils/dashboard-path.ts](../lib/utils/dashboard-path.ts) | 6 | `if (role === 'cleaner')` | `'pro'` |
| [middleware.ts](../middleware.ts) | 6, 119 | `userRole === 'cleaner'` / `userRole !== 'cleaner'` path guards | `'pro'` (must change in lockstep with enum + AuthContext) |
| [tests/payment-utils.ts](../tests/payment-utils.ts) | 103, 112 | `interface CleanerTestUser`, mock `role: 'cleaner'` | `ProTestUser`; role literal follows enum |

> ⚠️ The `'cleaner'` role literal is load-bearing: it must be migrated atomically across the `user_role` enum (Group C), `AuthContext`, `protected-route`, `middleware`, and `dashboard-path` or auth/redirect logic breaks.

### B.3 Supabase queries on `cleaner_id` / sibling tables / `cleaners` view

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [components/messaging/StartConversationButton.tsx](../components/messaging/StartConversationButton.tsx) | 10, 24, 47, 92 | props `cleanerId`/`cleanerName`; `.eq('cleaner_id', cleanerId)` (conversations FK) | `proId`/`proName`; `.eq('pro_id', …)` once column renamed |
| [lib/hooks/useMessages.ts](../lib/hooks/useMessages.ts) | 120, 129 | `cleaner_id` field; joined `cleaner: {…}` | `pro_id`; `pro: {…}` |
| [lib/hooks/usePendingDocumentActions.ts](../lib/hooks/usePendingDocumentActions.ts) | 44–60 | `.from('pros')` joined via `.eq('cleaner_id', …)`; `.from('cleaner_documents')` | `.eq('pro_id', …)`; sibling table rename deferred |
| [lib/hooks/useProSidebarCounts.ts](../lib/hooks/useProSidebarCounts.ts) | 77–78 | `.eq('cleaner_id', pro.id)`, `cleaner_unread_count` | `.eq('pro_id', …)`, `pro_unread_count` |
| [lib/quoteClient.ts](../lib/quoteClient.ts) | 9, 41, 59, 97, 101, 103–105, 158 | `cleaner_id` field; `CleanerCapacityError`; `isCleanerCapacityError()`; `if (!payload.cleaner_id)` | `pro_id`; `ProCapacityError`; `isProCapacityError()` |
| [lib/services/analytics.ts](../lib/services/analytics.ts) | 41, 54, 153, 169 | `getEarningsData(cleanerId)`; `.eq('cleaner_id', cleanerId)` | `proId`; `.eq('pro_id', …)` |
| [lib/services/admin-analytics.ts](../lib/services/admin-analytics.ts) | 7, 17, 26, 39–40, 82–87, 126–206 (~16) | `totalCleaners`, `TopCleaner`, `cleanerTiers`, `topCleanersByReviews`, etc. | `totalPros`, `TopPro`, `proTiers`, `topProsByReviews` |
| [lib/services/admin-payments.ts](../lib/services/admin-payments.ts) | 5–6, 16, 220, 222 | `cleanerName`, `cleanerTier`, embed `cleaner:pros(…)` | `proName`, `proTier`, `pro:pros(…)` |
| [lib/services/badges.ts](../lib/services/badges.ts) | 4, 30, 111, 137–260 (~20) | `CleanerBadgeData`, `getCleanerBadges()`, `…(cleanerId)` | `ProBadgeData`, `getProBadges()`, `…(proId)` |
| [lib/services/quote-service.ts](../lib/services/quote-service.ts) | 7–8, 19, 102–113, 126–288 (~30) | `CleanerEmailData`, `cleanerId` params, `.eq('cleaner_id', …)`, `notifyCleanersInArea()` | `ProEmailData`, `proId`, `.eq('pro_id', …)`, `notifyProsInArea()` |
| [lib/services/searchService.ts](../lib/services/searchService.ts) | 7, 77, 87–89, 285–374 | exported `interface Cleaner`; `searchCleaners()`, `getCleanerById()` | `Pro`; `searchPros()`, `getProById()` |
| [lib/stripe/disputes.ts](../lib/stripe/disputes.ts) | 30–100, 336–385 (~25) | `cleanerId`, `cleanerName`, `.eq('cleaner_id', …)`, Stripe `metadata.cleaner_id` | `proId`, `proName`, `.eq('pro_id', …)`, `metadata.pro_id`* |
| [lib/stripe/dunning.ts](../lib/stripe/dunning.ts) | 23, 35, 149, 217 | `cleanerId` params; `.eq('cleaner_id', cleanerId)` | `proId`; `.eq('pro_id', …)` |
| [lib/stripe/subscription-service.ts](../lib/stripe/subscription-service.ts) | 15, 29, 44, 54, 67–101, 342–476 (~20) | `cleanerId` params; `metadata.cleaner_id`; `.eq('cleaner_id', …)` | `proId`; `metadata.pro_id`*; `.eq('pro_id', …)` |
| [lib/email/booking-confirmation.ts](../lib/email/booking-confirmation.ts) | 18, 41–72 | `cleanerEmail` + `cleaner*` params | `proEmail`, `pro*` |
| [lib/email/dispute-notification.ts](../lib/email/dispute-notification.ts) | 16, 53–62, 77, 184, 193–195 | `cleanerName`/`cleanerEmail`/`cleanerId` fields (subject-line copy = A keep) | `proName`/`proEmail`/`proId` |
| [lib/seo/json-ld.ts](../lib/seo/json-ld.ts) | 9, 113–146, 298 | `CleanerProfile`, `generateCleanerSchema()`, `generateCleanerListSchema()` | `ProProfile`, `generateProSchema()`, `generateProListSchema()` |
| [lib/seo/metadata.ts](../lib/seo/metadata.ts) | 92, 94, 135, 156, 206 | `generateCleanerMetadata()` + `cleaner:` keys | `generateProMetadata()` |
| [lib/seo/index.ts](../lib/seo/index.ts) | 10–22 | re-exports of the above SEO symbols | follow renames |
| [lib/seo/city-pages.ts](../lib/seo/city-pages.ts) | 8, 17, 66, 73, 87 | var `cleanerCount` (user-facing text says "professionals" = A keep) | `proCount` |
| [components/reviews/ReviewForm.tsx](../components/reviews/ReviewForm.tsx) | 10 | prop `cleanerName` (line 132 `aria-label="Cleaner rating"` = A) | `proName` |
| [components/messaging/StartConversationButton.tsx](../components/messaging/StartConversationButton.tsx) | (see above) | — | — |
| **app/ API & query surfaces** (per app/ pass): `app/api/admin/documents/[id]/route.ts`, `app/api/admin/reviews/[id]/route.ts`, `app/api/availability/[cleanerId]/route.ts`, `app/api/bookings/create/route.ts`, `app/api/messages/route.ts`, `app/api/customer/favorites/route.ts` | various | `.eq('cleaner_id', …)`, `.from('cleaner_documents'/'cleaner_availability'/'cleaner_blocked_dates')`, DTO `cleaner_id` fields, `SignupRole = … 'cleaner'` | `pro_id` / sibling-table rename deferred / `'pro'` |
| [app/api/cleaner/portfolio/route.ts](../app/api/cleaner/portfolio/route.ts) | 23, 37 | DTO field `cleaner_id: string`; `cleaner_id: row.pro_id` (mapping) | rename DTO field to `pro_id` — **value is correct (auth uid); naming only** |

### B.4 Test mocks / route stubs asserting cleaner endpoints & tables

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [tests/payment-flows.spec.ts](../tests/payment-flows.spec.ts) | 154–835 (many) | `page.route('**/api/cleaner/billing…')`, `'**/api/cleaner/leads/…'`, `'**/rest/v1/cleaners**'`; mock ids `test-cleaner-*` | follow API/route + table renames: `/api/pro/…`, `/rest/v1/pros`, `test-pro-*` |
| [tests/payment-utils.ts](../tests/payment-utils.ts) | 63, 82, 105, 136 | same `**/api/cleaner/*` route stubs | `**/api/pro/*` |
| [tests/lead-unlock.spec.ts](../tests/lead-unlock.spec.ts) | 99 | skip message (A) + flow assumes cleaner session | follow auth rename |
| [scripts/check-rls-and-schema.js](../scripts/check-rls-and-schema.js) | 157–158 | `.from('cleaner_directory').select('cleaner_id, …')` | `pro_directory` / `pro_id` once view+column renamed |

> *Stripe metadata keys (`metadata.cleaner_id`) are persisted on live Stripe objects. Renaming requires a dual-read rollout (accept both `cleaner_id` and `pro_id`) — do not hard-cut.

---

# GROUP C — RLS / schema-touching

> DDL, RLS policies, indexes, triggers, functions, the `user_role` enum, storage buckets. Almost entirely in `supabase/`. Numbered seed files are **legacy — superseded by the rename migration + backwards-compat view**; the rename migration itself is **correct as-is**.

### C.1 🚨 `supabase/16-portfolio-photos.sql` — stale schema CONTRADICTS production

The live `portfolio_photos.pro_id` stores `auth.uid()` (no FK to `pros`). This seed file still defines the opposite. **Do not re-run as-is; it does not describe production.**

| File | Lines | Current | Live / correct equivalent |
|------|-------|---------|----------------------------|
| [supabase/16-portfolio-photos.sql](../supabase/16-portfolio-photos.sql) | 9 | `cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL` | live column is `pro_id UUID` holding `auth.uid()`, **no FK to pros** |
| | 32, 34 | `idx_portfolio_photos_cleaner_id`, composite `(cleaner_id, display_order)` | `…_pro_id`, `(pro_id, display_order)` |
| | 42–77 | 4 RLS policies joining `cleaners c WHERE c.id = portfolio_photos.cleaner_id` | live RLS is `pro_id = auth.uid()` (direct, no join to pros) |
| | 113 | trigger `WHERE cleaner_id = NEW.cleaner_id` | `WHERE pro_id = NEW.pro_id` |
| | 2–3 | comments "FOR CLEANER GALLERIES / Allows cleaners…" | cosmetic |

### C.2 `user_role` enum & auth-coupled DDL

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [supabase/01-create-tables.sql](../supabase/01-create-tables.sql) | 16 | `CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin')` | `'pro'` — **enum value rename is a real migration**, must land atomically with the `'cleaner'` literal in B.2 |
| [supabase/03-auth-setup.sql](../supabase/03-auth-setup.sql) | 7, 116, 178, 186 | enum comment; `INSERT INTO public.cleaners (…)`; commented join `q.cleaner_id = c.id` | `pros` / `pro_id` (legacy seed) |

### C.3 Core schema seed (`supabase/01-create-tables.sql`) — legacy, superseded

| Lines | Current | Correct equivalent |
|-------|---------|--------------------|
| 51 | `CREATE TABLE … public.cleaners (` | now `pros` (view aliases) — **keep historical; superseded** |
| 118, 158, 188, 210, 232, 246 | `cleaner_id UUID … REFERENCES public.cleaners(id)` (6 FK cols across quote_requests/reviews/subscriptions/service_areas/leads/bookings) | `pro_id … REFERENCES public.pros(id)` (columns deferred by migration) |
| 171 | `cleaner_response TEXT` | `pro_response` (deferred) |
| 111, 182, 240 | constraints `unique_user_cleaner`, `unique_customer_cleaner_review`, `unique_cleaner_zip` | `unique_user_pro`, `unique_customer_pro_review`, `unique_pro_zip` |
| 269–277 | 9× `idx_cleaners_*` indexes | `idx_pros_*` |
| 281, 287, 293, 298, 302 | `idx_quotes_cleaner_id`, `idx_reviews_cleaner_id`, `idx_subscriptions_cleaner_id`, `idx_service_areas_cleaner_id`, `idx_leads_cleaner_id` | `…_pro_id` |
| 326, 338, 363, 376 | trigger/func bodies referencing `public.cleaners`; `update_cleaners_updated_at`; `generate_cleaner_slug` | `pros`; `update_pros_updated_at`; `generate_pro_slug` |

### C.4 RLS, indexes, functions, sibling tables across remaining seed files (legacy — superseded)

| File | Lines (count) | Nature | Correct equivalent |
|------|---------------|--------|--------------------|
| [supabase/02-row-level-security.sql](../supabase/02-row-level-security.sql) | 8, 41–219 (~50) | `ALTER TABLE cleaners ENABLE RLS`; 5 policies on `cleaners`; many `SELECT id FROM public.cleaners WHERE…` subqueries | migration relinks to `pros`; policies/subqueries → `pros` |
| [supabase/02-add-verification-fields.sql](../supabase/02-add-verification-fields.sql) | 1–22 (7) | `ALTER TABLE cleaners`, indexes, `UPDATE cleaners` | `pros` |
| [supabase/02-auto-approve-cleaners.sql](../supabase/02-auto-approve-cleaners.sql) / [03-auto-approve-cleaners.sql](../supabase/03-auto-approve-cleaners.sql) | (6) | `ALTER/UPDATE cleaners`, trigger | `pros` |
| [supabase/05-indexes-and-performance.sql](../supabase/05-indexes-and-performance.sql) | 12–80 (18) | `ALTER TABLE cleaners`, 9× `idx_cleaners_*`, `ANALYZE public.cleaners` | `pros` / `idx_pros_*` |
| [supabase/06-onboarding-wizard.sql](../supabase/06-onboarding-wizard.sql) | 6–163 (33) | `ALTER TABLE cleaners` ADD COLUMNs; **`cleaner_documents`** table + indexes + RLS + functions | `pros`; `cleaner_documents` rename **deferred** by migration |
| [supabase/07-admin-moderation-queue.sql](../supabase/07-admin-moderation-queue.sql) | 6–61 (~79) | **`cleaner_reviews`** table DDL + RLS + functions referencing `cleaners` | `cleaner_reviews` rename deferred; refs → `pros` |
| [supabase/08-stripe-webhooks.sql](../supabase/08-stripe-webhooks.sql) | 6–163 (20) | `ALTER TABLE cleaners` billing columns + functions | `pros` |
| [supabase/09-quote-request-system.sql](../supabase/09-quote-request-system.sql) | 6–429 (~74) | `lead_matches` DDL + functions referencing `cleaners` / `cleaner_id` | `pros` / `pro_id` |
| [supabase/10-availability-schema.sql](../supabase/10-availability-schema.sql) | 2–62 (28) | **`cleaner_availability`**, **`cleaner_blocked_dates`** tables + indexes + RLS | sibling rename **deferred**; refs → `pros` |
| [supabase/11-bookings-schema.sql](../supabase/11-bookings-schema.sql) | 11–69 (9) | FK to `cleaners(id)`, indexes, RLS | `pros` / `pro_id` |
| [supabase/12-review-responses.sql](../supabase/12-review-responses.sql) | 1–19 (9) | ADD `cleaner_response`/`cleaner_response_at` + RLS + index | `pro_response*` (deferred) |
| [supabase/13-messaging-schema.sql](../supabase/13-messaging-schema.sql) | 10–384 (23) | `conversations.cleaner_id` FK + messages + RLS + trigger | `pro_id` |
| [supabase/16-backfill-cleaner-approval-status.sql](../supabase/16-backfill-cleaner-approval-status.sql) | 2–22 (8) | `UPDATE/ALTER cleaners` | `pros` |
| [supabase/16-disputes-schema.sql](../supabase/16-disputes-schema.sql) | 3–50 (10) | `disputes` FK + RLS referencing cleaners | `pros` / `pro_id` |
| [supabase/17-lead-credits.sql](../supabase/17-lead-credits.sql) | 6–77 (13) | `ALTER TABLE cleaners` lead-credit columns + functions | `pros` |
| [supabase/19-customer-favorites.sql](../supabase/19-customer-favorites.sql) | 2–16 (4) | FK to `cleaners(id)` + index | `pros` / `pro_id` |
| [supabase/20-message-reporting.sql](../supabase/20-message-reporting.sql) | 23–24 (3) | subquery `c.cleaner_id = (SELECT id FROM public.cleaners…)` | `pro_id` / `pros` |
| [supabase/22-tighten-booking-transactions-rls.sql](../supabase/22-tighten-booking-transactions-rls.sql) | 5–24 (5) | RLS using `cleaners` subquery | `pros` |
| [supabase/23-fix-indexes.sql](../supabase/23-fix-indexes.sql) | 10–72 (16) | DROP/CREATE indexes incl. `cleaner_id` refs | `pro_id` / `idx_pros_*` |
| [supabase/complete-schema.sql](../supabase/complete-schema.sql) | (~131) | full pre-rename schema dump | reference snapshot — superseded |
| [supabase/schema.sql](../supabase/schema.sql) | (~52) | alt schema dump | reference snapshot — superseded |

### C.5 Storage bucket `cleaner-documents` — live, NOT a view alias

The backwards-compat view only covers the table. The storage bucket name is real and referenced by live runtime code; renaming it requires migrating stored objects + updating all references together.

| File | Lines | Current | Correct |
|------|-------|---------|---------|
| [app/api/pro/documents/route.ts](../app/api/pro/documents/route.ts) | 91, 99, 117 | `.storage.from('cleaner-documents')` | `pro-documents` (with object migration) |
| [app/api/admin/documents/[id]/signed-url/route.ts](../app/api/admin/documents/%5Bid%5D/signed-url/route.ts) | 43 | `.from('cleaner-documents')` | `pro-documents` |
| [components/onboarding/DocumentUploadForm.tsx](../components/onboarding/DocumentUploadForm.tsx) | 53, 76 | `.from('cleaner-documents')`; path prefix `${userId}/cleaner/${file}` | `pro-documents`; `${userId}/pro/${file}` |
| [supabase/06-onboarding-wizard.sql](../supabase/06-onboarding-wizard.sql) | 84 | commented bucket creation `'cleaner-documents'` | `pro-documents` |

### C.6 Schema-checker constants (`scripts/check-rls-and-schema.js`) — track current DB names

| Lines | Current | Note |
|-------|---------|------|
| 42 | `'cleaners'` in `REQUIRED_TABLES` | view still named `cleaners`; keep until view dropped, then `pros` |
| 24 | `'cleaner_directory'` in `REQUIRED_VIEWS` | view not renamed → `pro_directory` (deferred) |
| 28 | `'enforce_cleaner_location_complete'` trigger | not renamed (deferred) |

### C.7 The rename migration itself — **correct, keep as-is**

| File | Lines | Note |
|------|-------|------|
| [supabase/migrations/20260515152653_dld444_rename_cleaners_to_pros.sql](../supabase/migrations/20260515152653_dld444_rename_cleaners_to_pros.sql) | whole file (~61 refs) | Renames `cleaners`→`pros` + builds compat view. Dual naming is intentional. **No change.** |
| Other migrations (`phase_a1…a4`, `dld442`, `dld445`, `dld449`, `dld513`, `fair_lead_model_*`) | ~69 refs | Reference `cleaners` view / `cleaner_id` columns; work via the compat view. Track for follow-up column sweep; not live bugs. |

---

## Recommended sequencing (informational — no changes made)

1. **Fix the stale portfolio seed** (`supabase/16-portfolio-photos.sql`) to match production (`pro_id` = `auth.uid()`, no FK), or mark it obsolete — it is the one file that actively misrepresents the live schema.
2. **Column sweep migration:** rename `cleaner_id` → `pro_id` (and `cleaner_response*`) across the ~20 dependent tables; update all Group B queries/types in the same change set.
3. **`user_role` enum `'cleaner'` → `'pro'`** atomically with `AuthContext` / `protected-route` / `middleware` / `dashboard-path` / `payment-utils` (B.2).
4. **Sibling tables** (`cleaner_documents`, `cleaner_availability`, `cleaner_blocked_dates`, `cleaner_reviews`) + **`cleaner-documents` storage bucket** + **`cleaner_directory` view** + index/constraint/trigger names — cosmetic-but-real renames with object/data migration.
5. **Routes/components/SEO symbols** (`app/(api/)cleaner*`, `Cleaner*` components, `generateCleaner*`) — internal renames with redirect coverage.
6. **Stripe `metadata.cleaner_id`** — dual-read rollout, never a hard cut.
7. **Leave all "keep — consumer copy"** (A.1) as-is.
