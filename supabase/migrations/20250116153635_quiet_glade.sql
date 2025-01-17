/*
  # Fix investor deletion cascade

  1. Changes
    - Add ON DELETE CASCADE to user_id foreign key
    - This ensures when a user is deleted, their investor record is also removed

  2. Security
    - Maintains existing RLS policies
    - Adds referential integrity
*/

-- First remove the existing foreign key
ALTER TABLE investors 
  DROP CONSTRAINT IF EXISTS investors_user_id_fkey;

-- Re-add with CASCADE
ALTER TABLE investors
  ADD CONSTRAINT investors_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;