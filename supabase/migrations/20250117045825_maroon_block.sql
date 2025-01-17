-- Drop existing view if exists
DROP VIEW IF EXISTS contract_history;

-- Add ON DELETE CASCADE to financial_transactions foreign key
ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_contract_id_fkey;

ALTER TABLE financial_transactions
  ADD CONSTRAINT financial_transactions_contract_id_fkey 
  FOREIGN KEY (contract_id) 
  REFERENCES contracts(id) 
  ON DELETE CASCADE;

-- Create view for contract history
CREATE VIEW contract_history AS
SELECT 
  cp.id,
  cp.contract_id,
  cp.amount,
  cp.payment_date,
  cp.payment_method,
  cp.period_start,
  cp.period_end,
  cp.created_at,
  c.start_date,
  c.end_date,
  c.status,
  c.payment_status,
  c.auto_renew
FROM contract_payments cp
JOIN contracts c ON c.id = cp.contract_id;

-- Create function to handle contract deletion
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

  -- Delete contract (this will cascade to delete related records)
  DELETE FROM contracts
  WHERE id = p_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;