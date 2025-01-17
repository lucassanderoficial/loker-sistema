/*
  # Fix Financial Transactions Constraints

  1. Changes
    - Update valid_recurrence constraint to properly handle recurring transactions
    - Add check for recurrence_end_date
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing constraint
ALTER TABLE financial_transactions 
  DROP CONSTRAINT IF EXISTS valid_recurrence;

-- Add improved constraint
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_recurrence CHECK (
    (NOT is_recurring AND recurrence_type = 'none') OR
    (is_recurring AND recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly'))
  );

-- Add constraint for recurrence end date
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_recurrence_dates CHECK (
    recurrence_end_date IS NULL OR
    recurrence_end_date > date
  );