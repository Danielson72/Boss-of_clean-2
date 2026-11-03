-- DLD-689 S2 / S3 / S4: close messaging and hire-confirmation RLS holes.
--
-- S2  messages_update WITH CHECK accepted `reported_by = auth.uid()` with no
--     other limit, so a participant could move a message into another thread
--     or rewrite the other party's text.
-- S3  conversations_update let either party change customer_id / cleaner_id /
--     quote_request_id (hand a thread to someone else, or point it at a quote
--     the pro paid for elsewhere to switch off the contact filter).
-- S4  hire_confirmations INSERT only checked customer_id = auth.uid(), so a
--     pro could insert their own confirmation and pass the unlock gate.
--
-- Approach: keep the existing policies' USING clauses (who can touch a row)
-- and add BEFORE UPDATE guards that freeze identity columns for end users.
-- Service role, admins, and direct owner sessions are exempt (same detection
-- as guard_pro_approval_status, 20260910140000). The SECURITY DEFINER trigger
-- update_conversation_on_message only writes last_message_at / unread counts
-- / updated_at, which stay writable.
--
-- Review follow-up (DLD-703, F1-F3): reports are final once filed and can only
-- be filed by the recipient; read_at is set once, by the recipient; a party can
-- only lower its own unread counter.

BEGIN;

-- ─────────────────────────── messages (S2) ───────────────────────────
CREATE OR REPLACE FUNCTION public.guard_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.jwt() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (auth.jwt() ->> 'role') IS NOT DISTINCT FROM 'service_role'
     OR public.is_admin() IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id    IS DISTINCT FROM OLD.sender_id
     OR NEW.sender_role  IS DISTINCT FROM OLD.sender_role
     OR NEW.content      IS DISTINCT FROM OLD.content
     OR NEW.created_at   IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'permission denied: messages may only be marked read or reported'
      USING ERRCODE = '42501';
  END IF;

  -- F1: reports. A report is filed once, in the caller's own name, on a
  -- message the caller did not send, and is then final for end users (only
  -- service role / admins can clear it). Without this, the reported sender
  -- could null out reported_at / report_reason and hide the report.
  IF NEW.reported_at   IS DISTINCT FROM OLD.reported_at
     OR NEW.report_reason IS DISTINCT FROM OLD.report_reason
     OR NEW.reported_by   IS DISTINCT FROM OLD.reported_by THEN
    IF OLD.reported_at IS NOT NULL
       OR OLD.reported_by IS NOT NULL
       OR OLD.report_reason IS NOT NULL THEN
      RAISE EXCEPTION 'permission denied: a filed report cannot be changed'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.reported_at IS NULL
       OR NEW.reported_by IS DISTINCT FROM auth.uid()
       OR OLD.sender_id IS NOT DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'permission denied: reports must be filed by the recipient in their own name'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- F2: read receipts. read_at can only go from NULL to a value, and only
  -- the recipient (not the sender) can set it.
  IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
    IF OLD.read_at IS NOT NULL
       OR NEW.read_at IS NULL
       OR OLD.sender_id IS NOT DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'permission denied: only the recipient can mark a message read'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_message_update ON public.messages;
CREATE TRIGGER guard_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_update();

-- Belt and braces: the new row must still belong to a thread the caller is in.
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO public
  USING (
    EXISTS ( SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND ( c.customer_id = ( SELECT auth.uid() )
          OR EXISTS ( SELECT 1 FROM pros p
               WHERE p.id = c.cleaner_id AND p.user_id = ( SELECT auth.uid() ) ) ) )
  )
  WITH CHECK (
    EXISTS ( SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND ( c.customer_id = ( SELECT auth.uid() )
          OR EXISTS ( SELECT 1 FROM pros p
               WHERE p.id = c.cleaner_id AND p.user_id = ( SELECT auth.uid() ) ) ) )
  );

-- ───────────────────────── conversations (S3) ─────────────────────────
CREATE OR REPLACE FUNCTION public.guard_conversation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.jwt() IS NULL AND session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF (auth.jwt() ->> 'role') IS NOT DISTINCT FROM 'service_role'
     OR public.is_admin() IS TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id      IS DISTINCT FROM OLD.customer_id
     OR NEW.cleaner_id       IS DISTINCT FROM OLD.cleaner_id
     OR NEW.quote_request_id IS DISTINCT FROM OLD.quote_request_id
     OR NEW.created_at       IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'permission denied: conversation participants and quote link are fixed'
      USING ERRCODE = '42501';
  END IF;

  -- F3: unread counters. Increases stay allowed (update_conversation_on_message
  -- runs under the sender's JWT). Each party may only lower its OWN counter:
  -- the customer owns customer_unread_count, the pro owns cleaner_unread_count.
  IF NEW.cleaner_unread_count < OLD.cleaner_unread_count
     AND NOT EXISTS ( SELECT 1 FROM public.pros p
           WHERE p.id = OLD.cleaner_id AND p.user_id = auth.uid() ) THEN
    RAISE EXCEPTION 'permission denied: only the pro can clear the pro unread count'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.customer_unread_count < OLD.customer_unread_count
     AND OLD.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: only the customer can clear the customer unread count'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_conversation_update ON public.conversations;
CREATE TRIGGER guard_conversation_update
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversation_update();

-- ─────────────────────── hire_confirmations (S4) ───────────────────────
-- Only the quote's own customer may confirm, and only for the pro on that quote.
DROP POLICY IF EXISTS "Customers can create hire confirmations" ON public.hire_confirmations;
CREATE POLICY "Customers can create hire confirmations" ON public.hire_confirmations
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = ( SELECT auth.uid() )
    AND EXISTS ( SELECT 1 FROM quote_requests q
      WHERE q.id = hire_confirmations.quote_request_id
        AND q.customer_id = ( SELECT auth.uid() )
        AND q.cleaner_id = hire_confirmations.cleaner_id )
  );

-- Trigger functions run via triggers only; nobody should call them directly.
REVOKE EXECUTE ON FUNCTION public.guard_message_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_conversation_update() FROM PUBLIC, anon, authenticated;

COMMIT;
