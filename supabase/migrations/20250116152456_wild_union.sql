/*
  # Update franchises table

  1. Changes
    - Add email field for franchise login
*/

-- Add email field to franchises table
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS email text NOT NULL UNIQUE;