-- ============================================================================
-- PERF B: auth_rls_initplan — wrap per-row auth.*() calls in scalar
-- subselects so Postgres evaluates them ONCE per statement (InitPlan)
-- instead of once per row. 10 advisor-flagged policies across 9 tables;
-- expressions below are the live pg_policies quals (pulled fresh 2026-07-10)
-- verbatim, with ONLY the auth.uid()/auth.role()/auth.jwt() call sites
-- wrapped. ALTER POLICY preserves each policy's roles and command.
--
-- None of these policies are on public.users, so the "users policies must
-- never self-reference users" rule is not in play (the EXISTS-against-users
-- admin pattern inside OTHER tables' policies is unchanged).
--
-- ZERO overlap with 20260710170200 (consolidation): that file touches only
-- users/pros/quote_requests/conversations/messages/payments; this file
-- touches none of those tables.
--
-- APPLY MANUALLY. Nothing applied.
-- ============================================================================

ALTER POLICY "Service role manage rate_limits" ON public.rate_limits
  USING ((( SELECT auth.jwt() ) ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((( SELECT auth.jwt() ) ->> 'role'::text) = 'service_role'::text);

ALTER POLICY "Service role can insert notifications" ON public.notifications
  WITH CHECK ((( SELECT auth.role() ) = 'service_role'::text) OR is_admin());

ALTER POLICY "Cleaners can manage own booking photos" ON public.booking_photos
  USING (cleaner_id IN ( SELECT pros.id
     FROM pros
    WHERE (pros.user_id = ( SELECT auth.uid() ))));

ALTER POLICY "Customers can view their booking photos" ON public.booking_photos
  USING ((booking_id)::text IN ( SELECT (booking_history.id)::text AS id
     FROM booking_history
    WHERE (booking_history.customer_id = ( SELECT auth.uid() ))));

ALTER POLICY "Service role full access to bookings" ON public.bookings
  USING (( SELECT auth.role() ) = 'service_role'::text);

ALTER POLICY "Service role full access to cleaner_blocked_dates" ON public.cleaner_blocked_dates
  USING (( SELECT auth.role() ) = 'service_role'::text);

ALTER POLICY "Admins can read pii_filter_log" ON public.pii_filter_log
  USING (EXISTS ( SELECT 1
     FROM users
    WHERE ((users.id = ( SELECT auth.uid() )) AND (users.role = 'admin'::user_role))));

ALTER POLICY "Admins can manage admin_actions" ON public.admin_actions
  USING (EXISTS ( SELECT 1
     FROM users
    WHERE ((users.id = ( SELECT auth.uid() )) AND (users.role = 'admin'::user_role))));

ALTER POLICY "service_categories: admin reads all" ON public.service_categories
  USING (EXISTS ( SELECT 1
     FROM users
    WHERE ((users.id = ( SELECT auth.uid() )) AND (users.role = 'admin'::user_role))));

ALTER POLICY "service_categories: admin writes" ON public.service_categories
  USING (EXISTS ( SELECT 1
     FROM users
    WHERE ((users.id = ( SELECT auth.uid() )) AND (users.role = 'admin'::user_role))))
  WITH CHECK (EXISTS ( SELECT 1
     FROM users
    WHERE ((users.id = ( SELECT auth.uid() )) AND (users.role = 'admin'::user_role))));

-- ---------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
-- Re-run the Supabase performance advisor: auth_rls_initplan must report 0.
-- Spot-check one qual:
--   SELECT qual FROM pg_policies WHERE policyname='Admins can manage admin_actions';
--   must contain '( SELECT auth.uid()'.
-- ---------------------------------------------------------------------------
