/*
  # Fix User Permissions

  1. Changes
    - Simplify auth.users policies to avoid recursion
    - Update client policies to use EXISTS instead of IN
    - Add proper indexes for performance
    - Add proper RLS policies for deposits table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON auth.users;

-- Create simplified policies for auth.users
CREATE POLICY "Enable read access for own data"
  ON auth.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Update client policies
DROP POLICY IF EXISTS "Enable read access for all authenticated" ON clients;
DROP POLICY IF EXISTS "Enable insert for admins" ON clients;
DROP POLICY IF EXISTS "Enable update for admins" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins" ON clients;

CREATE POLICY "Enable read access for authenticated users"
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

-- Add RLS policies for deposits
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON deposits;

CREATE POLICY "Enable read access for authenticated users"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable update for authenticated users"
  ON deposits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable delete for authenticated users"
  ON deposits FOR DELETE
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
CREATE INDEX IF NOT EXISTS idx_deposits_client_id ON deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created_by ON deposits(created_by);