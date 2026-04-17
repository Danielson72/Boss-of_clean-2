-- DLD-226: Fix RLS performance — wrap auth.uid() in (select auth.uid()) so it
-- evaluates once per query instead of once per row. Also adds 2 missing indexes.

-- ============================================================
-- booking_history
-- ============================================================
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.booking_history;
CREATE POLICY "Users can insert their own bookings" ON public.booking_history
  FOR INSERT WITH CHECK ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.booking_history;
CREATE POLICY "Users can update their own bookings" ON public.booking_history
  FOR UPDATE USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.booking_history;
CREATE POLICY "Users can view their own bookings" ON public.booking_history
  FOR SELECT USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Cleaners can update their bookings" ON public.booking_history;
CREATE POLICY "Cleaners can update their bookings" ON public.booking_history
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = booking_history.cleaner_id
      AND cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Cleaners can view their bookings" ON public.booking_history;
CREATE POLICY "Cleaners can view their bookings" ON public.booking_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cleaners
    WHERE cleaners.id = booking_history.cleaner_id
      AND cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- booking_transactions
-- ============================================================
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.booking_transactions;
CREATE POLICY "Customers can view own bookings" ON public.booking_transactions
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.booking_transactions;
CREATE POLICY "Admins can view all bookings" ON public.booking_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Cleaners can view assigned bookings" ON public.booking_transactions;
CREATE POLICY "Cleaners can view assigned bookings" ON public.booking_transactions
  FOR SELECT USING (cleaner_id IN (
    SELECT c.id FROM cleaners c WHERE c.user_id = (select auth.uid())
  ));

-- ============================================================
-- bookings
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND customer_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Customers can cancel their own bookings" ON public.bookings;
CREATE POLICY "Customers can cancel their own bookings" ON public.bookings
  FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings" ON public.bookings
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Cleaners can update booking status" ON public.bookings;
CREATE POLICY "Cleaners can update booking status" ON public.bookings
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM cleaners c
    WHERE c.id = bookings.cleaner_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Cleaners can view their assigned bookings" ON public.bookings;
CREATE POLICY "Cleaners can view their assigned bookings" ON public.bookings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cleaners c
    WHERE c.id = bookings.cleaner_id AND c.user_id = (select auth.uid())
  ));

-- ============================================================
-- cleaner_availability
-- ============================================================
DROP POLICY IF EXISTS "Cleaners manage own availability" ON public.cleaner_availability;
CREATE POLICY "Cleaners manage own availability" ON public.cleaner_availability
  FOR ALL
  USING (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())))
  WITH CHECK (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())));

-- ============================================================
-- cleaner_blocked_dates
-- ============================================================
DROP POLICY IF EXISTS "Cleaners manage their own blocked dates" ON public.cleaner_blocked_dates;
CREATE POLICY "Cleaners manage their own blocked dates" ON public.cleaner_blocked_dates
  FOR ALL USING (EXISTS (
    SELECT 1 FROM cleaners c
    WHERE c.id = cleaner_blocked_dates.cleaner_id AND c.user_id = (select auth.uid())
  ));

-- ============================================================
-- cleaner_documents
-- ============================================================
DROP POLICY IF EXISTS "Admins can update all documents" ON public.cleaner_documents;
CREATE POLICY "Admins can update all documents" ON public.cleaner_documents
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Admins can view all documents" ON public.cleaner_documents;
CREATE POLICY "Admins can view all documents" ON public.cleaner_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Cleaners can insert their own documents" ON public.cleaner_documents;
CREATE POLICY "Cleaners can insert their own documents" ON public.cleaner_documents
  FOR INSERT WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Cleaners can view their own documents" ON public.cleaner_documents;
