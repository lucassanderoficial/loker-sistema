/*
  # Add force contract renewal function

  1. New Functions
    - `force_contract_renewal`: Forces immediate renewal of a contract
    - `get_next_sunday`: Helper function to calculate next Sunday
    - `get_next_monday`: Helper function to calculate next Monday

  2. Changes
    - Adds support for manual contract renewal
    - Calculates new dates and amounts
    - Updates contract status and payment info
*/

-- Helper function to get next Sunday
CREATE OR REPLACE FUNCTION get_next_sunday(input_date date)
RETURNS date AS $$
BEGIN
  -- Add days until we reach Sunday (ISO DOW 0)
  RETURN input_date + ((7 - EXTRACT(DOW FROM input_date))::integer % 7)::integer;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get next Monday
CREATE OR REPLACE FUNCTION get_next_monday(input_date date)
RETURNS date AS $$
BEGIN
  -- Add days until we reach Monday (ISO DOW 1)
  RETURN input_date + ((8 - EXTRACT(DOW FROM input_date))::integer % 7 + 1)::integer;
END;
$$ LANGUAGE plpgsql;

-- Function to force contract renewal
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

  -- Update contract
  UPDATE contracts
  SET
    start_date = v_start_date,
    end_date = v_end_date,
    due_date = v_due_date,
    total_amount = v_total_amount,
    payment_status = 'pending',
    updated_at = now()
  WHERE id = p_contract_id;

  -- Update vehicle status to ensure it stays as rented
  UPDATE vehicles
  SET status = 'rented'
  WHERE id = v_contract.vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;