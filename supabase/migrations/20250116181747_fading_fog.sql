/*
  # Fix user permissions and RLS policies

  1. Changes
    - Drop existing policies
    - Create proper RLS policies for auth.users
    - Update client policies
    - Add proper indexes

  2. Security
    - Enable proper access control for auth.users
    - Ensure admins can manage users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON auth.users;
DROP POLICY IF EXISTS "Admins can view all users" ON auth.users;

-- Create proper policies for auth.users
CREATE POLICY "Enable read access for own user"
  ON auth.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable read access for admins"
  ON auth.users FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable delete access for admins"
  ON auth.users FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Update client policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON clients;

CREATE POLICY "Enable read access for authenticated users"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admins"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable update for admins"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Enable delete for admins"
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