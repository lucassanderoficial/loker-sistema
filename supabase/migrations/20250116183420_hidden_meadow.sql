/*
  # Fix Permissions and Policies

  1. Changes
    - Drop all existing policies
    - Create new simplified policies with proper role checks
    - Add proper indexes for performance
    - Fix recursion issues in policy checks
*/

-- Drop all existing policies first
DROP POLICY IF EXISTS "auth_users_read_access" ON auth.users;
DROP POLICY IF EXISTS "clients_read_access" ON clients;
DROP POLICY IF EXISTS "clients_insert_admin" ON clients;
DROP POLICY IF EXISTS "clients_update_admin" ON clients;
DROP POLICY IF EXISTS "clients_delete_admin" ON clients;
DROP POLICY IF EXISTS "deposits_read_access" ON deposits;
DROP POLICY IF EXISTS "deposits_insert_admin" ON deposits;
DROP POLICY IF EXISTS "deposits_update_admin" ON deposits;
DROP POLICY IF EXISTS "deposits_delete_admin" ON deposits;

-- Create function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT raw_user_meta_data->>'role' = 'admin' FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new auth.users policies
CREATE POLICY "users_read_own_or_admin"
  ON auth.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    is_admin()
  );

-- Create new client policies
CREATE POLICY "clients_read_all"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "clients_insert_admin"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "clients_update_admin"
  ON clients FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create new deposit policies
CREATE POLICY "deposits_read_all"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "deposits_insert_admin"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "deposits_update_admin"
  ON deposits FOR UPDATE
  TO authenticated
  USING (is_admin());

CREATE POLICY "deposits_delete_admin"
  ON deposits FOR DELETE
  TO authenticated
  USING (is_admin());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users((raw_user_meta_data->>'role'));
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_client_id ON deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created_by ON deposits(created_by);
CREATE INDEX IF NOT EXISTS idx_deposits_archived ON deposits(archived);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;