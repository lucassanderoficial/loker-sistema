/*
  # Update clients table RLS policies

  1. Security Changes
    - Fix RLS policies for client management
    - Allow authenticated users to create clients
    - Allow admins to manage all clients
    - Allow users to manage their own data

  2. Notes
    - Removes admin-only restrictions for basic operations
    - Maintains data integrity and security
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can create clients" ON clients;
DROP POLICY IF EXISTS "Admins and owners can update clients" ON clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    ) 
    OR auth.uid() = user_id
  );

CREATE POLICY "Enable delete for admins only"
  ON clients FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users 
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );