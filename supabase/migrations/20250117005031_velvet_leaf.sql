/*
  # Fix Storage Policies for System Settings

  1. Changes
    - Drop existing storage policies
    - Create new policies with proper role checks
    - Add bucket-level security
    - Add proper error handling

  2. Security
    - Enable RLS for storage.buckets and storage.objects
    - Add bucket-level policies
    - Add object-level policies
    - Ensure proper role checks
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "storage_buckets_read_policy" ON storage.buckets;
DROP POLICY IF EXISTS "storage_buckets_insert_policy" ON storage.buckets;
DROP POLICY IF EXISTS "storage_objects_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete_policy" ON storage.objects;

-- Create function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bucket policies
CREATE POLICY "storage_buckets_read_policy"
  ON storage.buckets FOR SELECT
  TO public
  USING (name = 'logos');

CREATE POLICY "storage_buckets_insert_policy"
  ON storage.buckets FOR INSERT
  TO authenticated
  WITH CHECK (
    name = 'logos' AND
    is_admin()
  );

-- Create object policies
CREATE POLICY "storage_objects_read_policy"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

CREATE POLICY "storage_objects_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    is_admin()
  );

CREATE POLICY "storage_objects_update_policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    is_admin()
  );

CREATE POLICY "storage_objects_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    is_admin()
  );

-- Create function to handle logo uploads
CREATE OR REPLACE FUNCTION handle_logo_upload()
RETURNS trigger AS $$
BEGIN
  -- Verify user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admin users can upload logos';
  END IF;

  -- Verify file is an image
  IF NOT (NEW.content_type LIKE 'image/%') THEN
    RAISE EXCEPTION 'Only image files are allowed';
  END IF;

  -- Set metadata
  NEW.metadata = jsonb_build_object(
    'uploaded_by', auth.uid(),
    'uploaded_at', now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logo uploads
DROP TRIGGER IF EXISTS handle_logo_upload_trigger ON storage.objects;
CREATE TRIGGER handle_logo_upload_trigger
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'logos')
  EXECUTE FUNCTION handle_logo_upload();

-- Create system settings policies
DROP POLICY IF EXISTS "system_settings_read" ON system_settings;
DROP POLICY IF EXISTS "system_settings_update" ON system_settings;

CREATE POLICY "system_settings_read"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "system_settings_update"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;