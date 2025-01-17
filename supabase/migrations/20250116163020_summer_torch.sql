/*
  # Add client authentication

  1. Changes
    - Add user_id column to clients table
    - Add foreign key constraint with cascade delete
    - Update RLS policies to include user-specific access

  2. Security
    - Ensure clients can only access their own data
    - Maintain admin access to all client data
*/

-- Add user_id column to clients table
ALTER TABLE clients
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for better security
DROP POLICY IF EXISTS "Users can view all clients" ON clients;
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can create clients" ON clients;
CREATE POLICY "Admins can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Users can update clients" ON clients;
CREATE POLICY "Admins and owners can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete clients" ON clients;
CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');