CREATE POLICY "Cleaners can view their own documents" ON public.cleaner_documents
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- cleaners
-- ============================================================
DROP POLICY IF EXISTS "Users can create their own cleaner profile" ON public.cleaners;
CREATE POLICY "Users can create their own cleaner profile" ON public.cleaners
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their cleaner profile" ON public.cleaners;
CREATE POLICY "Users can update their cleaner profile" ON public.cleaners
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their cleaner profile" ON public.cleaners;
CREATE POLICY "Users can view their cleaner profile" ON public.cleaners
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================
-- contact_submissions
-- ============================================================
DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

-- ============================================================
-- conversations
-- ============================================================
DROP POLICY IF EXISTS "Customers can create conversations" ON public.conversations;
CREATE POLICY "Customers can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND customer_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Customers can view their own conversations" ON public.conversations;
CREATE POLICY "Customers can view their own conversations" ON public.conversations
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Cleaners can view their conversations" ON public.conversations;
CREATE POLICY "Cleaners can view their conversations" ON public.conversations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cleaners c
    WHERE c.id = conversations.cleaner_id AND c.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE USING (
    customer_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM cleaners c
      WHERE c.id = conversations.cleaner_id AND c.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- customer_credits
-- ============================================================
DROP POLICY IF EXISTS "Customers can view own credits" ON public.customer_credits;
CREATE POLICY "Customers can view own credits" ON public.customer_credits
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can view all credits" ON public.customer_credits;
CREATE POLICY "Admins can view all credits" ON public.customer_credits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

-- ============================================================
-- customer_favorites
-- ============================================================
DROP POLICY IF EXISTS "Customers can add favorites" ON public.customer_favorites;
CREATE POLICY "Customers can add favorites" ON public.customer_favorites
  FOR INSERT WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can remove own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can remove own favorites" ON public.customer_favorites
  FOR DELETE USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Customers can view own favorites" ON public.customer_favorites;
CREATE POLICY "Customers can view own favorites" ON public.customer_favorites
  FOR SELECT USING ((select auth.uid()) = customer_id);

-- ============================================================
-- customer_quote_counters
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own quote counters" ON public.customer_quote_counters;
CREATE POLICY "Users can insert own quote counters" ON public.customer_quote_counters
  FOR INSERT WITH CHECK ((user_id = (select auth.uid())) OR (user_id IS NULL));

DROP POLICY IF EXISTS "Users can update own quote counters" ON public.customer_quote_counters;
CREATE POLICY "Users can update own quote counters" ON public.customer_quote_counters
  FOR UPDATE USING ((user_id = (select auth.uid())) OR (user_id IS NULL));

DROP POLICY IF EXISTS "Users can view own quote counters" ON public.customer_quote_counters;
CREATE POLICY "Users can view own quote counters" ON public.customer_quote_counters
  FOR SELECT USING (user_id = (select auth.uid()));

-- ============================================================
-- disputes
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all disputes" ON public.disputes;
CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (select auth.uid()) AND u.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Cleaners can view their own disputes" ON public.disputes;
CREATE POLICY "Cleaners can view their own disputes" ON public.disputes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM cleaners c
    WHERE c.id = disputes.cleaner_id AND c.user_id = (select auth.uid())
  ));

-- ============================================================
-- hire_confirmations
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all confirmations" ON public.hire_confirmations;
CREATE POLICY "Admins can view all confirmations" ON public.hire_confirmations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Customers can create hire confirmations" ON public.hire_confirmations;
CREATE POLICY "Customers can create hire confirmations" ON public.hire_confirmations
  FOR INSERT WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own confirmations" ON public.hire_confirmations;
CREATE POLICY "Customers can view own confirmations" ON public.hire_confirmations
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Pros can view confirmations for their leads" ON public.hire_confirmations;
CREATE POLICY "Pros can view confirmations for their leads" ON public.hire_confirmations
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- lead_charges
-- ============================================================
DROP POLICY IF EXISTS "Cleaners can view own lead charges" ON public.lead_charges;
CREATE POLICY "Cleaners can view own lead charges" ON public.lead_charges
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- lead_refund_requests
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all refund requests" ON public.lead_refund_requests;
CREATE POLICY "Admins can manage all refund requests" ON public.lead_refund_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Pros can create refund requests" ON public.lead_refund_requests;
CREATE POLICY "Pros can create refund requests" ON public.lead_refund_requests
  FOR INSERT WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Pros can view own refund requests" ON public.lead_refund_requests;
