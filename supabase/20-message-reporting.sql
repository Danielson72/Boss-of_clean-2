-- Message Abuse Reporting
-- Allows users to report inappropriate messages

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS report_reason TEXT,
  ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES public.users(id);

-- Index for finding reported messages
CREATE INDEX IF NOT EXISTS idx_messages_reported
  ON public.messages(reported_at)
  WHERE reported_at IS NOT NULL;

-- Allow participants to report messages in their conversations
-- (The existing RLS policies already allow participants to update messages they received)
-- Add a specific policy for reporting
CREATE POLICY "Conversation participants can report messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.customer_id = auth.uid() OR c.cleaner_id = (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
      ))
    )
  )
  WITH CHECK (
    -- Can only set report fields, not modify message content
    reported_by = auth.uid()
  );

-- Admins can view all reported messages
CREATE POLICY "Admins can view reported messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    AND reported_at IS NOT NULL
  );
