-- =============================================
-- MESSAGING SYSTEM
-- Enables communication between customers and cleaners
-- =============================================

-- Conversations table (links customer to cleaner)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  customer_unread_count INTEGER DEFAULT 0,
  cleaner_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, cleaner_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('customer', 'cleaner')),
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_cleaner_id ON public.conversations(cleaner_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Customers can view their own conversations
CREATE POLICY "Customers can view their own conversations" ON public.conversations
  FOR SELECT USING (customer_id = auth.uid());

-- Cleaners can view conversations for their business
CREATE POLICY "Cleaners can view their conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = conversations.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- Customers can create conversations with cleaners
CREATE POLICY "Customers can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND customer_id = auth.uid()
  );

-- Allow updating unread counts (for both parties)
CREATE POLICY "Participants can update conversations" ON public.conversations
  FOR UPDATE USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = conversations.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for messages

-- Customers can view messages in their conversations
CREATE POLICY "Customers can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.customer_id = auth.uid()
    )
  );

-- Cleaners can view messages in their conversations
CREATE POLICY "Cleaners can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.cleaners cl ON cl.id = c.cleaner_id
      WHERE c.id = messages.conversation_id AND cl.user_id = auth.uid()
    )
  );

-- Customers can send messages in their conversations
CREATE POLICY "Customers can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.customer_id = auth.uid()
    )
  );

-- Cleaners can send messages in their conversations
CREATE POLICY "Cleaners can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'cleaner'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.cleaners cl ON cl.id = c.cleaner_id
      WHERE c.id = messages.conversation_id AND cl.user_id = auth.uid()
    )
  );

-- Allow updating read_at (marking as read)
CREATE POLICY "Recipients can mark messages as read" ON public.messages
  FOR UPDATE USING (
    -- Only allow marking as read for messages you received (not sent)
    sender_id != auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id AND c.customer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        JOIN public.cleaners cl ON cl.id = c.cleaner_id
        WHERE c.id = messages.conversation_id AND cl.user_id = auth.uid()
      )
    )
  );

-- Function to update conversation metadata when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  conv_record RECORD;
  cleaner_user_id UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO conv_record FROM public.conversations WHERE id = NEW.conversation_id;

  -- Get the cleaner's user_id
  SELECT user_id INTO cleaner_user_id FROM public.cleaners WHERE id = conv_record.cleaner_id;

  -- Update last_message_at and increment appropriate unread count
  IF NEW.sender_role = 'customer' THEN
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      cleaner_unread_count = cleaner_unread_count + 1,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.conversations
    SET
      last_message_at = NEW.created_at,
      customer_unread_count = customer_unread_count + 1,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new messages
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Enable Realtime for messages (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
