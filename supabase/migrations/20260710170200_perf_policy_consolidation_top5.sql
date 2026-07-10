-- ============================================================================
-- PERF C: consolidate multiple permissive policies — TOP 5 TRAFFIC TABLES ONLY
-- (users, pros, quote_requests, conversations+messages, payments).
-- Remaining ~30 tables are a follow-up ticket. APPLY MANUALLY.
--
-- Soundness: Postgres evaluates PERMISSIVE policies as an OR-set, and USING /
-- WITH CHECK are each satisfied if ANY applicable permissive policy passes —
-- independently of which one. Therefore, for a given (role, command), replacing
-- N permissive policies with ONE whose USING is the OR of the N USINGs and
-- whose WITH CHECK is the OR of the N effective WITH CHECKs (a policy with a
-- null WITH CHECK contributes its USING) is EXACTLY equivalent.
--
-- Role-narrowing note: admin ALL policies previously declared TO authenticated
-- (pros, conversations) or TO public are merged into TO public per-command
-- policies via an is_admin() disjunct. Equivalent because is_admin() is
-- definitionally false for anon/unauthenticated sessions.
--
-- The 'cleaner' role string is preserved verbatim everywhere. service_role
-- ALL policies (users, quote_requests) are left untouched — they are a
-- different role and do not stack with public/authenticated in the planner
-- the way the flagged pairs do.
--
-- Per-table DROP+CREATE runs inside this single migration transaction.
-- ============================================================================

-- ═══════════════════════════ users ═══════════════════════════
-- HARD RULE: users policies never self-reference public.users. is_admin() and
-- is_cleaner() are SECURITY DEFINER helpers (no RLS recursion) and are the
-- pre-existing live pattern on this exact table — preserved, not widened.
DROP POLICY "users_admin_all" ON public.users;
DROP POLICY "users_select_own" ON public.users;
DROP POLICY "users_cleaners_view_location" ON public.users;
DROP POLICY "users_insert_own" ON public.users;
DROP POLICY "users_update_own" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT TO public
  USING (
    is_admin()
    OR (( SELECT auth.uid() ) = id)
    OR (is_cleaner() AND role = 'customer'::user_role)
  );
CREATE POLICY "users_insert" ON public.users FOR INSERT TO public
  WITH CHECK ( is_admin() OR (( SELECT auth.uid() ) = id) );
CREATE POLICY "users_update" ON public.users FOR UPDATE TO public
  USING ( is_admin() OR (( SELECT auth.uid() ) = id) )
  WITH CHECK ( is_admin() OR (( SELECT auth.uid() ) = id) );
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE TO public
  USING ( is_admin() );

-- ═══════════════════════════ pros ═══════════════════════════
DROP POLICY "admin_full_access" ON public.pros;
DROP POLICY "Users can view their cleaner profile" ON public.pros;
DROP POLICY "public_can_view_approved_cleaners" ON public.pros;
DROP POLICY "Users can create their own cleaner profile" ON public.pros;
DROP POLICY "Users can update their cleaner profile" ON public.pros;

CREATE POLICY "pros_select" ON public.pros FOR SELECT TO public
  USING (
    is_admin()
    OR (( SELECT auth.uid() ) = user_id)
    OR (approval_status = 'approved'::approval_status)
  );
CREATE POLICY "pros_insert" ON public.pros FOR INSERT TO public
  WITH CHECK ( is_admin() OR (( SELECT auth.uid() ) = user_id) );
CREATE POLICY "pros_update" ON public.pros FOR UPDATE TO public
  USING ( is_admin() OR (( SELECT auth.uid() ) = user_id) )
  WITH CHECK ( is_admin() OR (( SELECT auth.uid() ) = user_id) );
CREATE POLICY "pros_delete_admin" ON public.pros FOR DELETE TO public
  USING ( is_admin() );

