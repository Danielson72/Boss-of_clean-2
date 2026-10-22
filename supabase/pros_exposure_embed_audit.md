# Exhaustive pro relationship and base-table audit

Search scope: all runtime `app/`, `components/`, `lib/`, and `scripts/` TypeScript/JavaScript sources. Patterns: `pros!`, `pros(`, `cleaner:pros`, `pro:pros`, `pros (`, and direct `.from('pros'|'cleaners'|'cleaner_directory')`. Documentation, historical migrations, and task examples were excluded from runtime disposition. A broader repository grep was also reviewed; no additional runtime reader was found.

Current runtime query matches dispositioned: **138**. No active customer/public `pros` embed or legacy-view reader remains.

| File:line | Client | Runtime role | Disposition |
|---|---|---|---|
| `scripts/purge-test-data.ts:60` | service-role | server/script | service-role already |
| `scripts/purge-test-data.ts:115` | service-role | server/script | service-role already |
| `lib/actions/pro-signup.ts:42` | user-scoped | authenticated owner | owner-safe |
| `lib/actions/pro-signup.ts:54` | user-scoped | authenticated owner | owner-safe |
| `lib/stripe/dunning.ts:44` | service-role | server | service-role already |
| `lib/stripe/dunning.ts:81` | service-role | server | service-role already |
| `lib/stripe/dunning.ts:162` | service-role | server | service-role already |
| `lib/stripe/dunning.ts:199` | service-role | server | service-role already |
| `lib/stripe/dunning.ts:235` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:169` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:195` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:279` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:334` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:362` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:505` | service-role | server | service-role already |
| `lib/stripe/subscription-service.ts:611` | service-role | server | service-role already |
| `lib/actions/tcpa.ts:54` | service-role | server/script | service-role already |
| `lib/actions/tcpa.ts:60` | service-role | server/script | service-role already |
| `lib/actions/tcpa.ts:97` | service-role | server/script | service-role already |
| `lib/auth/auth-service.ts:143` | user-scoped | authenticated owner | owner-safe |
| `lib/stripe/disputes.ts:75` | service-role | server | service-role already |
| `lib/stripe/disputes.ts:104` | service-role | server | service-role already |
| `lib/stripe/disputes.ts:150` | service-role | server | service-role already |
| `lib/stripe/disputes.ts:227` | service-role | server | service-role already |
| `lib/stripe/disputes.ts:236` | service-role | server | service-role already |
| `lib/services/searchService.ts:99` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/searchService.ts:134` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/searchService.ts:287` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/searchService.ts:313` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/searchService.ts:351` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/searchService.ts:376` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/admin-payments.ts:70` | user-scoped | admin | admin-only embed |
| `lib/services/admin-payments.ts:87` | user-scoped | admin | admin-only embed |
| `lib/sms/consent.ts:24` | service-role | server/script | service-role already |
| `lib/services/admin-analytics.ts:91` | user-scoped | admin | admin-only |
| `lib/services/admin-analytics.ts:110` | user-scoped | admin | admin-only |
| `lib/services/admin-analytics.ts:129` | user-scoped | admin | admin-only |
| `lib/services/admin-analytics.ts:134` | user-scoped | admin | admin-only |
| `lib/services/admin-analytics.ts:140` | user-scoped | admin | admin-only |
| `lib/services/admin-analytics.ts:148` | user-scoped | admin | admin-only |
| `lib/hooks/useProSidebarCounts.ts:76` | user-scoped | authenticated owner | owner-safe |
| `lib/hooks/usePendingDocumentActions.ts:45` | user-scoped | authenticated owner | owner-safe |
| `lib/services/badges.ts:182` | supplied user client | pro | owner-scoped write |
| `lib/services/search.ts:191` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `components/onboarding/DocumentUploadForm.tsx:55` | user-scoped | authenticated owner | owner-safe |
| `lib/services/quote-service.ts:113` | browser/user-scoped helper | none (no import/call sites) | dead code embed |
| `lib/services/quote-service.ts:187` | browser/user-scoped helper | none (no import/call sites) | dead code embed |
| `lib/services/quote-service.ts:213` | browser/user-scoped helper | none (no import/call sites) | dead code embed |
| `lib/services/quote-service.ts:314` | browser/user-scoped helper | none (no import/call sites) | dead code |
| `lib/services/quote-service.ts:364` | browser/user-scoped helper | none (no import/call sites) | dead code embed |
| `app/api/stripe/checkout/route.ts:45` | user-scoped | authenticated owner | owner-safe |
| `app/api/stripe/portal/route.ts:34` | user-scoped | authenticated owner | owner-safe |
| `app/api/webhooks/stripe/route.ts:203` | service-role | server | service-role already |
| `app/api/quotes/[id]/accept/route.ts:244` | service-role | server | service-role already; notification-only |
| `app/auth/callback/route.ts:162` | user-scoped | authenticated owner | owner-safe |
| `app/auth/select-role/page.tsx:75` | user-scoped | authenticated owner | owner-safe |
| `app/api/bookings/create/route.ts:171` | service-role | server | service-role already; notification-only |
| `app/api/cleaner/reviews/respond/route.ts:27` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/route.ts:25` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/route.ts:142` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/route.ts:183` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/route.ts:210` | user-scoped | authenticated owner | owner-safe |
| `app/api/pro/documents/route.ts:19` | user-scoped | authenticated owner | owner-safe |
| `app/api/pro/documents/route.ts:50` | user-scoped | authenticated owner | owner-safe |
| `app/quote-request/submit-core.ts:179` | service-role | server | service-role already |
| `app/quote-request/submit-core.ts:195` | service-role | server | service-role already |
| `app/api/bookings/[id]/photos/route.ts:27` | user-scoped | authenticated owner | owner-safe |
| `app/api/pros/categories/route.ts:24` | user-scoped | authenticated owner | owner-safe |
| `app/api/pros/categories/route.ts:70` | user-scoped | authenticated owner | owner-safe |
| `app/api/pros/categories/route.ts:92` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/submit/route.ts:19` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/onboarding/submit/route.ts:129` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/customer/reviews/new/page.tsx:78` | user-scoped | authenticated owner | owner-safe |
| `app/api/pro/licenses/route.ts:33` | user-scoped | authenticated owner | owner-safe |
| `app/api/pro/licenses/route.ts:78` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/documents/route.ts:19` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/documents/route.ts:59` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaners/documents/route.ts:130` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/billing/route.ts:29` | user-scoped | authenticated owner | owner-safe |
| `app/api/admin/reviews/pending/route.ts:46` | user-scoped | admin | admin-only embed |
| `app/dashboard/admin/page.tsx:55` | user-scoped | admin | admin-only |
| `app/dashboard/admin/page.tsx:91` | user-scoped | admin | admin-only |
| `app/dashboard/admin/page.tsx:92` | user-scoped | admin | admin-only |
| `app/dashboard/admin/page.tsx:93` | user-scoped | admin | admin-only |
| `app/api/leads/[quoteId]/unlock/route.ts:31` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/billing/invoices/route.ts:28` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/route.ts:45` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/route.ts:125` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/route.ts:207` | service-role | server | service-role already; notification-only |
| `app/api/messages/route.ts:269` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/route.ts:289` | service-role | server | service-role already; notification-only |
| `app/api/messages/route.ts:427` | service-role | server | service-role already; notification-only |
| `app/api/messages/[conversationId]/route.ts:60` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/[conversationId]/route.ts:157` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/billing/reactivate/route.ts:28` | user-scoped | authenticated owner | owner-safe |
| `app/api/admin/reviews/[id]/route.ts:99` | user-scoped | admin | admin-only embed |
| `app/api/cleaner/billing/upgrade/route.ts:40` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/billing/upgrade/route.ts:91` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/billing/upgrade/route.ts:130` | user-scoped | authenticated owner | owner-safe |
| `app/api/messages/report/route.ts:72` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/bookings/[id]/route.ts:29` | user-scoped | authenticated owner | owner-safe |
| `app/api/admin/reviews/route.ts:58` | user-scoped | admin | admin-only embed |
| `app/api/cleaner/billing/cancel/route.ts:27` | user-scoped | authenticated owner | owner-safe |
| `app/api/admin/licenses/route.ts:52` | user-scoped | admin | admin-only embed |
| `app/api/cleaner/bookings/route.ts:20` | user-scoped | authenticated owner | owner-safe |
| `app/api/admin/documents/[id]/route.ts:97` | user-scoped | admin | admin-only |
| `app/api/admin/documents/[id]/route.ts:134` | user-scoped | admin | admin-only |
| `app/api/admin/documents/[id]/route.ts:139` | user-scoped | admin | admin-only |
| `app/api/cleaner/portfolio/upload/route.ts:27` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/portfolio/route.ts:63` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/portfolio/route.ts:112` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/portfolio/route.ts:200` | user-scoped | authenticated owner | owner-safe |
| `app/api/cleaner/portfolio/route.ts:290` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/admin/users/[id]/page.tsx:117` | user-scoped | admin | admin-only |
| `app/dashboard/admin/actions.ts:43` | user-scoped | admin | admin-only |
| `app/dashboard/admin/actions.ts:317` | user-scoped | admin | admin-only |
| `app/dashboard/customer/actions.ts:91` | service-role | customer action | service-role already; exact captured quote gate |
| `app/dashboard/pro/reviews/page.tsx:50` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/earnings/page.tsx:50` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/service-areas/page.tsx:52` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/service-areas/page.tsx:126` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/customers/actions.ts:44` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/availability/page.tsx:64` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/availability/page.tsx:117` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/bookings/actions.ts:33` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/quote-requests/actions.ts:54` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/quote-requests/actions.ts:158` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/profile/page.tsx:76` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/profile/page.tsx:119` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/profile/page.tsx:191` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/profile/page.tsx:212` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/profile/page.tsx:311` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/portfolio/page.tsx:41` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/payments/actions.ts:42` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/setup/page.tsx:140` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/leads/actions.ts:54` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/page.tsx:105` | user-scoped | authenticated owner | owner-safe |
| `app/dashboard/pro/page.tsx:133` | user-scoped | authenticated owner | owner-safe |

