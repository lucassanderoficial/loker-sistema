-- Update maintenance payment handling
CREATE OR REPLACE FUNCTION handle_maintenance_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create financial transaction if paid by company
  IF NEW.paid_by = 'company' AND NEW.payment_status = 'paid' THEN
    -- Check if transaction already exists
    IF NOT EXISTS (
      SELECT 1 
      FROM financial_transactions 
      WHERE description = 'Manutenção - ' || NEW.description
      AND vehicle_id = NEW.vehicle_id
    ) THEN
      -- Create expense transaction
      INSERT INTO financial_transactions (
        type,
        category,
        amount,
        description,
        date,
        vehicle_id,
        payment_status,
        payment_date,
        created_by
      ) VALUES (
        'expense',
        'maintenance',
        NEW.amount,
        'Manutenção - ' || NEW.description,
        NEW.payment_date,
        NEW.vehicle_id,
        'paid',
        NEW.payment_date,
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for maintenance payments
DROP TRIGGER IF EXISTS handle_maintenance_payment_trigger ON maintenance;
CREATE TRIGGER handle_maintenance_payment_trigger
  AFTER INSERT OR UPDATE ON maintenance
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION handle_maintenance_payment();