-- ═══════════════════════ quote_requests ═══════════════════════
-- quote_requests_service_role_access (TO service_role) intentionally kept.
DROP POLICY "quote_requests_admin_all" ON public.quote_requests;
DROP POLICY "quote_requests_customers_select_own" ON public.quote_requests;
DROP POLICY "quote_requests_cleaners_select_assigned" ON public.quote_requests;
DROP POLICY "quote_requests_cleaners_select_marketplace" ON public.quote_requests;
DROP POLICY "quote_requests_customers_insert_own" ON public.quote_requests;
DROP POLICY "quote_requests_customers_update_own" ON public.quote_requests;
DROP POLICY "quote_requests_cleaners_update_assigned" ON public.quote_requests;
DROP POLICY "quote_requests_cleaners_update_marketplace" ON public.quote_requests;

CREATE POLICY "quote_requests_select" ON public.quote_requests FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (customer_id = ( SELECT auth.uid() ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
    OR (
      cleaner_id IS NULL AND status = 'pending'::quote_status
      AND EXISTS ( SELECT 1 FROM pros
        WHERE pros.user_id = ( SELECT auth.uid() )
          AND pros.approval_status = 'approved'::approval_status )
    )
  );
CREATE POLICY "quote_requests_insert" ON public.quote_requests FOR INSERT TO public
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (customer_id = ( SELECT auth.uid() ))
  );
CREATE POLICY "quote_requests_update" ON public.quote_requests FOR UPDATE TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (customer_id = ( SELECT auth.uid() ) AND status = 'pending'::quote_status)
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
    OR (
      cleaner_id IS NULL AND status = 'pending'::quote_status
      AND EXISTS ( SELECT 1 FROM pros
        WHERE pros.user_id = ( SELECT auth.uid() )
          AND pros.approval_status = 'approved'::approval_status )
    )
  )
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (customer_id = ( SELECT auth.uid() ) AND status = 'pending'::quote_status)
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "quote_requests_delete_admin" ON public.quote_requests FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM users
    WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ));