CREATE POLICY "Pros can view own refund requests" ON public.lead_refund_requests
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- lead_unlocks
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all unlocks" ON public.lead_unlocks;
CREATE POLICY "Admins can view all unlocks" ON public.lead_unlocks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Pros can create unlocks" ON public.lead_unlocks;
CREATE POLICY "Pros can create unlocks" ON public.lead_unlocks
  FOR INSERT WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Pros can view own unlocks" ON public.lead_unlocks;
CREATE POLICY "Pros can view own unlocks" ON public.lead_unlocks
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- leads
-- ============================================================
DROP POLICY IF EXISTS "cleaners_can_view_assigned_leads" ON public.leads;
CREATE POLICY "cleaners_can_view_assigned_leads" ON public.leads
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "customers_can_create_leads" ON public.leads;
CREATE POLICY "customers_can_create_leads" ON public.leads
  FOR INSERT WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "customers_can_view_own_leads" ON public.leads;
CREATE POLICY "customers_can_view_own_leads" ON public.leads
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "leads_admin_all" ON public.leads;
CREATE POLICY "leads_admin_all" ON public.leads
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

-- ============================================================
-- message_attachments
-- ============================================================
DROP POLICY IF EXISTS "Cleaners can view attachments in their conversations" ON public.message_attachments;
CREATE POLICY "Cleaners can view attachments in their conversations" ON public.message_attachments
  FOR SELECT USING (EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN cleaners cl ON cl.id = c.cleaner_id
    WHERE m.id = message_attachments.message_id
      AND cl.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Customers can view attachments in their conversations" ON public.message_attachments;
CREATE POLICY "Customers can view attachments in their conversations" ON public.message_attachments
  FOR SELECT USING (EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_attachments.message_id
      AND c.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Participants can insert attachments" ON public.message_attachments;
CREATE POLICY "Participants can insert attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_attachments.message_id
      AND (
        c.customer_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM cleaners cl
          WHERE cl.id = c.cleaner_id AND cl.user_id = (select auth.uid())
        )
      )
  ));

-- ============================================================
-- messages
-- ============================================================
DROP POLICY IF EXISTS "Admins can view reported messages" ON public.messages;
CREATE POLICY "Admins can view reported messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
    )
    AND reported_at IS NOT NULL
  );

