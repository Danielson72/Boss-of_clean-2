-- =============================================
-- TASK-003: CLEANER ONBOARDING WIZARD
-- Adds onboarding progress tracking and document uploads
-- =============================================

-- Add onboarding fields to cleaners table
ALTER TABLE public.cleaners ADD COLUMN IF NOT EXISTS
  onboarding_step INTEGER DEFAULT 1;

ALTER TABLE public.cleaners ADD COLUMN IF NOT EXISTS
  onboarding_completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.cleaners ADD COLUMN IF NOT EXISTS
  onboarding_data JSONB DEFAULT '{}';

-- Create document uploads table
CREATE TABLE IF NOT EXISTS public.cleaner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('license', 'insurance', 'background_check', 'certification', 'other')),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for cleaner_documents
CREATE INDEX IF NOT EXISTS idx_cleaner_documents_cleaner_id ON public.cleaner_documents(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_documents_type ON public.cleaner_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_cleaner_documents_status ON public.cleaner_documents(verification_status);

-- Enable RLS on cleaner_documents
ALTER TABLE public.cleaner_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cleaner_documents
CREATE POLICY "Cleaners can view their own documents" ON public.cleaner_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_documents.cleaner_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can insert their own documents" ON public.cleaner_documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_documents.cleaner_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can update their own documents" ON public.cleaner_documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_documents.cleaner_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can delete their own documents" ON public.cleaner_documents
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_documents.cleaner_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all documents" ON public.cleaner_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create storage bucket for cleaner documents (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cleaner-documents', 'cleaner-documents', false);

-- Function to update cleaner onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
  p_cleaner_id UUID,
  p_step INTEGER,
  p_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cleaners
  SET
    onboarding_step = p_step,
    onboarding_data = COALESCE(onboarding_data, '{}') || COALESCE(p_data, '{}'),
    updated_at = NOW()
  WHERE id = p_cleaner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(p_cleaner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.cleaners
  SET
    onboarding_step = 5,
    onboarding_completed_at = NOW(),
    approval_status = 'pending',
    updated_at = NOW()
  WHERE id = p_cleaner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for onboarding step queries
CREATE INDEX IF NOT EXISTS idx_cleaners_onboarding_step ON public.cleaners(onboarding_step);
CREATE INDEX IF NOT EXISTS idx_cleaners_onboarding_completed ON public.cleaners(onboarding_completed_at);

-- Completion message
SELECT 'Onboarding wizard schema migration complete!' as status;