-- ═══════════════════════ conversations ═══════════════════════
DROP POLICY "admin_full_access" ON public.conversations;
DROP POLICY "Customers can view their own conversations" ON public.conversations;
DROP POLICY "Cleaners can view their conversations" ON public.conversations;
DROP POLICY "Customers can create conversations" ON public.conversations;
DROP POLICY "Participants can update conversations" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO public
  USING (
    is_admin()
    OR (customer_id = ( SELECT auth.uid() ))
    OR (EXISTS ( SELECT 1 FROM pros c
        WHERE c.id = conversations.cleaner_id AND c.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO public
  WITH CHECK (
    is_admin()
    OR ((( SELECT auth.uid() ) IS NOT NULL) AND (customer_id = ( SELECT auth.uid() )))
  );
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO public
  USING (
    is_admin()
    OR (customer_id = ( SELECT auth.uid() ))
    OR (EXISTS ( SELECT 1 FROM pros c
        WHERE c.id = conversations.cleaner_id AND c.user_id = ( SELECT auth.uid() ) ))
  )
  WITH CHECK (
    is_admin()
    OR (customer_id = ( SELECT auth.uid() ))
    OR (EXISTS ( SELECT 1 FROM pros c
        WHERE c.id = conversations.cleaner_id AND c.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "conversations_delete_admin" ON public.conversations FOR DELETE TO public
  USING ( is_admin() );

-- ═══════════════════════════ messages ═══════════════════════════
DROP POLICY "Admins can view reported messages" ON public.messages;
DROP POLICY "Cleaners can view messages in their conversations" ON public.messages;
DROP POLICY "Customers can view messages in their conversations" ON public.messages;
DROP POLICY "Cleaners can send messages" ON public.messages;
DROP POLICY "Customers can send messages" ON public.messages;
DROP POLICY "Conversation participants can report messages" ON public.messages;
DROP POLICY "Recipients can mark messages as read" ON public.messages;

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO public
  USING (
    ((EXISTS ( SELECT 1 FROM users
        WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
      AND reported_at IS NOT NULL)
    OR (EXISTS ( SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id AND c.customer_id = ( SELECT auth.uid() ) ))
    OR (EXISTS ( SELECT 1 FROM conversations c JOIN pros cl ON cl.id = c.cleaner_id
        WHERE c.id = messages.conversation_id AND cl.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO public
  WITH CHECK (
    (
      sender_id = ( SELECT auth.uid() ) AND (sender_role)::text = 'customer'
      AND EXISTS ( SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id AND c.customer_id = ( SELECT auth.uid() ) )
    )
    OR (
      sender_id = ( SELECT auth.uid() ) AND (sender_role)::text = 'cleaner'
      AND EXISTS ( SELECT 1 FROM conversations c JOIN pros cl ON cl.id = c.cleaner_id
        WHERE c.id = messages.conversation_id AND cl.user_id = ( SELECT auth.uid() ) )
    )
  );
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO public
  USING (
    -- report (participants)
    (EXISTS ( SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.customer_id = ( SELECT auth.uid() )
          OR c.cleaner_id = ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))))
    -- mark-as-read (recipients)
    OR (
      sender_id <> ( SELECT auth.uid() )
      AND (
        EXISTS ( SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id AND c.customer_id = ( SELECT auth.uid() ) )
        OR EXISTS ( SELECT 1 FROM conversations c JOIN pros cl ON cl.id = c.cleaner_id
          WHERE c.id = messages.conversation_id AND cl.user_id = ( SELECT auth.uid() ) )
      )
    )
  )
  WITH CHECK (
    -- report policy's explicit check
    (reported_by = ( SELECT auth.uid() ))
    -- mark-as-read had null WITH CHECK → contributes its USING verbatim
    OR (
      sender_id <> ( SELECT auth.uid() )
      AND (
        EXISTS ( SELECT 1 FROM conversations c
          WHERE c.id = messages.conversation_id AND c.customer_id = ( SELECT auth.uid() ) )
        OR EXISTS ( SELECT 1 FROM conversations c JOIN pros cl ON cl.id = c.cleaner_id
          WHERE c.id = messages.conversation_id AND cl.user_id = ( SELECT auth.uid() ) )
      )
    )
  );

-- ═══════════════════════════ payments ═══════════════════════════
DROP POLICY "payments_admin_all" ON public.payments;
DROP POLICY "payments_users_select_own" ON public.payments;
DROP POLICY "payments_users_insert_own" ON public.payments;
DROP POLICY "payments_users_update_own" ON public.payments;

CREATE POLICY "payments_select" ON public.payments FOR SELECT TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "payments_insert" ON public.payments FOR INSERT TO public
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "payments_update" ON public.payments FOR UPDATE TO public
  USING (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
  )
  WITH CHECK (
    (EXISTS ( SELECT 1 FROM users
       WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ))
    OR (cleaner_id IN ( SELECT pros.id FROM pros WHERE pros.user_id = ( SELECT auth.uid() ) ))
  );
CREATE POLICY "payments_delete_admin" ON public.payments FOR DELETE TO public
  USING (EXISTS ( SELECT 1 FROM users
    WHERE users.id = ( SELECT auth.uid() ) AND users.role = 'admin'::user_role ));

-- ---------------------------------------------------------------------------
-- POST-APPLY VERIFICATION
-- 1. SELECT tablename, cmd, count(*) FROM pg_policies WHERE schemaname='public'
--    AND tablename IN ('users','pros','quote_requests','conversations','messages','payments')
--    GROUP BY 1,2 HAVING count(*) > 1;
--    Expect zero rows for (public-role) commands, except the intentional
--    service_role ALL policies on users / quote_requests.
-- 2. Re-run performance advisor: multiple_permissive_policies should drop for
--    these 6 tables.
-- 3. App smoke as customer / pro / admin: browse pros, quote flow, messages,
--    pro payments page.
-- ---------------------------------------------------------------------------
