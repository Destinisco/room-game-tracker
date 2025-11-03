-- Drop old background_url column and add front/back URLs
ALTER TABLE analysis_templates 
DROP COLUMN IF EXISTS background_url,
ADD COLUMN background_front_url TEXT,
ADD COLUMN background_back_url TEXT;

-- Create storage bucket for PDF backgrounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-backgrounds',
  'pdf-backgrounds',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for PDF backgrounds
CREATE POLICY "Anyone can view PDF backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdf-backgrounds');

CREATE POLICY "Authenticated users can upload PDF backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-backgrounds' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update their PDF backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pdf-backgrounds' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete PDF backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdf-backgrounds' 
  AND auth.role() = 'authenticated'
);