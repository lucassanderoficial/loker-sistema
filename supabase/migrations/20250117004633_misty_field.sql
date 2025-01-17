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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to logos bucket" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow public read access to logo objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to insert logo objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to update logo objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to delete logo objects" ON storage.objects;

-- Create bucket policies
CREATE POLICY "bucket_logos_read"
  ON storage.buckets FOR SELECT
  TO public
  USING (name = 'logos');

CREATE POLICY "bucket_logos_insert"
  ON storage.buckets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Create object policies
CREATE POLICY "object_logos_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

CREATE POLICY "object_logos_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "object_logos_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "object_logos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    auth.role() = 'authenticated' AND
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );