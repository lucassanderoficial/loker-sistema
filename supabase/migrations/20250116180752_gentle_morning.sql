/*
  # Fix delete deposits function

  1. Changes
    - Remove unnecessary SELECT statement
    - Improve error handling
    - Add better transaction support

  2. Security
    - Maintain SECURITY DEFINER to ensure proper permissions
    - Add validation to prevent orphaned data
*/

-- Drop existing function
DROP FUNCTION IF EXISTS delete_deposits_for_client(uuid);

-- Create improved function to delete all deposits for a client
CREATE OR REPLACE FUNCTION delete_deposits_for_client(p_client_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if client exists
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  -- Delete all deposits for the client that are not linked to contracts
  DELETE FROM deposits d
  WHERE d.client_id = p_client_id
  AND NOT EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE c.deposit_id = d.id
    AND c.status != 'cancelled'
  );

  -- Raise notice about successful deletion
  RAISE NOTICE 'Cauções do cliente removidas com sucesso.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;