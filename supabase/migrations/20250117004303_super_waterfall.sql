/*
  # Fix Storage Policies for Logo Management

  1. Changes
    - Drop existing storage policies
    - Create new policies with proper role checks
    - Add bucket-level security
    - Add proper error handling

  2. Security
    - Enable RLS for storage.buckets
    - Add bucket-level policies
    - Add object-level policies
    - Ensure proper role checks
*/

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create bucket policies
CREATE POLICY "Allow public read access to logos bucket"
  ON storage.buckets FOR SELECT
  TO public
  USING (name = 'logos');

CREATE POLICY "Allow authenticated users to create buckets"
  ON storage.buckets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Drop existing object policies
DROP POLICY IF EXISTS "logos_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "logos_update_policy" ON storage.objects;

-- Create improved object policies
CREATE POLICY "Allow public read access to logo objects"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

CREATE POLICY "Allow admin users to insert logo objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow admin users to update logo objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Allow admin users to delete logo objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );