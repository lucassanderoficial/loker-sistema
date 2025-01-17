/*
  # Fix permissions and add archiving functionality

  1. Changes
    - Add RLS policies for auth.users table
    - Update deposit archiving functions with proper permissions
    - Add indexes for better performance

  2. Security
    - Enable RLS on auth.users
    - Add policies for user management
*/

-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policies for auth.users
CREATE POLICY "Users can view their own data"
  ON auth.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON auth.users
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Drop and recreate archive_deposit function with proper permissions
DROP FUNCTION IF EXISTS archive_deposit(uuid);
CREATE OR REPLACE FUNCTION archive_deposit(p_deposit_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if deposit exists and user has permission
  IF NOT EXISTS (
    SELECT 1 
    FROM deposits d
    WHERE d.id = p_deposit_id
    AND (
      d.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 
        FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND u.raw_user_meta_data->>'role' = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Caução não encontrada ou permissão negada.';
  END IF;

  -- Check if deposit is linked to an active contract
  IF EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE c.deposit_id = p_deposit_id
    AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Não é possível arquivar uma caução vinculada a um contrato ativo.';
  END IF;

  -- Archive the deposit
  UPDATE deposits
  SET 
    archived = true,
    updated_at = now()
  WHERE id = p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate restore_deposit function with proper permissions
DROP FUNCTION IF EXISTS restore_deposit(uuid);
CREATE OR REPLACE FUNCTION restore_deposit(p_deposit_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if deposit exists and user has permission
  IF NOT EXISTS (
    SELECT 1 
    FROM deposits d
    WHERE d.id = p_deposit_id
    AND (
      d.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 
        FROM auth.users u 
        WHERE u.id = auth.uid() 
        AND u.raw_user_meta_data->>'role' = 'admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Caução não encontrada ou permissão negada.';
  END IF;

  -- Restore the deposit
  UPDATE deposits
  SET 
    archived = false,
    updated_at = now()
  WHERE id = p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deposits_archived ON deposits(archived);
CREATE INDEX IF NOT EXISTS idx_deposits_client_id ON deposits(client_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created_by ON deposits(created_by);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users((raw_user_meta_data->>'role'));