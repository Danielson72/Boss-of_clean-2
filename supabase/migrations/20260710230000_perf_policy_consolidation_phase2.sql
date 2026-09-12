-- ============================================================================
-- RLS POLICY CONSOLIDATION — PHASE 2 (DLD-572, follow-up to PR #79 phase C)
--
-- ⚠ PREPARED ONLY — APPLY MANUALLY. Do not auto-push. Schema/RLS changes
-- require Daniel's keyboard; after applying, re-run the performance advisor
-- and confirm multiple_permissive_policies drops to ~0.
--
-- Method (identical to docs/perf/rls-traffic-prep-analysis.md §C):
-- permissive policies are an OR-set, so one merged policy per (role, command)
-- with OR'd USINGs and OR'd effective WITH CHECKs (a policy with null WITH
-- CHECK contributes its USING) is exactly equivalent. Admin ALL policies fold
-- into per-command policies via their qual (is_admin() is false for anon, so
-- widening TO authenticated → TO public where noted is equivalent).
--
-- All expressions below are the LIVE quals verbatim (pulled from pg_policies
-- 2026-07-10, post-PR#79 initplan fixes) — only OR'd together. service_role
-- ALL policies (qual true) are left untouched throughout.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- booking_history
-- Before: admin ALL (TO authenticated, is_admin()) + INSERT self +
--         SELECT self/cleaner + UPDATE self/cleaner  → merged per command.
-- ----------------------------------------------------------------------------
DROP POLICY "admin_full_access" ON public.booking_history;
DROP POLICY "Users can insert their own bookings" ON public.booking_history;
DROP POLICY "Cleaners can view their bookings" ON public.booking_history;
DROP POLICY "Users can view their own bookings" ON public.booking_history;
DROP POLICY "Cleaners can update their bookings" ON public.booking_history;
DROP POLICY "Users can update their own bookings" ON public.booking_history;

CREATE POLICY booking_history_insert ON public.booking_history
  FOR INSERT TO public
  WITH CHECK (
    is_admin()
    OR (( SELECT auth.uid() ) = customer_id)
  );

CREATE POLICY booking_history_select ON public.booking_history
  FOR SELECT TO public
  USING (
    is_admin()
    OR (( SELECT auth.uid() ) = customer_id)
    OR (EXISTS ( SELECT 1 FROM pros
         WHERE pros.id = booking_history.cleaner_id
           AND pros.user_id = ( SELECT auth.uid() )))
  );

CREATE POLICY booking_history_update ON public.booking_history
  FOR UPDATE TO public
  USING (
    is_admin()
    OR (( SELECT auth.uid() ) = customer_id)
    OR (EXISTS ( SELECT 1 FROM pros
         WHERE pros.id = booking_history.cleaner_id
           AND pros.user_id = ( SELECT auth.uid() )))
  )
  WITH CHECK (
    is_admin()
    OR (( SELECT auth.uid() ) = customer_id)
    OR (EXISTS ( SELECT 1 FROM pros
         WHERE pros.id = booking_history.cleaner_id
           AND pros.user_id = ( SELECT auth.uid() )))
  );

CREATE POLICY booking_history_delete_admin ON public.booking_history
  FOR DELETE TO public
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- booking_transactions — 3 SELECT policies → 1.
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all bookings" ON public.booking_transactions;
DROP POLICY "Cleaners can view assigned bookings" ON public.booking_transactions;
DROP POLICY "Customers can view own bookings" ON public.booking_transactions;

CREATE POLICY booking_transactions_select ON public.booking_transactions
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users u
       WHERE u.id = ( SELECT auth.uid() ) AND u.role = 'admin'::user_role))
    OR (cleaner_id IN ( SELECT c.id FROM pros c
         WHERE c.user_id = ( SELECT auth.uid() )))
    OR (customer_id = ( SELECT auth.uid() ))
  );

