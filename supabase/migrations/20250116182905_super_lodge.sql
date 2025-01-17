-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for own user" ON auth.users;
DROP POLICY IF EXISTS "Enable read access for admins" ON auth.users;
DROP POLICY IF EXISTS "Enable delete access for admins" ON auth.users;

-- Create simplified policies for auth.users
CREATE POLICY "Enable read access for authenticated users"
  ON auth.users FOR SELECT
  TO authenticated
  USING (true);

-- Update client policies to avoid recursion
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for admins" ON clients;
DROP POLICY IF EXISTS "Enable update for admins" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins" ON clients;

CREATE POLICY "Enable read access for all authenticated"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admins"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable update for admins"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable delete for admins"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users((raw_user_meta_data->>'role'));
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);