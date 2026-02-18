-- ============================================================
-- Security Hardening: Fix mutable search_path on 6 functions
-- Resolves all "function_search_path_mutable" advisor warnings
-- Applied: 2026-02-18 via Supabase MCP
-- ============================================================

ALTER FUNCTION public.is_webhook_processed(p_event_id character varying)
SET search_path = public;

ALTER FUNCTION public.mark_webhook_processed(p_event_id character varying)
SET search_path = public;

ALTER FUNCTION public.record_webhook_event(
  p_event_id character varying,
  p_event_type character varying,
  p_payload jsonb,
  p_customer_id text,
  p_subscription_id text,
  p_invoice_id text
)
SET search_path = public;

ALTER FUNCTION public.mark_webhook_failed(p_event_id character varying, p_error_message text)
SET search_path = public;

ALTER FUNCTION public.increment_payment_failed_count(p_cleaner_id uuid)
SET search_path = public;

ALTER FUNCTION public.update_cleaner_billing_dates(
  p_cleaner_id uuid,
  p_last_payment_date timestamp with time zone,
  p_next_billing_date timestamp with time zone,
  p_reset_failed_count boolean
)
SET search_path = public;
