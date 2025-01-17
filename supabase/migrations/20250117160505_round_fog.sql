-- Drop existing policies if they exist
DROP POLICY IF EXISTS "vehicles_read" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

-- Create new policies with public read access
CREATE POLICY "vehicles_read"
  ON vehicles FOR SELECT
  TO public
  USING (status = 'available');

CREATE POLICY "vehicles_insert"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "vehicles_update"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "vehicles_delete"
  ON vehicles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create policy for public access to system settings
DROP POLICY IF EXISTS "system_settings_read" ON system_settings;

CREATE POLICY "system_settings_read"
  ON system_settings FOR SELECT
  TO public
  USING (true);