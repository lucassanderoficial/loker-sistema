/*
  # Fix caution return period casting

  1. Changes
    - Fixes the casting issue with caution_return_period enum
    - Updates the schedule_caution_return function to properly handle the period
*/

-- Drop existing function
DROP FUNCTION IF EXISTS schedule_caution_return(uuid, caution_return_period);

-- Create improved function to schedule caution return
CREATE OR REPLACE FUNCTION schedule_caution_return(
  p_contract_id uuid,
  p_return_period caution_return_period
)
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_deposit_amount decimal(10,2);
  v_scheduled_date date;
  v_return_id uuid;
  v_days integer;
BEGIN
  -- Get client ID and deposit amount
  SELECT 
    c.client_id,
    d.amount
  INTO 
    v_client_id,
    v_deposit_amount
  FROM contracts c
  JOIN deposits d ON d.id = c.deposit_id
  WHERE c.id = p_contract_id;
  
  -- Convert period enum to days
  v_days := CASE p_return_period
    WHEN '30' THEN 30
    WHEN '60' THEN 60
    WHEN '90' THEN 90
    WHEN '120' THEN 120
  END;
  
  -- Calculate scheduled date
  v_scheduled_date := current_date + v_days;
  
  -- Create caution return record
  INSERT INTO caution_returns (
    contract_id,
    client_id,
    initial_amount,
    current_amount,
    scheduled_date,
    created_by
  ) VALUES (
    p_contract_id,
    v_client_id,
    v_deposit_amount,
    v_deposit_amount,
    v_scheduled_date,
    auth.uid()
  )
  RETURNING id INTO v_return_id;
  
  -- Update contract
  UPDATE contracts
  SET 
    return_period = p_return_period,
    status = 'finished'
  WHERE id = p_contract_id;
  
  -- Update vehicle status
  UPDATE vehicles
  SET status = 'available'
  WHERE id = (
    SELECT vehicle_id 
    FROM contracts 
    WHERE id = p_contract_id
  );
  
  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;