-- ----------------------------------------------------------------------------
-- bookings
-- Before: "Service role full access" ALL TO public (qual auth.role()) +
--         INSERT self + SELECT self/cleaner + UPDATE self/cleaner
-- ----------------------------------------------------------------------------
DROP POLICY "Service role full access to bookings" ON public.bookings;
DROP POLICY "Authenticated users can create bookings" ON public.bookings;
DROP POLICY "Cleaners can view their assigned bookings" ON public.bookings;
DROP POLICY "Customers can view their own bookings" ON public.bookings;
DROP POLICY "Cleaners can update booking status" ON public.bookings;
DROP POLICY "Customers can cancel their own bookings" ON public.bookings;

CREATE POLICY bookings_insert ON public.bookings
  FOR INSERT TO public
  WITH CHECK (
    (( SELECT auth.role() ) = 'service_role'::text)
    OR ((( SELECT auth.uid() ) IS NOT NULL) AND (customer_id = ( SELECT auth.uid() )))
  );

CREATE POLICY bookings_select ON public.bookings
  FOR SELECT TO public
  USING (
    (( SELECT auth.role() ) = 'service_role'::text)
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.id = bookings.cleaner_id AND c.user_id = ( SELECT auth.uid() )))
    OR (customer_id = ( SELECT auth.uid() ))
  );

CREATE POLICY bookings_update ON public.bookings
  FOR UPDATE TO public
  USING (
    (( SELECT auth.role() ) = 'service_role'::text)
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.id = bookings.cleaner_id AND c.user_id = ( SELECT auth.uid() )))
    OR (customer_id = ( SELECT auth.uid() ))
  )
  WITH CHECK (
    (( SELECT auth.role() ) = 'service_role'::text)
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.id = bookings.cleaner_id AND c.user_id = ( SELECT auth.uid() )))
    OR (customer_id = ( SELECT auth.uid() ))
  );

CREATE POLICY bookings_delete_service ON public.bookings
  FOR DELETE TO public
  USING (( SELECT auth.role() ) = 'service_role'::text);

-- ----------------------------------------------------------------------------
-- cleaner_blocked_dates — two ALL TO public → one.
-- ----------------------------------------------------------------------------
DROP POLICY "Cleaners manage their own blocked dates" ON public.cleaner_blocked_dates;
DROP POLICY "Service role full access to cleaner_blocked_dates" ON public.cleaner_blocked_dates;

CREATE POLICY cleaner_blocked_dates_all ON public.cleaner_blocked_dates
  FOR ALL TO public
  USING (
    (( SELECT auth.role() ) = 'service_role'::text)
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.id = cleaner_blocked_dates.cleaner_id
           AND c.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- cleaner_documents — 2 SELECT → 1 (INSERT/UPDATE had no collisions; untouched).
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all documents" ON public.cleaner_documents;
DROP POLICY "Cleaners can view their own documents" ON public.cleaner_documents;

CREATE POLICY cleaner_documents_select ON public.cleaner_documents
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
    OR (cleaner_id IN ( SELECT pros.id FROM pros
         WHERE pros.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- customer_credits — 2 SELECT → 1.
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all credits" ON public.customer_credits;
DROP POLICY "Customers can view own credits" ON public.customer_credits;

CREATE POLICY customer_credits_select ON public.customer_credits
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
    OR (customer_id = ( SELECT auth.uid() ))
  );

-- ----------------------------------------------------------------------------
-- disputes — 2 SELECT → 1.
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all disputes" ON public.disputes;
DROP POLICY "Cleaners can view their own disputes" ON public.disputes;

CREATE POLICY disputes_select ON public.disputes
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users u
       WHERE u.id = ( SELECT auth.uid() ) AND u.role = 'admin'::user_role))
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.id = disputes.cleaner_id AND c.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- hire_confirmations — 3 SELECT → 1 (INSERT had no collision; untouched).
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all confirmations" ON public.hire_confirmations;
DROP POLICY "Customers can view own confirmations" ON public.hire_confirmations;
DROP POLICY "Pros can view confirmations for their leads" ON public.hire_confirmations;

