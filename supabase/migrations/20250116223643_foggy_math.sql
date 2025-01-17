/*
  # Update financial transactions constraints

  1. Changes
    - Remove strict client_id constraint
    - Add more flexible constraint for income transactions
*/

-- Drop existing constraint
ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS valid_client_id;

-- Add more flexible constraint
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_client_id CHECK (
    type = 'expense' OR
    (type = 'income' AND client_id IS NOT NULL)
  );