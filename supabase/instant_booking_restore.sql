-- Restore instant_booking for the three pros that had it enabled before
-- 2026-09-24.
--
-- Context
-- -------
-- On 2026-09-24 instant_booking was set to false for every pro that had it
-- enabled. The reason: app/api/bookings/create/route.ts is the only booking
-- path with no payment wall. Its sibling, app/api/quotes/[id]/accept/route.ts,
-- withholds the street address and scrubs the customer's notes until the pro
-- holds a captured lead_acceptance (see that file, lines 140-155). The instant
-- route writes the full address and raw notes, and emails both to the pro,
-- gated only by the instant_booking flag at line 90.
--
-- An audit the same day found the instant path had never been used: all 11
-- production bookings carry the accept-path signature (bedrooms = 0,
-- bathrooms = 0) and not one stored address contains a digit. So this disable
-- closed an unused hole rather than removing a working feature.
--
-- State captured immediately before the disable:
--   0d0674b4-43e8-4c19-ac21-f063d56a122f  approved   instant_booking = true   0 bookings
--   a59ffec9-d57b-4d2b-b186-9dc2c1665386  suspended  instant_booking = true   0 bookings
--   cf941b2f-00f0-47dd-a21e-243d25335a17  approved   instant_booking = true  11 bookings
--
-- Every other pro was already false or null and is deliberately untouched, so
-- this restore is exact even if the flag is toggled for someone else later.
--
-- Do not run this until app/api/bookings/create/route.ts applies the same
-- payment wall as the accept route. Restoring the flag first reopens the path
-- that sends a customer's street address and notes to an unpaid pro.

BEGIN;
UPDATE public.pros SET instant_booking = true, updated_at = now()
WHERE id IN (
  '0d0674b4-43e8-4c19-ac21-f063d56a122f',
  'a59ffec9-d57b-4d2b-b186-9dc2c1665386',
  'cf941b2f-00f0-47dd-a21e-243d25335a17'
);
-- expect UPDATE 3
COMMIT;
