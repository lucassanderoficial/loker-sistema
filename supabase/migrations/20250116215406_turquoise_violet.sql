-- Add status field to track transaction processing
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create function to process recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS void AS $$
DECLARE
  v_transaction record;
  v_next_date date;
BEGIN
  -- Process only active recurring transactions
  FOR v_transaction IN
    SELECT *
    FROM financial_transactions
    WHERE is_recurring = true
    AND status = 'active'
    AND parent_transaction_id IS NULL
  LOOP
    -- Calculate next transaction date based on recurrence type
    CASE v_transaction.recurrence_type
      WHEN 'daily' THEN
        v_next_date := v_transaction.date + INTERVAL '1 day';
      WHEN 'weekly' THEN
        v_next_date := v_transaction.date + INTERVAL '1 week';
      WHEN 'monthly' THEN
        v_next_date := v_transaction.date + INTERVAL '1 month';
      WHEN 'yearly' THEN
        v_next_date := v_transaction.date + INTERVAL '1 year';
      ELSE
        CONTINUE;
    END CASE;

    -- Check if we should continue processing
    IF v_transaction.recurrence_end_date IS NOT NULL AND v_next_date > v_transaction.recurrence_end_date THEN
      -- Mark transaction as completed
      UPDATE financial_transactions
      SET status = 'completed'
      WHERE id = v_transaction.id;
      CONTINUE;
    END IF;

    -- Create new transaction
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      contract_id,
      deposit_id,
      is_recurring,
      recurrence_type,
      recurrence_end_date,
      parent_transaction_id,
      created_by,
      status
    ) VALUES (
      v_transaction.type,
      v_transaction.category,
      v_transaction.amount,
      v_transaction.description || ' (Recorrente)',
      v_next_date,
      v_transaction.vehicle_id,
      v_transaction.contract_id,
      v_transaction.deposit_id,
      true,
      v_transaction.recurrence_type,
      v_transaction.recurrence_end_date,
      v_transaction.id,
      v_transaction.created_by,
      'active'
    );

    -- Update parent transaction date
    UPDATE financial_transactions
    SET date = v_next_date
    WHERE id = v_transaction.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to manually trigger recurring transaction processing
CREATE OR REPLACE FUNCTION trigger_recurring_transactions()
RETURNS void AS $$
BEGIN
  -- Process recurring transactions
  PERFORM process_recurring_transactions();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;