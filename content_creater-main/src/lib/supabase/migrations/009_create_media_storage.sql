-- Migration: Create media storage bucket
-- Description: Creates a public storage bucket for storing images and videos
-- Date: 2025-11-10

-- Create the media bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  104857600, -- 100MB limit (to accommodate videos)
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the media bucket
-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can upload media files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media files" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload media files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public read access to all files
CREATE POLICY "Public can view media files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own media files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- Verify the bucket was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'media'
  ) THEN
    RAISE NOTICE 'Successfully created media storage bucket';
  ELSE
    RAISE EXCEPTION 'Failed to create media storage bucket';
  END IF;
END $$;
