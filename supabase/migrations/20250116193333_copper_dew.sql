/*
  # Contract Renewal and History Fix

  1. Changes
    - Add contract history view with proper fields
    - Update force_contract_renewal function to handle weekly periods correctly
    - Fix payment history tracking
*/

-- Drop existing view if exists
DROP VIEW IF EXISTS contract_history;

-- Create improved view for contract history
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

-- Drop existing function
DROP FUNCTION IF EXISTS force_contract_renewal(uuid);

-- Create improved function for contract renewal
CREATE OR REPLACE FUNCTION force_contract_renewal(p_contract_id uuid)
RETURNS void AS $$
DECLARE
  v_contract record;
  v_start_date date;
  v_end_date date;
  v_due_date date;
  v_total_amount decimal(10,2);
BEGIN
  -- Get contract details
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = p_contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  IF v_contract.status != 'active' THEN
    RAISE EXCEPTION 'Apenas contratos ativos podem ser renovados';
  END IF;

  IF NOT v_contract.auto_renew THEN
    RAISE EXCEPTION 'Este contrato não possui auto renovação ativada';
  END IF;

  -- Calculate new dates
  -- Start date is today
  v_start_date := CURRENT_DATE;
  -- End date is next Sunday
  v_end_date := get_next_sunday(v_start_date);
  -- Due date is next Monday after end date
  v_due_date := get_next_monday(v_end_date);
  
  -- Calculate total amount (7 days fixed period)
  v_total_amount := v_contract.daily_rate * 7;

  -- Record current period in history before updating
  INSERT INTO contract_payments (
    contract_id,
    amount,
    payment_date,
    payment_method,
    period_start,
    period_end,
    created_by
  ) VALUES (
    p_contract_id,
    v_total_amount,
    NULL, -- Payment date will be set when paid
    'pending',
    v_start_date,
    v_end_date,
    auth.uid()
  );

  -- Update contract with new period
  UPDATE contracts
  SET
    start_date = v_start_date,
    end_date = v_end_date,
    due_date = v_due_date,
    total_amount = v_total_amount,
    payment_status = 'pending',
    payment_date = NULL,
    status = 'active',
    updated_at = now()
  WHERE id = p_contract_id;

  -- Ensure vehicle stays marked as rented
  UPDATE vehicles
  SET status = 'rented'
  WHERE id = v_contract.vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;