DROP POLICY IF EXISTS "Cleaners can send messages" ON public.messages;
CREATE POLICY "Cleaners can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())
    AND sender_role::text = 'cleaner'
    AND EXISTS (
      SELECT 1
      FROM conversations c
      JOIN cleaners cl ON cl.id = c.cleaner_id
      WHERE c.id = messages.conversation_id AND cl.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Cleaners can view messages in their conversations" ON public.messages;
CREATE POLICY "Cleaners can view messages in their conversations" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1
    FROM conversations c
    JOIN cleaners cl ON cl.id = c.cleaner_id
    WHERE c.id = messages.conversation_id AND cl.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Conversation participants can report messages" ON public.messages;
CREATE POLICY "Conversation participants can report messages" ON public.messages
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (
        c.customer_id = (select auth.uid())
        OR c.cleaner_id = (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid()))
      )
  ))
  WITH CHECK (reported_by = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can send messages" ON public.messages;
CREATE POLICY "Customers can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())
    AND sender_role::text = 'customer'
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id AND c.customer_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can view messages in their conversations" ON public.messages;
CREATE POLICY "Customers can view messages in their conversations" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
CREATE POLICY "Recipients can mark messages as read" ON public.messages
  FOR UPDATE USING (
    sender_id <> (select auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = messages.conversation_id AND c.customer_id = (select auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM conversations c
        JOIN cleaners cl ON cl.id = c.cleaner_id
        WHERE c.id = messages.conversation_id AND cl.user_id = (select auth.uid())
      )
    )
  );

-- ============================================================
-- notification_preferences
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================
-- payments
-- ============================================================
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "payments_users_insert_own" ON public.payments;
CREATE POLICY "payments_users_insert_own" ON public.payments
  FOR INSERT WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "payments_users_select_own" ON public.payments;
CREATE POLICY "payments_users_select_own" ON public.payments
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "payments_users_update_own" ON public.payments;
CREATE POLICY "payments_users_update_own" ON public.payments
  FOR UPDATE USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- portfolio_photos
-- ============================================================
DROP POLICY IF EXISTS "Pros can manage own portfolio photos" ON public.portfolio_photos;
CREATE POLICY "Pros can manage own portfolio photos" ON public.portfolio_photos
  FOR ALL
  USING (pro_id = (select auth.uid()))
  WITH CHECK (pro_id = (select auth.uid()));

-- ============================================================
-- pro_lead_credits
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all lead credits" ON public.pro_lead_credits;
CREATE POLICY "Admins can view all lead credits" ON public.pro_lead_credits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Pros can view own lead credits" ON public.pro_lead_credits;
CREATE POLICY "Pros can view own lead credits" ON public.pro_lead_credits
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- pro_spending_caps
-- ============================================================
DROP POLICY IF EXISTS "Pros can manage own spending caps" ON public.pro_spending_caps;
CREATE POLICY "Pros can manage own spending caps" ON public.pro_spending_caps
  FOR ALL
  USING (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())))
  WITH CHECK (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())));

-- ============================================================
-- professional_profiles
-- ============================================================
DROP POLICY IF EXISTS "Cleaners manage own profile" ON public.professional_profiles;
CREATE POLICY "Cleaners manage own profile" ON public.professional_profiles
  FOR ALL
  USING (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())))
  WITH CHECK (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())));

