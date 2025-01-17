/*
  # Fix User Policies

  1. Changes
    - Remove recursive policies on auth.users
    - Simplify admin checks to avoid recursion
    - Update client policies to use direct role checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for own data" ON auth.users;

-- Create simplified policy for auth.users
CREATE POLICY "Enable read access for users"
  ON auth.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    raw_user_meta_data->>'role' = 'admin'
  );

-- Update client policies to avoid recursion
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
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
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable update for admins"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable delete for admins"
  ON clients FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Update deposit policies to avoid recursion
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON deposits;

CREATE POLICY "Enable read access for authenticated users"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admins"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable update for admins"
  ON deposits FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Enable delete for admins"
  ON deposits FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users((raw_user_meta_data->>'role'));
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_client_id ON deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created_by ON deposits(created_by);