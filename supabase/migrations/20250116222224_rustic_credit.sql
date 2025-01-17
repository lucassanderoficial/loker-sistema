/*
  # Add transaction status

  1. New Fields
    - Add status field to track payment status
    - Add payment_date field to track when payment was made

  2. Changes
    - Add constraint to ensure valid status values
    - Add function to handle payment status updates
*/

-- Add status and payment_date fields
ALTER TABLE financial_transactions
  ADD COLUMN payment_status text DEFAULT 'pending',
  ADD COLUMN payment_date date;

-- Add constraint for valid status values
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_payment_status CHECK (
    payment_status IN ('pending', 'paid', 'overdue')
  );

-- Create function to update payment status
CREATE OR REPLACE FUNCTION update_transaction_payment_status(
  p_transaction_id uuid,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
  UPDATE financial_transactions
  SET 
    payment_status = 'paid',
    payment_date = p_payment_date
  WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;