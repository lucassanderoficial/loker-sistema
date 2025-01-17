/*
  # Fix Contract Deletion

  1. Changes
    - Update delete_contract function to properly handle vehicle status
    - Add trigger to handle vehicle status on contract deletion
*/

-- Create function to handle vehicle status on contract deletion
CREATE OR REPLACE FUNCTION handle_contract_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle status to available
  UPDATE vehicles
  SET status = 'available'
  WHERE id = OLD.vehicle_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contract deletion
DROP TRIGGER IF EXISTS handle_contract_deletion_trigger ON contracts;
CREATE TRIGGER handle_contract_deletion_trigger
  BEFORE DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION handle_contract_deletion();

-- Update delete_contract function
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

  -- Delete contract (trigger will handle vehicle status update)
  DELETE FROM contracts
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;