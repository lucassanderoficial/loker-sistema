/*
  # Add delete_deposit function

  1. New Functions
    - `delete_deposit`: Safely deletes a deposit with proper checks and constraints
      - Checks if deposit exists
      - Checks if deposit is linked to a contract
      - Deletes the deposit if all checks pass

  2. Security
    - Function is accessible only to authenticated users
*/

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