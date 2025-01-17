-- Drop existing storage policies
DROP POLICY IF EXISTS "logos_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "logos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "logos_delete_policy" ON storage.objects;

-- Create improved storage policies
CREATE POLICY "logos_read_policy"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "logos_insert_policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos' AND
    (auth.jwt() ->> 'role' = 'admin')
  );

CREATE POLICY "logos_delete_policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (auth.jwt() ->> 'role' = 'admin')
  );

-- Create policy for updating objects
CREATE POLICY "logos_update_policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos' AND
    (auth.jwt() ->> 'role' = 'admin')
  );