-- ============================================================
-- quote_comparisons
-- ============================================================
DROP POLICY IF EXISTS "Users can delete their own comparisons" ON public.quote_comparisons;
CREATE POLICY "Users can delete their own comparisons" ON public.quote_comparisons
  FOR DELETE USING (
    (select auth.uid()) = customer_id
    OR (customer_id IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can insert their own comparisons" ON public.quote_comparisons;
CREATE POLICY "Users can insert their own comparisons" ON public.quote_comparisons
  FOR INSERT WITH CHECK (
    (select auth.uid()) = customer_id
    OR (customer_id IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can update their own comparisons" ON public.quote_comparisons;
CREATE POLICY "Users can update their own comparisons" ON public.quote_comparisons
  FOR UPDATE USING (
    (select auth.uid()) = customer_id
    OR (customer_id IS NULL AND session_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can view their own comparisons" ON public.quote_comparisons;
CREATE POLICY "Users can view their own comparisons" ON public.quote_comparisons
  FOR SELECT USING (
    (select auth.uid()) = customer_id
    OR (customer_id IS NULL AND session_id IS NOT NULL)
  );

-- ============================================================
-- quote_requests
-- ============================================================
DROP POLICY IF EXISTS "quote_requests_admin_all" ON public.quote_requests;
CREATE POLICY "quote_requests_admin_all" ON public.quote_requests
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "quote_requests_cleaners_select_assigned" ON public.quote_requests;
CREATE POLICY "quote_requests_cleaners_select_assigned" ON public.quote_requests
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "quote_requests_cleaners_select_marketplace" ON public.quote_requests;
CREATE POLICY "quote_requests_cleaners_select_marketplace" ON public.quote_requests
  FOR SELECT USING (
    cleaner_id IS NULL
    AND status = 'pending'::quote_status
    AND EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.user_id = (select auth.uid())
        AND cleaners.approval_status = 'approved'::approval_status
    )
  );

DROP POLICY IF EXISTS "quote_requests_cleaners_update_assigned" ON public.quote_requests;
CREATE POLICY "quote_requests_cleaners_update_assigned" ON public.quote_requests
  FOR UPDATE USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "quote_requests_cleaners_update_marketplace" ON public.quote_requests;
CREATE POLICY "quote_requests_cleaners_update_marketplace" ON public.quote_requests
  FOR UPDATE
  USING (
    cleaner_id IS NULL
    AND status = 'pending'::quote_status
    AND EXISTS (
      SELECT 1 FROM cleaners
      WHERE cleaners.user_id = (select auth.uid())
        AND cleaners.approval_status = 'approved'::approval_status
    )
  )
  WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "quote_requests_customers_insert_own" ON public.quote_requests;
CREATE POLICY "quote_requests_customers_insert_own" ON public.quote_requests
  FOR INSERT WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "quote_requests_customers_select_own" ON public.quote_requests;
CREATE POLICY "quote_requests_customers_select_own" ON public.quote_requests
  FOR SELECT USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "quote_requests_customers_update_own" ON public.quote_requests;
CREATE POLICY "quote_requests_customers_update_own" ON public.quote_requests
  FOR UPDATE USING (
    customer_id = (select auth.uid())
    AND status = 'pending'::quote_status
  );

-- ============================================================
-- reviews
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews" ON public.reviews
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "Cleaners can respond to reviews" ON public.reviews;
CREATE POLICY "Cleaners can respond to reviews" ON public.reviews
  FOR UPDATE
  USING (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())))
  WITH CHECK (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Customers can insert own reviews" ON public.reviews;
CREATE POLICY "Customers can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK ((select auth.uid()) = customer_id);

-- ============================================================
-- service_areas
-- ============================================================
DROP POLICY IF EXISTS "cleaners_can_manage_own_service_areas" ON public.service_areas;
CREATE POLICY "cleaners_can_manage_own_service_areas" ON public.service_areas
  FOR ALL USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "service_areas_admin_all" ON public.service_areas;
CREATE POLICY "service_areas_admin_all" ON public.service_areas
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

-- ============================================================
-- services_pricing
-- ============================================================
DROP POLICY IF EXISTS "Cleaners manage own pricing" ON public.services_pricing;
CREATE POLICY "Cleaners manage own pricing" ON public.services_pricing
  FOR ALL
  USING (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())))
  WITH CHECK (cleaner_id IN (SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())));

-- ============================================================
-- stripe_webhook_events
-- ============================================================
DROP POLICY IF EXISTS "Admins can view webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.stripe_webhook_events
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

-- ============================================================
-- subscriptions
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_all" ON public.subscriptions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

DROP POLICY IF EXISTS "subscriptions_cleaners_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_cleaners_insert_own" ON public.subscriptions
  FOR INSERT WITH CHECK (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "subscriptions_cleaners_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_cleaners_select_own" ON public.subscriptions
  FOR SELECT USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "subscriptions_cleaners_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_cleaners_update_own" ON public.subscriptions
  FOR UPDATE USING (cleaner_id IN (
    SELECT cleaners.id FROM cleaners WHERE cleaners.user_id = (select auth.uid())
  ));

-- ============================================================
-- users
-- ============================================================
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users_cleaners_view_location" ON public.users;
CREATE POLICY "users_cleaners_view_location" ON public.users
  FOR SELECT USING (
    (select auth.uid()) = id
    OR (is_cleaner() AND role = 'customer'::user_role)
  );

-- ============================================================
-- Missing indexes flagged by performance advisor
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_booking_photos_cleaner_id ON public.booking_photos(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_pro_id ON public.portfolio_photos(pro_id);
