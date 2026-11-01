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

  -- A report can only be filed in the caller's own name.
  IF NEW.reported_by IS DISTINCT FROM OLD.reported_by
     AND NEW.reported_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission denied: reported_by must be the current user'
      USING ERRCODE = '42501';
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
