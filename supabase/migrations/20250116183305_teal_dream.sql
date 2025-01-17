/*
  # Fix Policy Conflicts

  1. Changes
    - Drop all existing policies first
    - Create new policies with unique names
    - Maintain proper role-based access control
    - Add performance indexes
*/

-- Drop all existing policies first
DROP POLICY IF EXISTS "Enable read access for users" ON auth.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for admins" ON clients;
DROP POLICY IF EXISTS "Enable update for admins" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins" ON clients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON deposits;
DROP POLICY IF EXISTS "Enable insert for admins" ON deposits;
DROP POLICY IF EXISTS "Enable update for admins" ON deposits;
DROP POLICY IF EXISTS "Enable delete for admins" ON deposits;

-- Create new auth.users policies with unique names
CREATE POLICY "auth_users_read_access"
  ON auth.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    raw_user_meta_data->>'role' = 'admin'
  );

-- Create new client policies with unique names
CREATE POLICY "clients_read_access"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "clients_insert_admin"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "clients_update_admin"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Create new deposit policies with unique names
CREATE POLICY "deposits_read_access"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "deposits_insert_admin"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "deposits_update_admin"
  ON deposits FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "deposits_delete_admin"
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