## Repointed public and customer queries

Every row below is a current explicit `pros_directory` lookup. For former embeds, the primary query now fetches IDs, then a second directory query is stitched in code. The approved-only view also replaces the old public eligibility filter.

| File:line | Client | Role | Disposition |
|---|---|---|---|
| `scripts/check-rls-and-schema.js:157` | script | diagnostic | repointed to safe directory / explicit second query |
| `app/services/[serviceType]/ServicePageClient.tsx:74` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/cleaner/[slug]/page.tsx:92` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/cleaner/[slug]/page.tsx:99` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/api/customer/favorites/route.ts:35` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/customer/favorites/route.ts:80` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/quotes/[id]/accept/route.ts:57` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/review/[bookingId]/page.tsx:77` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/bookings/create/route.ts:82` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/search/page.tsx:101` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/sitemap.ts:47` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/api/bookings/[id]/route.ts:32` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/[city]/page.tsx:69` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/[city]/page.tsx:110` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/professionals/page.tsx:85` | anon/user-scoped | public | repointed to safe directory / explicit second query |
| `app/dashboard/customer/reviews/new/page.tsx:56` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/messages/[conversationId]/route.ts:72` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/messages/route.ts:84` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/messages/route.ts:194` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/api/messages/route.ts:282` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/dashboard/customer/page.tsx:84` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/dashboard/customer/bookings/page.tsx:79` | user-scoped | customer | repointed to safe directory / explicit second query |
| `app/book/[cleanerId]/page.tsx:111` | anon/user-scoped | public | repointed to safe directory / explicit second query |

## Scope decisions

- Owner pro paths remain on `pros` with user-scoped RLS; Stage 3 preserves authenticated table privilege for the owner row.
- Admin paths remain on `pros`; the new policy permits admin reads. Admin review routes check the role explicitly. The admin payment helper is called from the admin dashboard; its query remains user-scoped under the database policy.
- Service-role reads are server-side payment, notification, and maintenance work. No raw private pro row is returned by the new directory queries.
- Legacy search and quote service files have no import/call sites in runtime. Their direct `pros` reads and embeds are dead code; they are explicitly recorded above, not silently omitted.
- The only legacy-view reader was `scripts/check-rls-and-schema.js`; it was repointed to `pros_directory`. No runtime `.from('cleaners')` or `.from('cleaner_directory')` remains.
- The administrative `pros (` embed in the licenses route and admin review/payment embeds remain intentionally admin-only.
