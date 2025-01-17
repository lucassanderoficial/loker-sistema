/*
  # Fix contract deletion cascade

  1. Changes
    - Adds ON DELETE CASCADE to contract_deposit_id foreign key
    - Updates contract deletion function to handle dependencies properly
*/

-- First remove the existing foreign key
ALTER TABLE contracts 
  DROP CONSTRAINT IF EXISTS contracts_deposit_id_fkey;

-- Re-add with CASCADE
ALTER TABLE contracts
  ADD CONSTRAINT contracts_deposit_id_fkey 
  FOREIGN KEY (deposit_id) 
  REFERENCES deposits(id) 
  ON DELETE CASCADE;

-- Create improved function to handle contract deletion
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

  -- Delete contract (this will cascade to delete the deposit)
  DELETE FROM contracts
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;