CREATE POLICY hire_confirmations_select ON public.hire_confirmations
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
    OR (customer_id = ( SELECT auth.uid() ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros
         WHERE pros.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- lead_acceptances — 2 SELECT → 1 (INSERT had no collision; untouched).
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view all unlocks" ON public.lead_acceptances;
DROP POLICY "Pros can view own unlocks" ON public.lead_acceptances;

CREATE POLICY lead_acceptances_select ON public.lead_acceptances
  FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
    OR (cleaner_id IN ( SELECT pros.id FROM pros
         WHERE pros.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- lead_distributions
-- Before: admin ALL (TO authenticated) + 2 SELECT (TO authenticated).
-- Admin ALL folds per-command; policies stay TO authenticated (original scope).
-- ----------------------------------------------------------------------------
DROP POLICY "admin_full_access_lead_distributions" ON public.lead_distributions;
DROP POLICY "customers_read_own_distributions" ON public.lead_distributions;
DROP POLICY "pros_read_own_distributions" ON public.lead_distributions;

CREATE POLICY lead_distributions_select ON public.lead_distributions
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM quote_requests qr
         WHERE qr.id = lead_distributions.quote_request_id
           AND qr.customer_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM pros c
         WHERE c.user_id = ( SELECT auth.uid() )
           AND c.id = ANY (lead_distributions.notified_pro_ids)))
  );

CREATE POLICY lead_distributions_insert_admin ON public.lead_distributions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY lead_distributions_update_admin ON public.lead_distributions
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY lead_distributions_delete_admin ON public.lead_distributions
  FOR DELETE TO authenticated
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- message_attachments
-- Before: admin ALL (TO authenticated) + participants INSERT + 2 SELECT.
-- ----------------------------------------------------------------------------
DROP POLICY "admin_full_access" ON public.message_attachments;
DROP POLICY "Participants can insert attachments" ON public.message_attachments;
DROP POLICY "Cleaners can view attachments in their conversations" ON public.message_attachments;
DROP POLICY "Customers can view attachments in their conversations" ON public.message_attachments;

CREATE POLICY message_attachments_insert ON public.message_attachments
  FOR INSERT TO public
  WITH CHECK (
    is_admin()
    OR (EXISTS ( SELECT 1
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.id = message_attachments.message_id
           AND ((c.customer_id = ( SELECT auth.uid() ))
                OR (EXISTS ( SELECT 1 FROM pros cl
                     WHERE cl.id = c.cleaner_id
                       AND cl.user_id = ( SELECT auth.uid() ))))))
  );

CREATE POLICY message_attachments_select ON public.message_attachments
  FOR SELECT TO public
  USING (
    is_admin()
    OR (EXISTS ( SELECT 1
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN pros cl ON cl.id = c.cleaner_id
         WHERE m.id = message_attachments.message_id
           AND cl.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.id = message_attachments.message_id
           AND c.customer_id = ( SELECT auth.uid() )))
  );

CREATE POLICY message_attachments_update_admin ON public.message_attachments
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY message_attachments_delete_admin ON public.message_attachments
  FOR DELETE TO public
  USING (is_admin());

-- ----------------------------------------------------------------------------
-- pii_filter_log — two byte-identical admin SELECT policies; drop the dup.
-- ----------------------------------------------------------------------------
DROP POLICY "Admins can view pii_filter_log" ON public.pii_filter_log;

-- ----------------------------------------------------------------------------
-- pro_categories — admin ALL + owner per-command + public-approved SELECT.
-- ----------------------------------------------------------------------------
DROP POLICY "pro_categories_admin_all" ON public.pro_categories;
DROP POLICY "pro_categories_owner_select" ON public.pro_categories;
DROP POLICY "pro_categories_public_view_approved" ON public.pro_categories;
DROP POLICY "pro_categories_owner_insert" ON public.pro_categories;
DROP POLICY "pro_categories_owner_update" ON public.pro_categories;
DROP POLICY "pro_categories_owner_delete" ON public.pro_categories;

CREATE POLICY pro_categories_select ON public.pro_categories
  FOR SELECT TO public
  USING (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.approval_status = 'approved'::approval_status))
  );

