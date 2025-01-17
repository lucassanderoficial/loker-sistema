/*
  # Fix permissions and add proper RLS policies

  1. Changes
    - Drop existing policies before recreating
    - Add proper permission checks for all operations
    - Add performance optimizations

  2. Security
    - Update RLS policies with proper checks
    - Add indexes for better performance
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON auth.users;
DROP POLICY IF EXISTS "Admins can view all users" ON auth.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON clients;
DROP POLICY IF EXISTS "Enable delete for admins only" ON clients;

-- Create new client policies with proper permissions
CREATE POLICY "Enable read access for authenticated users"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable update for authenticated users"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable delete for authenticated users"
  ON clients FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users((raw_user_meta_data->>'role'));
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

-- Update functions to use proper permission checks
CREATE OR REPLACE FUNCTION check_admin_permission()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;