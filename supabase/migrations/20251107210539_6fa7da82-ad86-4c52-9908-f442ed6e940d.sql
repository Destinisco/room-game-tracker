-- Add czech_name and english_name columns to role_templates table
ALTER TABLE public.role_templates 
ADD COLUMN IF NOT EXISTS czech_name TEXT,
ADD COLUMN IF NOT EXISTS english_name TEXT;

-- Migrate existing data: copy name to czech_name for backward compatibility
UPDATE public.role_templates 
SET czech_name = name 
WHERE czech_name IS NULL;