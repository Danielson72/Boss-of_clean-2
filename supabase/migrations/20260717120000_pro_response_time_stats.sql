-- =====================================================================
-- pro_response_time_stats() — measured median first-response time per pro
-- =====================================================================
-- Computes, per pro, the MEDIAN time between a customer's first message in
-- a conversation and that pro's first reply, from real message timestamps.
--
-- SECURITY DEFINER is required: messages/conversations RLS restricts row
-- reads to the two participants (supabase/13-messaging-schema.sql:77-96), so
-- an aggregate across all pros cannot be computed by an anon/other-user
-- client. This function returns ONLY the safe aggregate (median seconds +
-- sample count) — never message content or counterparties.
--
-- The UI only renders "Usually responds within X" when sample_count >= 3
-- (see lib/services/response-time.ts MIN_RESPONSE_SAMPLES), so thin pros
-- show nothing.
--
-- DRAFT — apply by hand (this repo never auto-applies migrations).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.pro_response_time_stats(p_pro_ids uuid[] DEFAULT NULL)
RETURNS TABLE (pro_id uuid, median_seconds numeric, sample_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per_conv AS (
    SELECT
      c.cleaner_id AS pro_id,
      min(m.created_at) FILTER (WHERE m.sender_role = 'customer') AS t0,
      min(m.created_at) FILTER (WHERE m.sender_role = 'cleaner')  AS t1
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    WHERE p_pro_ids IS NULL OR c.cleaner_id = ANY(p_pro_ids)
    GROUP BY c.id, c.cleaner_id
  ),
  deltas AS (
    -- Only conversations where the customer messaged first AND the pro later
    -- replied count as a data point.
    SELECT pro_id, EXTRACT(EPOCH FROM (t1 - t0)) AS secs
    FROM per_conv
    WHERE t0 IS NOT NULL AND t1 IS NOT NULL AND t1 > t0
  )
  SELECT
    pro_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY secs) AS median_seconds,
    count(*)::int AS sample_count
  FROM deltas
  GROUP BY pro_id;
$$;

-- Aggregate-only, no PII — safe to expose to public marketplace surfaces.
GRANT EXECUTE ON FUNCTION public.pro_response_time_stats(uuid[]) TO anon, authenticated;

-- =====================================================================
-- Verify after apply:
--   SELECT * FROM public.pro_response_time_stats();
--   -- returns (pro_id, median_seconds, sample_count) for pros with >=1
--   -- customer-first/pro-reply conversation. UI shows the badge at >=3.
-- =====================================================================
