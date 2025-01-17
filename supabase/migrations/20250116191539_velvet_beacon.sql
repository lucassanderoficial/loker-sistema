/*
  # Add contract history and financial tracking

  1. New Tables
    - contract_history: Tracks all contract periods and payments
    - contract_financial_summary: View for contract financial details

  2. Changes
    - Add functions to manage contract history
    - Add view for financial summaries
*/

-- Create contract history table
CREATE TABLE contract_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  daily_rate decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_date date,
  payment_method text,
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON contract_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON contract_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create view for contract financial summary
CREATE OR REPLACE VIEW contract_financial_summary AS
SELECT 
  c.id as contract_id,
  c.client_id,
  cl.name as client_name,
  v.plate as vehicle_plate,
  v.brand as vehicle_brand,
  v.model as vehicle_model,
  c.start_date as contract_start,
  c.end_date as contract_end,
  c.auto_renew,
  c.status as contract_status,
  COUNT(ch.id) as total_periods,
  SUM(ch.total_amount) as total_amount,
  SUM(CASE WHEN ch.payment_status = 'paid' THEN ch.total_amount ELSE 0 END) as total_paid,
  SUM(CASE WHEN ch.payment_status = 'pending' THEN ch.total_amount ELSE 0 END) as total_pending,
  SUM(CASE WHEN ch.payment_status = 'overdue' THEN ch.total_amount ELSE 0 END) as total_overdue,
  json_agg(json_build_object(
    'period_start', ch.start_date,
    'period_end', ch.end_date,
    'amount', ch.total_amount,
    'status', ch.payment_status,
    'payment_date', ch.payment_date,
    'payment_method', ch.payment_method,
    'due_date', ch.due_date
  ) ORDER BY ch.start_date) as periods
FROM contracts c
JOIN clients cl ON c.client_id = cl.id
JOIN vehicles v ON c.vehicle_id = v.id
LEFT JOIN contract_history ch ON c.id = ch.contract_id
GROUP BY c.id, c.client_id, cl.name, v.plate, v.brand, v.model;

-- Update force_contract_renewal function to record history
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

  -- Create history record
  INSERT INTO contract_history (
    contract_id,
    start_date,
    end_date,
    daily_rate,
    total_amount,
    payment_status,
    due_date,
    created_by
  ) VALUES (
    p_contract_id,
    v_start_date,
    v_end_date,
    v_contract.daily_rate,
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
    status = 'active',
    updated_at = now()
  WHERE id = p_contract_id;

  -- Update vehicle status
  UPDATE vehicles
  SET status = 'rented'
  WHERE id = v_contract.vehicle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;