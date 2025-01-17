-- Create contract payment history table
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

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON contract_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON contract_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update contract_actions to record payment history
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

-- Create trigger for payment actions
DROP TRIGGER IF EXISTS handle_payment_action_trigger ON contract_actions;
CREATE TRIGGER handle_payment_action_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'payment')
  EXECUTE FUNCTION handle_payment_action();

-- Add payment_method to contract_actions
ALTER TABLE contract_actions 
  ADD COLUMN IF NOT EXISTS payment_method text;