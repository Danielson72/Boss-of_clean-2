# RLS Traffic-Prep Analysis — 2026-07-10

Source: Supabase performance advisor (live run) + full `pg_policies` pull.
Advisor totals: **297 multiple_permissive_policies**, **10 auth_rls_initplan**,
**3 unindexed_foreign_keys**, **3 duplicate_index** (also 84 `unused_index` and
1 `auth_db_connections_absolute` — both explicitly out of scope here).

**Nothing in this branch has been applied.** Three draft migrations:

| File | Scope |
|---|---|
| `20260710170000_perf_fk_indexes_and_dup_indexes.sql` | A: 3 FK indexes + drop 3 duplicate indexes |
| `20260710170100_perf_initplan_fixes.sql` | B: wrap `auth.*()` in `(SELECT …)` in the 10 flagged policies |
| `20260710170200_perf_policy_consolidation_top5.sql` | C: consolidate permissive policies on users, pros, quote_requests, conversations, messages, payments |

## A — Indexes

FK covers: `notification_logs(quote_request_id)`, `pro_licenses(verified_by)`,
`service_categories(alias_for)`. Duplicates dropped (keeping the `idx_*` twin):
`pii_filter_log_conversation_idx`, `pii_filter_log_created_idx`,
`pii_filter_log_sender_idx`. Plain `CREATE INDEX` (not CONCURRENTLY — cannot run
in a migration transaction; fine at pre-launch row counts, noted in the file).

## B — initplan offenders (10)

| Table | Policy | Wrapped call |
|---|---|---|
| rate_limits | Service role manage rate_limits | auth.jwt() |
| notifications | Service role can insert notifications | auth.role() |
| booking_photos | Cleaners can manage own booking photos | auth.uid() |
| booking_photos | Customers can view their booking photos | auth.uid() |
| bookings | Service role full access to bookings | auth.role() |
| cleaner_blocked_dates | Service role full access to cleaner_blocked_dates | auth.role() |
| pii_filter_log | Admins can read pii_filter_log | auth.uid() |
| admin_actions | Admins can manage admin_actions | auth.uid() |
| service_categories | service_categories: admin reads all | auth.uid() |
| service_categories | service_categories: admin writes | auth.uid() |

All rewrites are `ALTER POLICY` (roles/commands untouched); expressions are the
live quals verbatim with only the `auth.*()` call sites wrapped. None of these
policies are on `public.users`.

## C — Consolidation soundness argument

Postgres permissive policies are an OR-set: a row passes USING if **any**
applicable permissive policy's USING passes, and a new row passes WITH CHECK if
**any** applicable permissive policy's effective WITH CHECK passes — the two are
evaluated independently across the set (a policy with null WITH CHECK
contributes its USING). Therefore one merged policy per (role, command) with
OR'd USINGs and OR'd effective WITH CHECKs is **exactly** equivalent. No pair
required a judgment call; nothing was flagged unmergeable.

Role note: admin ALL policies declared `TO authenticated` (pros, conversations)
merge into `TO public` per-command policies via an `is_admin()` disjunct —
equivalent because `is_admin()` is false for anon sessions.

### Before → after, per table (semantics checklist)

**users** (service_role ALL policy kept as-is)
| Cmd | Before (who) | After (who) |
|---|---|---|
| SELECT | admin (users_admin_all) ∪ self (users_select_own) ∪ self-or-cleaner-views-customers (users_cleaners_view_location) | identical set: admin ∪ self ∪ (cleaner ∧ row.role='customer') — `users_select` |
| INSERT | admin ∪ self | identical — `users_insert` |
| UPDATE | admin ∪ self (check: admin ∪ self) | identical — `users_update` |
| DELETE | admin only (via ALL) | identical — `users_delete_admin` |

users hard rule respected: no policy on users references users; `is_admin()` /
`is_cleaner()` are SECURITY DEFINER helpers already used on this table today.

**pros**
| Cmd | Before | After |
|---|---|---|
| SELECT | admin ∪ owner ∪ anyone-if-approved | identical — `pros_select` |
| INSERT | admin ∪ owner | identical — `pros_insert` |
| UPDATE | admin ∪ owner (checks same) | identical — `pros_update` |
| DELETE | admin only | identical — `pros_delete_admin` |

**quote_requests** (service_role ALL policy kept as-is)
| Cmd | Before | After |
|---|---|---|
| SELECT | admin ∪ customer-own ∪ pro-assigned ∪ approved-pro-marketplace(pending, unclaimed) | identical — `quote_requests_select` |
| INSERT | admin ∪ customer-own | identical — `quote_requests_insert` |
| UPDATE | USING: admin ∪ customer-own-pending ∪ pro-assigned ∪ approved-pro-marketplace; CHECK: admin ∪ customer-own-pending ∪ cleaner_id-in-own-pros (marketplace claim) | identical — the marketplace claim check equals the pro-assigned qual, so the merged CHECK's three disjuncts cover the original four policies' effective checks exactly |
| DELETE | admin only | identical |

**conversations**
| Cmd | Before | After |
|---|---|---|
| SELECT | admin ∪ customer-participant ∪ cleaner-participant | identical |
| INSERT | admin ∪ customer-self (uid not null ∧ customer_id=uid) | identical |
| UPDATE | admin (check admin) ∪ participants (check = qual) | identical |
| DELETE | admin only | identical |

**messages** (no DELETE policy existed before — none created; admins still have
NO insert/update on messages, only SELECT of reported ones — not widened)
| Cmd | Before | After |
|---|---|---|
| SELECT | admin-of-reported ∪ customer-participant ∪ cleaner-participant | identical |
| INSERT | customer-sender-in-own-convo ∪ cleaner-sender-in-own-convo | identical |
| UPDATE | USING: participants-report ∪ recipient-mark-read; CHECK: reported_by=uid ∪ recipient-mark-read-qual (null check → qual) | identical |

**payments**
| Cmd | Before | After |
|---|---|---|
| SELECT | admin ∪ own-cleaner | identical |
| INSERT | admin (ALL, null check → qual) ∪ own-cleaner | identical |
| UPDATE | admin ∪ own-cleaner (checks same) | identical |
| DELETE | admin only | identical |

## Follow-up ticket scope (not in this branch)
- ~30 remaining tables with multiple_permissive_policies (297 warnings total;
  this branch clears the 6 highest-traffic tables).
- 84 unused_index findings — review after launch traffic, not before.
- auth_db_connections_absolute — pooler sizing, ops decision.
