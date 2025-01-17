/*
  # Fix Financial Transactions Constraints

  1. Changes
    - Update valid_recurrence constraint to handle recurring transactions without end date
    - Remove recurrence_end_date validation since it's optional
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing constraints
ALTER TABLE financial_transactions 
  DROP CONSTRAINT IF EXISTS valid_recurrence,
  DROP CONSTRAINT IF EXISTS valid_recurrence_dates;

-- Add improved constraint that only validates recurrence type
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_recurrence CHECK (
    (NOT is_recurring AND recurrence_type = 'none') OR
    (is_recurring AND recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly'))
  );