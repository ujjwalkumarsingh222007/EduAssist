-- =================================================================
-- APPLICATION FORMS TABLE & ROW LEVEL SECURITY
-- =================================================================
CREATE TABLE IF NOT EXISTS public.application_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  application_name TEXT NOT NULL,
  form_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.application_forms ENABLE ROW LEVEL SECURITY;

-- 1. Select Policy
DROP POLICY IF EXISTS "Users can view their own application forms" ON public.application_forms;
CREATE POLICY "Users can view their own application forms"
  ON public.application_forms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Insert Policy
DROP POLICY IF EXISTS "Users can insert their own application forms" ON public.application_forms;
CREATE POLICY "Users can insert their own application forms"
  ON public.application_forms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Update Policy
DROP POLICY IF EXISTS "Users can update their own application forms" ON public.application_forms;
CREATE POLICY "Users can update their own application forms"
  ON public.application_forms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Delete Policy
DROP POLICY IF EXISTS "Users can delete their own application forms" ON public.application_forms;
CREATE POLICY "Users can delete their own application forms"
  ON public.application_forms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
