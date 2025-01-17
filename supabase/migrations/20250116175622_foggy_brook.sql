/*
  # Fix delete_deposit function

  1. Changes
    - Rename parameter to p_deposit_id to avoid ambiguity
    - Update references to use table aliases
    - Keep all existing functionality and checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS delete_deposit(uuid);

-- Create function to safely delete deposits
CREATE OR REPLACE FUNCTION delete_deposit(p_deposit_id uuid)
RETURNS void AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  -- Check if deposit exists
  IF NOT EXISTS (SELECT 1 FROM deposits d WHERE d.id = p_deposit_id) THEN
    RAISE EXCEPTION 'Caução não encontrada.';
  END IF;

  -- Check if deposit is linked to a contract
  SELECT c.id INTO v_contract_id
  FROM contracts c
  WHERE c.deposit_id = p_deposit_id;

  IF v_contract_id IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível excluir uma caução vinculada a um contrato.';
  END IF;

  -- Delete the deposit
  DELETE FROM deposits d WHERE d.id = p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;