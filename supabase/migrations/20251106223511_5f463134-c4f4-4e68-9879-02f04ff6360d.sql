-- Update pdf-backgrounds bucket to allow image uploads
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
WHERE id = 'pdf-backgrounds';

-- Update file_size_limit to 5MB (5242880 bytes) for images
UPDATE storage.buckets 
SET file_size_limit = 5242880
WHERE id = 'pdf-backgrounds';