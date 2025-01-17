/*
  # Fix contract deletion cascade

  1. Changes
    - Add ON DELETE CASCADE to financial_transactions foreign keys
    - Update contract deletion function to handle cleanup
*/

-- Drop existing foreign key constraints
ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_contract_id_fkey;

-- Re-add with CASCADE
ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_contract_id_fkey 
  FOREIGN KEY (contract_id) 
  REFERENCES contracts(id) 
  ON DELETE CASCADE;

-- Update delete_contract function to handle cleanup
CREATE OR REPLACE FUNCTION delete_contract(p_contract_id uuid)
RETURNS void AS $$
DECLARE
  v_contract record;
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  -- Update vehicle status to available
  UPDATE vehicles
  SET status = 'available'
  WHERE id = v_contract.vehicle_id;

  -- Delete contract (this will cascade to financial_transactions)
  DELETE FROM contracts
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;