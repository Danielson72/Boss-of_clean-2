-- Pro SMS consent (TCPA / Florida FTSA) audit trail + global opt-out ledger.
--
-- DRAFT — NOT APPLIED. Reviewed and applied by Daniel/Claude by hand.
--
-- Mirrors the existing customer consent columns (users.tcpa_consent_* from
-- 20260418_dld245_tcpa_consent_columns.sql) for the pro side. Automated Twilio
-- lead/message alerts are sent to pros.business_phone — a number entered during
-- onboarding/profile edit that today has no consent record. This adds the
-- audit columns so a pro's affirmative opt-in is captured, and a phone-keyed
-- opt-out ledger so inbound STOP is honored.

-- 1. Pro SMS consent audit trail.
--    Mirrors users.tcpa_consent_at/ip/ua, plus the exact disclosure text shown
--    and the phone number consented to. Consent is bound to that number: if
--    business_phone later changes, the send gate sees the mismatch and stops
--    texting until the pro re-consents.
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS sms_consent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent_ip    TEXT,
  ADD COLUMN IF NOT EXISTS sms_consent_ua    TEXT,
  ADD COLUMN IF NOT EXISTS sms_consent_text  TEXT,
  ADD COLUMN IF NOT EXISTS sms_consent_phone TEXT;

COMMENT ON COLUMN public.pros.sms_consent_at IS
  'When the pro affirmatively opted in to automated SMS to business_phone (TCPA/FTSA). NULL = no consent = no texts.';
COMMENT ON COLUMN public.pros.sms_consent_phone IS
  'The business_phone value the pro consented to. If business_phone changes this no longer matches and sends stop until re-consent.';

-- 2. Global, phone-keyed opt-out ledger. Presence of a row suppresses all
--    outbound SMS to that number (honored for pros and customers alike).
CREATE TABLE IF NOT EXISTS public.sms_opt_outs (
  phone        TEXT PRIMARY KEY,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source       TEXT NOT NULL DEFAULT 'sms_stop',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sms_opt_outs IS
  'Recipients who replied STOP (or were opted out). Phone stored in E.164. Presence = suppress all outbound SMS to this number.';

-- 3. RLS: deny-by-default. No policies are granted, so anon/authenticated
--    clients cannot read or write. Server code accesses this via the service
--    role, which bypasses RLS.
ALTER TABLE public.sms_opt_outs ENABLE ROW LEVEL SECURITY;
