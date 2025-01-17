/*
  # Fix force contract renewal function

  1. Changes
    - Updates contract status to 'active' when forcing renewal
    - Updates payment status to 'pending'
    - Ensures vehicle status stays as 'rented'
*/

-- Drop existing function
DROP FUNCTION IF EXISTS force_contract_renewal(uuid);

-- Create improved function to force contract renewal
CREATE OR REPLACE FUNCTION force_contract_renewal(p_contract_id uuid)
RETURNS void AS $$
DECLARE
  v_contract record;
  v_start_date date;
  v_end_date date;
  v_due_date date;
  v_total_amount decimal(10,2);
  v_days integer;
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
  v_start_date := CURRENT_DATE;
  v_end_date := get_next_sunday(v_start_date);
  v_due_date := get_next_monday(v_end_date);
  
  -- Calculate days and total amount
  v_days := v_end_date - v_start_date + 1;
  v_total_amount := v_contract.daily_rate * v_days;

  -- Create renewal record
  INSERT INTO contract_renewals (
    contract_id,
    start_date,
    end_date,
    amount,
    payment_status,
    due_date,
    created_by
  ) VALUES (
    p_contract_id,
    v_start_date,
    v_end_date,
    v_total_amount,
    'pending',
    v_due_date,
    auth.uid()
  );

  -- Update contract with new dates and status
  UPDATE contracts
  SET
    start_date = v_start_date,
    end_date = v_end_date,
    due_date = v_due_date,
    total_amount = v_total_amount,
    payment_status = 'pending',
    status = 'active',
    updated_at = now()
  WHERE id = p_contract_id;

  -- Update vehicle status to ensure it stays as rented
  UPDATE vehicles
  SET status = 'rented'
  WHERE id = v_contract.vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;