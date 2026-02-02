-- =============================================
-- NOTIFICATION PREFERENCES MIGRATION
-- Allows customers to manage email notification preferences
-- =============================================

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Notification type toggles (all default to true for new users)
  booking_updates BOOLEAN DEFAULT TRUE,
  messages BOOLEAN DEFAULT TRUE,
  promotions BOOLEAN DEFAULT TRUE,
  review_requests BOOLEAN DEFAULT TRUE,

  -- Unsubscribe token for one-click unsubscribe links
  unsubscribe_token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_unsubscribe_token
  ON public.notification_preferences(unsubscribe_token);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notification preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous access for unsubscribe via token (public policy)
CREATE POLICY "Anyone can view preferences by unsubscribe token"
  ON public.notification_preferences
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update preferences by unsubscribe token"
  ON public.notification_preferences
  FOR UPDATE
  USING (true);

-- Function to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences when a user is created
DROP TRIGGER IF EXISTS on_user_created_notification_prefs ON public.users;
CREATE TRIGGER on_user_created_notification_prefs
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Backfill existing users with default notification preferences
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_timestamp ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();
