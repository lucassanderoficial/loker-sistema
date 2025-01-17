/*
  # Fix Storage Policies for System Settings

  1. Changes
    - Drop existing policies
    - Create new storage bucket policies
    - Create new storage object policies
    - Add proper admin role checks
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "buckets_read_policy" ON storage.buckets;
DROP POLICY IF EXISTS "buckets_insert_policy" ON storage.buckets;
DROP POLICY IF EXISTS "objects_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "objects_delete_policy" ON storage.objects;

-- Create bucket policies
CREATE POLICY "buckets_read_policy"
  ON storage.buckets FOR SELECT
  TO public
  USING (name = 'logos');

CREATE POLICY "buckets_insert_policy"
  ON storage.buckets FOR INSERT
  TO authenticated
  WITH CHECK (
    name = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create object policies
CREATE POLICY "objects_read_policy"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

CREATE POLICY "objects_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "objects_update_policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "objects_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );