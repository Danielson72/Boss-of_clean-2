-- Normalize existing phone values to E.164 (+1XXXXXXXXXX).
--
-- DRAFT — NOT APPLIED. Reviewed and applied by Daniel/Claude by hand.
--
-- Context: the app now stores phones in E.164 via libphonenumber-js (lib/phone.ts).
-- These legacy rows predate that and are stored free-form, so the SMS layer
-- (lib/sms/twilio.ts, which requires ^\+1[2-9]\d{9}$) currently can't text them.
--
-- This is a BEST-EFFORT pure-SQL normalization (no libphonenumber here): it strips
-- non-digits and maps 10-digit → +1XXXXXXXXXX and 11-digit-leading-1 → +1XXXXXXXXXX.
-- Anything that doesn't resolve to a valid 10/11-digit US number is LEFT UNCHANGED
-- for manual review. Spot-check the output against the preview in the PR before/after
-- applying — with only a handful of rows this is eyeball-able.

-- Helper: best-effort US → E.164. Dropped at the end so it doesn't linger.
CREATE OR REPLACE FUNCTION _e164_us(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $func$
  SELECT CASE
    WHEN raw IS NULL THEN NULL
    WHEN length(regexp_replace(raw, '\D', '', 'g')) = 10
      THEN '+1' || regexp_replace(raw, '\D', '', 'g')
    WHEN length(regexp_replace(raw, '\D', '', 'g')) = 11
         AND left(regexp_replace(raw, '\D', '', 'g'), 1) = '1'
      THEN '+' || regexp_replace(raw, '\D', '', 'g')
    ELSE raw  -- unrecognized format: leave untouched for manual review
  END
$func$;

-- 1. users.phone
UPDATE public.users
SET phone = _e164_us(phone)
WHERE phone IS NOT NULL
  AND _e164_us(phone) IS DISTINCT FROM phone;

-- 2. pros: normalize business_phone AND sms_consent_phone in the SAME statement.
--    CRITICAL: if business_phone is reformatted but sms_consent_phone is not, the
--    #89 send gate (which compares the two) would silently invalidate consent.
--    Normalizing both identically keeps consent bound to the number.
UPDATE public.pros
SET business_phone    = _e164_us(business_phone),
    sms_consent_phone = _e164_us(sms_consent_phone)
WHERE (business_phone IS NOT NULL AND _e164_us(business_phone) IS DISTINCT FROM business_phone)
   OR (sms_consent_phone IS NOT NULL AND _e164_us(sms_consent_phone) IS DISTINCT FROM sms_consent_phone);

-- 3. sms_opt_outs.phone (the ledger key). Twilio delivers E.164 already, so new
--    rows are fine; this covers any pre-existing/backfilled keys.
UPDATE public.sms_opt_outs
SET phone = _e164_us(phone)
WHERE phone IS NOT NULL
  AND _e164_us(phone) IS DISTINCT FROM phone;

DROP FUNCTION _e164_us(text);
