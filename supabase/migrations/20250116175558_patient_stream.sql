/*
  # Fix delete_deposit function

  1. Changes
    - Drop existing function first
    - Recreate function with proper parameter name
    - Keep all existing functionality and checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS delete_deposit(uuid);

-- Create function to safely delete deposits
CREATE OR REPLACE FUNCTION delete_deposit(deposit_id uuid)
RETURNS void AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  -- Check if deposit exists
  IF NOT EXISTS (SELECT 1 FROM deposits WHERE id = deposit_id) THEN
    RAISE EXCEPTION 'Caução não encontrada.';
  END IF;

  -- Check if deposit is linked to a contract
  SELECT id INTO v_contract_id
  FROM contracts
  WHERE deposit_id = deposit_id;

  IF v_contract_id IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível excluir uma caução vinculada a um contrato.';
  END IF;

  -- Delete the deposit
  DELETE FROM deposits WHERE id = deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;