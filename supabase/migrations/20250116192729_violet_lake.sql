/*
  # Contract Payments Schema Update

  1. Tables
    - Create contract_payments table for payment records
    - Add payment_method to contract_actions
  
  2. Views
    - Create contract_history view to provide a unified view of payments
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS contract_payments CASCADE;
DROP TABLE IF EXISTS contract_history CASCADE;

-- Create contract payments table
CREATE TABLE contract_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  payment_method text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE contract_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "contract_payments_read_access"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contract_payments_insert_access"
  ON contract_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add payment_method to contract_actions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'contract_actions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE contract_actions ADD COLUMN payment_method text;
  END IF;
END $$;

-- Create or replace the payment action handler
CREATE OR REPLACE FUNCTION handle_payment_action()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'payment' THEN
    -- Record payment in contract_payments
    INSERT INTO contract_payments (
      contract_id,
      amount,
      payment_date,
      payment_method,
      period_start,
      period_end,
      created_by
    )
    SELECT
      NEW.contract_id,
      NEW.amount,
      NEW.payment_date,
      COALESCE(NEW.payment_method, 'other'),
      c.start_date,
      c.end_date,
      NEW.created_by
    FROM contracts c
    WHERE c.id = NEW.contract_id;

    -- Update contract payment status
    UPDATE contracts
    SET 
      payment_status = 'paid',
      payment_date = NEW.payment_date
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment actions if not exists
DROP TRIGGER IF EXISTS handle_payment_action_trigger ON contract_actions;
CREATE TRIGGER handle_payment_action_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'payment')
  EXECUTE FUNCTION handle_payment_action();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_payments_contract_id 
  ON contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_payment_date 
  ON contract_payments(payment_date);

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
  cp.created_at
FROM contract_payments cp;