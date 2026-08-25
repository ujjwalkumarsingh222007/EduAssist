-- =================================================================
-- MIGRATION: Add profile_data JSONB to public.profiles
-- =================================================================
-- This adds the flexible profile_data JSONB column to public.profiles
-- to persist all user-confirmed dynamic fields extracted by AI
-- (Personal, Family, Identity, Education, Academic Results, Certificates, Eligibility)
-- without requiring rigid columns for every single document type.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS update policy covers the new column
-- (Existing policies on public.profiles already apply to the whole row)

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
