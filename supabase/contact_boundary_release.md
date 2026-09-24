# Contact boundary release notes

Apply in this order only: additive migration, app release, restrictive migration.
Each step below is independently compatible with the previous production state.

1. **Additive migration + old app:** Existing table policies remain. Old browser
   reads and the service-role lead broadcast continue. The replacement pro view
   keeps its old columns and appends `updated_at`; its explicit row predicate
   covers approved marketplace previews and assigned quotes. Anonymous access
   to that pro-only view is revoked.
2. **Additive migration + new app:** Pro reads for response, unlock, sidebar,
   billing counts and response metrics use the view. Server-side response writes
   recheck the pending/unclaimed or directly assigned state and resolve recipient contact only after
   a successful scoped update. Message and booking customer names are resolved
   server-side after ownership checks; unpaid responses contain first name only.
3. **Restrictive migration + new app:** The base quote table becomes visible to
   its customer, an admin, or a pro with a captured payment. A customer's user
   row becomes visible to a pro only after capture. Preview, response and
   payment eligibility continue through the safe view and scoped server action.

The anonymous `pros` column allowlist is traceable to current page reads:

| Columns | Source |
| --- | --- |
| `id`, `business_name`, `business_description`, `profile_image_url`, `hourly_rate`, `minimum_hours`, `average_rating`, `total_reviews`, `services`, `instant_booking` | `app/book/[cleanerId]/page.tsx:113` |
| `business_slug`, `service_areas`, `total_jobs`, `years_experience`, `subscription_tier` | `app/professionals/page.tsx:87-96` |
| `user_id`, `employees_count`, `response_time_hours`, `created_at` | `app/cleaner/[slug]/page.tsx:68-87` |
| `business_hours` | `app/search/page.tsx:108,160-173` |
| `updated_at` | `app/sitemap.ts:48` |
| `approval_status` | filter at `app/professionals/page.tsx:97` and the other public listings |

`app/[city]/page.tsx:68-72,110-131`, `app/search/page.tsx:104-111`, and
`app/services/[serviceType]/ServicePageClient.tsx:77-90` use only these columns.
The public pages no longer query or render document-status fields. Authenticated
pro-to-pro directory visibility and customer-entered free text are separate
follow-up work, outside this migration pair.

## Production rollback proof (2026-09-24)

Both migrations were executed against production inside each test case's own
transaction. Every case switched to one simulated role, asserted counts only,
and ended in `ROLLBACK`. All eleven cases in
`supabase/tests/contact_boundary_test.sql` pass.

| Case | Assertion | Result |
| --- | --- | --- |
| 1, 2, 9 | Anonymous holds no privilege on the pro view, the private `pros` columns, or the `cleaners` view; the view carries no `customer_id` or address column and does carry `updated_at` | Pass |
| 3 | A customer reads their own user row | Pass |
| 4, 5 | An unpaid approved pro reads 0 unrelated customer rows and 0 base quote rows | Pass |
| 6 | An approved pro still reads the pending marketplace preview | Pass |
| 7 | A pro with a captured lead reads that quote and its customer | Pass |
| 8 | A pro cannot preview another pro's assigned quote | Pass |
| 10 | Claim-then-read: after setting `cleaner_id` and `status='responded'` on a quote it never paid for, the pro reads 0 base rows and 0 customer rows, while the safe preview still returns that lead | Pass |
| 11 | Paid pro isolation: reads 2 of 9 customer rows, exactly those behind its captured leads | Pass, quote half skipped |

Case 11's second assertion, that a paid pro cannot read a lead captured by a
different pro, has no fixture in production because only one pro currently holds
captured acceptances. It raises a `NOTICE` and skips rather than failing, and
will begin asserting as soon as a second pro pays.

Post-proof inspection: all three helper functions absent, both original policies
byte-identical, the pro view still `security_invoker=true`, the original
anonymous grants intact, and the responded-quote count unchanged at 2, which
confirms the case 10 claim was rolled back. No migration has been applied.

## Exact rollback: migration 2 (run first)

```sql
BEGIN;
DROP POLICY "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO public
  USING (
    is_admin()
    OR ((SELECT auth.uid()) = id)
    OR (is_cleaner() AND role = 'customer'::user_role)
  );

DROP POLICY "quote_requests_select" ON public.quote_requests;
CREATE POLICY "quote_requests_select" ON public.quote_requests FOR SELECT TO public
  USING (
    (EXISTS (SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid()) AND users.role = 'admin'::user_role))
    OR (customer_id = (SELECT auth.uid()))
    OR (cleaner_id IN (SELECT pros.id FROM public.pros
      WHERE pros.user_id = (SELECT auth.uid())))
    OR (cleaner_id IS NULL AND status = 'pending'::quote_status
      AND EXISTS (SELECT 1 FROM public.pros
        WHERE pros.user_id = (SELECT auth.uid())
          AND pros.approval_status = 'approved'::approval_status))
  );

REVOKE SELECT (
  id, user_id, business_name, business_slug, business_description,
  services, service_areas, hourly_rate, minimum_hours, years_experience,
  employees_count, average_rating, total_reviews, total_jobs,
  response_time_hours, instant_booking, subscription_tier,
  profile_image_url, business_hours,
  created_at, updated_at, approval_status
) ON public.pros FROM anon;
GRANT SELECT, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.pros TO anon;
GRANT ALL ON public.cleaners TO anon;
COMMIT;
```

These grants restore the production ACL captured before the draft: `pros`
anonymous table ACL `rdDxtm`, and `cleaners` anonymous ACL `arwdDxtm`.

## Exact rollback: migration 1 (after migration 2)

```sql
BEGIN;
DROP VIEW public.quote_requests_pro_view;
CREATE VIEW public.quote_requests_pro_view
  WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  qr.id, qr.service_type, qr.is_commercial, qr.service_date,
  qr.service_time, qr.duration_hours, qr.city, qr.zip_code,
  qr.description, qr.special_requests, qr.property_type,
  qr.property_size, qr.frequency, qr.status, qr.cleaner_id,
  qr.quoted_price, qr.response_message, qr.responded_at, qr.created_at,
  NULLIF(split_part(trim(u.full_name), ' ', 1), '') AS customer_first_name
FROM public.quote_requests qr
LEFT JOIN public.users u ON u.id = qr.customer_id;
COMMENT ON VIEW public.quote_requests_pro_view IS
  'PII-safe pro-facing view of quote_requests (DLD-513/A5). Exposes only pre-acceptance-safe columns + customer first name. Excludes address, customer_id, TCPA IP/UA. security_invoker=true so the querying pro''s RLS on quote_requests still applies.';
GRANT ALL ON public.quote_requests_pro_view TO anon, authenticated, service_role;
DROP FUNCTION public.pro_has_captured_customer(uuid);
DROP FUNCTION public.pro_has_captured_quote(uuid);
DROP FUNCTION public.current_pro_id();
COMMIT;
```

Roll the app back to its prior version between migration 2 rollback and
migration 1 rollback, since the new response-time code reads `updated_at` from
the view.
