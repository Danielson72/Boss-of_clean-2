# Pros exposure release plan

This change is staged because Netlify deploys the app separately from Supabase migrations. No stage has been applied to production.

## Order and compatibility

1. Apply `20260924144129_pros_exposure_1_additive.sql`. It adds a single object: an approved-only, explicit-column directory view. Existing app reads and owner writes continue to use `pros`; the existing policy and grants stay in place.
2. Deploy the app changes after the Stage 1 view is available. Public and customer reads use `pros_directory`; relationship embeds are replaced with explicit directory queries and in-code joins. Owner and admin reads remain on `pros`. The app still works while the old policy and grants exist.
3. Apply `20260924144130_pros_exposure_3_restrictive.sql` only after the deployed app is healthy. It limits `pros` SELECT to its owner and admins, removes all anonymous `pros` column access, and revokes both legacy views from the browser roles. This is the exposure-closing stage.

`cleaner_directory` had a production `PUBLIC SELECT` grant in addition to grants for `anon` and `authenticated`. Stage 3 revokes `PUBLIC` too; otherwise anonymous users would still inherit access. The diagnostic script is repointed to `pros_directory`, and no active application reader of either legacy view remains.

## Deliberately out of scope

**No contact function.** An earlier draft added `pro_contact_for_customer`. It has been removed. Nothing in the application called it, and customer access to a pro's phone and email already runs through `getAcceptedQuoteProContacts` in `app/dashboard/customer/actions.ts`, a service-role path that gates on a captured acceptance. Adding a second, parallel gate would mean two places to keep correct. `supabase/tests/pros_exposure_test.sql` asserts the function does not exist, so it cannot reappear unnoticed.

**No pro home ZIP in the directory.** The view exposes `city` and `state` but not `zip_code`. No public page renders a pro's home ZIP. It was only used as a text-match fallback in `app/search/page.tsx`, and that file now matches on city alone. Location search still works through `service_areas`, which is checked first and is the field a pro actually controls. The effect is that a pro whose home ZIP is not among their listed service areas no longer matches a bare-ZIP search, which is both a privacy improvement and a more accurate result.

## Rollback

If Stage 3 causes a regression, run this exact SQL first:

```sql
BEGIN;
DROP POLICY "pros_select" ON public.pros;
CREATE POLICY "pros_select" ON public.pros FOR SELECT TO public
  USING (
    public.is_admin()
    OR ((SELECT auth.uid()) = user_id)
    OR approval_status = 'approved'::public.approval_status
  );
GRANT SELECT (
  id, user_id, business_name, business_slug, business_description,
  services, service_areas, hourly_rate, minimum_hours, years_experience,
  employees_count, average_rating, total_reviews, total_jobs,
  response_time_hours, instant_booking, subscription_tier,
  profile_image_url, business_hours, created_at, updated_at, approval_status
) ON public.pros TO anon;
GRANT ALL ON public.cleaners TO authenticated;
GRANT ALL ON public.cleaner_directory TO anon, authenticated;
GRANT SELECT ON public.cleaner_directory TO PUBLIC;
COMMIT;
```

Rollback of the app is safe while Stage 1 remains and Stage 3 has been undone. After the prior app is deployed, remove Stage 1 with:

```sql
BEGIN;
DROP VIEW public.pros_directory;
COMMIT;
```

Do not remove Stage 1 before rolling back the app, because the new app queries `pros_directory`. No rollback SQL is needed for Stage 2: redeploy the previous app build.

## Evidence and release gate

The combined Stage 1 + Stage 3 SQL and every case in `supabase/tests/pros_exposure_test.sql` were executed against production on 2026-09-24. Each block ran in its own transaction and ended in `ROLLBACK`. The roles covered were anonymous, customer, other pro, owner pro, and admin, plus a schema block asserting the absent contact function and the absent `zip_code` column. This was a rollback-only proof, not a migration application.

The exact Stage 3 and Stage 1 rollback statements above were also exercised after both migrations inside a separate production transaction, and that transaction was rolled back. A final read-only check found the new view and function absent and the original policy and grants still present.

Before Stage 3, check production app health and the key journeys: anonymous search/city/profile, customer quote list and review, customer booking list, messages, owner pro dashboard, and admin review/payment screens. See `pros_exposure_embed_audit.md` for every relationship/direct-pro hit and its disposition.

## Booking gate finding

`app/api/bookings/create/route.ts:130-150` lets an authenticated customer insert a booking with `status: 'confirmed'` without a payment or pro action. `app/api/cleaner/bookings/[id]/route.ts:50-58` merely acknowledges that already-confirmed booking. Consequently the contact function has no booking branch. The existing direct-booking workflow remains a separate business-logic issue: it can notify a pro before a paid lead unlock, so it should be addressed in a separate change before claiming that all pro/customer introductions are monetized.
