/*
  # Create contract renewal function

  1. Function
    - Processes automatic contract renewals
    - Creates new renewal records
    - Updates contract dates
    - Handles payment status

  2. Trigger
    - Runs daily to check for contracts that need renewal
*/

-- Create function to process contract renewals
CREATE OR REPLACE FUNCTION process_contract_renewals()
RETURNS void AS $$
DECLARE
  contract_record RECORD;
  next_monday DATE;
  system_user uuid;
BEGIN
  -- Get system user ID (first admin user)
  SELECT id INTO system_user
  FROM auth.users
  WHERE raw_user_meta_data->>'role' = 'admin'
  LIMIT 1;

  -- Get next Monday
  next_monday := (current_date + ((8 - EXTRACT(DOW FROM current_date))::integer % 7 + 1)::integer);

  -- Process contracts that need renewal
  FOR contract_record IN
    SELECT *
    FROM contracts
    WHERE status = 'active'
      AND auto_renew = true
      AND end_date = current_date
  LOOP
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
      contract_record.id,
      next_monday,
      next_monday + 6, -- End date is next Sunday
      contract_record.daily_rate * 7, -- 7 days
      'pending',
      next_monday, -- Due date is Monday
      system_user
    );

    -- Update contract dates
    UPDATE contracts
    SET
      end_date = next_monday + 6,
      due_date = next_monday,
      payment_status = 'pending',
      updated_at = now()
    WHERE id = contract_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;