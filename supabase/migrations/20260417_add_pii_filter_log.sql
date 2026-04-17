-- DLD-224: Create pii_filter_log table to track contact-sharing bypass attempts
-- in chat before lead is unlocked.

CREATE TABLE IF NOT EXISTS public.pii_filter_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_content text NOT NULL,
  matched_pattern text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pii_filter_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pii_filter_log" ON public.pii_filter_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view pii_filter_log" ON public.pii_filter_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (select auth.uid()) AND users.role = 'admin'::user_role
  ));

CREATE INDEX IF NOT EXISTS idx_pii_filter_log_conversation_id ON public.pii_filter_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pii_filter_log_sender_id ON public.pii_filter_log(sender_id);
CREATE INDEX IF NOT EXISTS idx_pii_filter_log_created_at ON public.pii_filter_log(created_at DESC);
