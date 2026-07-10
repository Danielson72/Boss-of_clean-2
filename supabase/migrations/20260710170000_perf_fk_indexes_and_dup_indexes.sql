-- ============================================================================
-- PERF A: cover the 3 unindexed FKs, drop the 3 duplicate indexes
-- Advisor lints: unindexed_foreign_keys (3), duplicate_index (3)
-- APPLY MANUALLY. Nothing here has been applied.
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction, so it
-- cannot be used in a migration file. At current pre-launch row counts
-- (all three tables are small) a plain CREATE INDEX takes milliseconds and
-- a brief lock is acceptable. If applying post-launch with real traffic,
-- run the CONCURRENTLY variants by hand instead.
-- ============================================================================

-- Unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_notification_logs_quote_request_id
  ON public.notification_logs (quote_request_id);
CREATE INDEX IF NOT EXISTS idx_pro_licenses_verified_by
  ON public.pro_licenses (verified_by);
CREATE INDEX IF NOT EXISTS idx_service_categories_alias_for
  ON public.service_categories (alias_for);

-- Duplicate indexes on pii_filter_log — keep the idx_* variants, drop twins
DROP INDEX IF EXISTS public.pii_filter_log_conversation_idx;
DROP INDEX IF EXISTS public.pii_filter_log_created_idx;
DROP INDEX IF EXISTS public.pii_filter_log_sender_idx;

-- ---------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
-- SELECT indexname FROM pg_indexes WHERE tablename IN
--   ('notification_logs','pro_licenses','service_categories','pii_filter_log')
-- ORDER BY tablename, indexname;
-- Expect the three new idx_*; expect NO *_idx twins on pii_filter_log.
-- ---------------------------------------------------------------------------
