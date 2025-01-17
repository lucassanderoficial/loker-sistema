/*
  # Update financial transactions and contract payments

  1. Changes
    - Remove strict client_id constraint
    - Add more flexible constraint for income transactions
    - Update contract payment handler to include client_id
*/

-- Drop existing constraint
ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS valid_client_id;

-- Add more flexible constraint
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_client_id CHECK (
    type = 'expense' OR client_id IS NOT NULL
  );

-- Update contract payment handler to include client_id
CREATE OR REPLACE FUNCTION handle_contract_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'payment' THEN
    -- Create income transaction
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      contract_id,
      client_id,
      created_by
    )
    SELECT
      'income',
      'rent',
      NEW.amount,
      'Pagamento de contrato - ' || v.plate || ' - ' || c.start_date || ' até ' || c.end_date,
      NEW.payment_date,
      c.vehicle_id,
      c.id,
      c.client_id,
      NEW.created_by
    FROM contracts c
    JOIN vehicles v ON v.id = c.vehicle_id
    WHERE c.id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;