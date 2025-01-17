/*
  # Add caution archive functionality

  1. Changes
    - Add archived field to deposits table
    - Add function to archive deposits
    - Add function to restore archived deposits

  2. Security
    - Maintain RLS policies
    - Add validation to prevent archiving active deposits
*/

-- Add archived field to deposits
ALTER TABLE deposits
  ADD COLUMN archived boolean DEFAULT false;

-- Create function to archive deposit
CREATE OR REPLACE FUNCTION archive_deposit(p_deposit_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if deposit exists
  IF NOT EXISTS (SELECT 1 FROM deposits WHERE id = p_deposit_id) THEN
    RAISE EXCEPTION 'Caução não encontrada.';
  END IF;

  -- Check if deposit is linked to an active contract
  IF EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE c.deposit_id = p_deposit_id
    AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Não é possível arquivar uma caução vinculada a um contrato ativo.';
  END IF;

  -- Archive the deposit
  UPDATE deposits
  SET archived = true
  WHERE id = p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore archived deposit
CREATE OR REPLACE FUNCTION restore_deposit(p_deposit_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if deposit exists
  IF NOT EXISTS (SELECT 1 FROM deposits WHERE id = p_deposit_id) THEN
    RAISE EXCEPTION 'Caução não encontrada.';
  END IF;

  -- Restore the deposit
  UPDATE deposits
  SET archived = false
  WHERE id = p_deposit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;