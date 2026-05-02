-- DLD-224: PII filter — conversations.quote_request_id + pii_filter_log table

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS quote_request_id UUID REFERENCES public.quote_requests(id);

CREATE INDEX IF NOT EXISTS conversations_quote_request_id_idx
  ON public.conversations(quote_request_id)
  WHERE quote_request_id IS NOT NULL;

-- Audit log for blocked PII attempts (content hash only, never plain text)
CREATE TABLE IF NOT EXISTS public.pii_filter_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id),
  sender_id       UUID NOT NULL REFERENCES public.users(id),
  sender_role     TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  pattern_hit     TEXT NOT NULL,
  is_unlocked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pii_filter_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read pii_filter_log"
  ON public.pii_filter_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS pii_filter_log_conversation_idx ON public.pii_filter_log(conversation_id);
CREATE INDEX IF NOT EXISTS pii_filter_log_sender_idx ON public.pii_filter_log(sender_id);
CREATE INDEX IF NOT EXISTS pii_filter_log_created_idx ON public.pii_filter_log(created_at DESC);