CREATE POLICY pro_categories_insert ON public.pro_categories
  FOR INSERT TO public
  WITH CHECK (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.user_id = ( SELECT auth.uid() )))
  );

CREATE POLICY pro_categories_update ON public.pro_categories
  FOR UPDATE TO public
  USING (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.user_id = ( SELECT auth.uid() )))
  )
  WITH CHECK (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.user_id = ( SELECT auth.uid() )))
  );

CREATE POLICY pro_categories_delete ON public.pro_categories
  FOR DELETE TO public
  USING (
    is_admin()
    OR (EXISTS ( SELECT 1 FROM pros p
         WHERE p.id = pro_categories.pro_id
           AND p.user_id = ( SELECT auth.uid() )))
  );

-- ----------------------------------------------------------------------------
-- service_areas — cleaner ALL + admin ALL + public SELECT(true).
-- SELECT merges to `true` (public policy already grants everyone read).
-- ----------------------------------------------------------------------------
DROP POLICY "cleaners_can_manage_own_service_areas" ON public.service_areas;
DROP POLICY "service_areas_admin_all" ON public.service_areas;
DROP POLICY "public_can_view_service_areas" ON public.service_areas;

CREATE POLICY service_areas_select ON public.service_areas
  FOR SELECT TO public
  USING (true);

CREATE POLICY service_areas_insert ON public.service_areas
  FOR INSERT TO public
  WITH CHECK (
    (cleaner_id IN ( SELECT pros.id FROM pros
       WHERE pros.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM users
         WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
  );

CREATE POLICY service_areas_update ON public.service_areas
  FOR UPDATE TO public
  USING (
    (cleaner_id IN ( SELECT pros.id FROM pros
       WHERE pros.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM users
         WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
  )
  WITH CHECK (
    (cleaner_id IN ( SELECT pros.id FROM pros
       WHERE pros.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM users
         WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
  );

CREATE POLICY service_areas_delete ON public.service_areas
  FOR DELETE TO public
  USING (
    (cleaner_id IN ( SELECT pros.id FROM pros
       WHERE pros.user_id = ( SELECT auth.uid() )))
    OR (EXISTS ( SELECT 1 FROM users
         WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
  );

-- ----------------------------------------------------------------------------
-- service_categories — admin ALL ("admin writes") + 2 SELECT.
-- ----------------------------------------------------------------------------
DROP POLICY "service_categories: admin writes" ON public.service_categories;
DROP POLICY "service_categories: admin reads all" ON public.service_categories;
DROP POLICY "service_categories: anyone reads active rows" ON public.service_categories;

CREATE POLICY service_categories_select ON public.service_categories
  FOR SELECT TO public
  USING (
    (is_active = true)
    OR (EXISTS ( SELECT 1 FROM users
         WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role))
  );

CREATE POLICY service_categories_insert_admin ON public.service_categories
  FOR INSERT TO public
  WITH CHECK (
    EXISTS ( SELECT 1 FROM users
      WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role)
  );

CREATE POLICY service_categories_update_admin ON public.service_categories
  FOR UPDATE TO public
  USING (
    EXISTS ( SELECT 1 FROM users
      WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role)
  )
  WITH CHECK (
    EXISTS ( SELECT 1 FROM users
      WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role)
  );

CREATE POLICY service_categories_delete_admin ON public.service_categories
  FOR DELETE TO public
  USING (
    EXISTS ( SELECT 1 FROM users
      WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role)
  );
