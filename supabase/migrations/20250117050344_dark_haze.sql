-- Drop existing trigger
DROP TRIGGER IF EXISTS handle_contract_payment_trigger ON contract_actions;
DROP FUNCTION IF EXISTS handle_contract_payment();

-- Create improved function to handle contract payments
CREATE OR REPLACE FUNCTION handle_contract_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'payment' THEN
    -- Create income transaction with paid status
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      contract_id,
      client_id,
      payment_status,
      payment_date,
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
      'paid',
      NEW.payment_date,
      NEW.created_by
    FROM contracts c
    JOIN vehicles v ON v.id = c.vehicle_id
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
CREATE TRIGGER handle_contract_payment_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'payment')
  EXECUTE FUNCTION handle_contract_payment();