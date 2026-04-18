-- DLD-245: TCPA 2025 one-to-one consent audit columns
-- Stores consent timestamp, IP, and user agent for legal compliance.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tcpa_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tcpa_consent_ip TEXT,
  ADD COLUMN IF NOT EXISTS tcpa_consent_ua TEXT;

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS tcpa_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tcpa_consent_ip TEXT,
  ADD COLUMN IF NOT EXISTS tcpa_consent_ua TEXT;
