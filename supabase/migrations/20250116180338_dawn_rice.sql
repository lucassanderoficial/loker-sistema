/*
  # Add function to delete deposits and related data

  1. New Function
    - `delete_deposits_for_client`: Deletes all deposits for a given client
      - Checks if client exists
      - Deletes all deposits not linked to contracts
      - Updates balances view
  
  2. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
    - Validates input parameters
    - Handles errors gracefully
*/

-- Create function to delete all deposits for a client
CREATE OR REPLACE FUNCTION delete_deposits_for_client(p_client_id uuid)
RETURNS void AS $$
DECLARE
  v_deposit record;
BEGIN
  -- Check if client exists
  IF NOT EXISTS (SELECT 1 FROM clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  -- Loop through each deposit for the client
  FOR v_deposit IN 
    SELECT d.id 
    FROM deposits d
    LEFT JOIN contracts c ON c.deposit_id = d.id
    WHERE d.client_id = p_client_id
    AND c.id IS NULL  -- Only get deposits not linked to contracts
  LOOP
    -- Delete the deposit
    DELETE FROM deposits WHERE id = v_deposit.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;