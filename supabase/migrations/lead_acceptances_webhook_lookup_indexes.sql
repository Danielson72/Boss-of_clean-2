-- DLD-558 (AUDIT_2026-07 perf): indexes for the lead-unlock webhook lookups.
--
-- ⚠ PREPARED ONLY — DO NOT AUTO-APPLY. Schema changes require Daniel's
-- keyboard: review this file, then apply manually (Supabase SQL editor or
-- `supabase db push`).
--
-- Why: the Stripe webhook capture flip updates lead_acceptances keyed on
-- stripe_checkout_session_id, and the payments idempotency pre-check reads
-- payments by stripe_payment_intent_id. Neither column is indexed, so both
-- money-path lookups sequential-scan as the tables grow.
--
-- Partial indexes: most rows have these columns NULL until checkout starts,
-- so indexing only non-NULL values keeps the indexes small and write-cheap.

create index if not exists idx_lead_acceptances_checkout_session
  on public.lead_acceptances (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists idx_lead_acceptances_payment_intent
  on public.lead_acceptances (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists idx_payments_payment_intent
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
