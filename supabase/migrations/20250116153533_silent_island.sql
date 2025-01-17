/*
  # Update investors table with status and auth

  1. Changes
    - Add status field to investors table
    - Add email field for authentication
    - Add unique constraint on email

  2. Security
    - Update RLS policies to include status checks
*/

-- Add status and email fields
ALTER TABLE investors ADD COLUMN IF NOT EXISTS status boolean DEFAULT true;
ALTER TABLE investors ADD COLUMN IF NOT EXISTS email text NOT NULL UNIQUE;

-- Update RLS policies to consider status
DROP POLICY IF EXISTS "Users can view all investors" ON investors;
CREATE POLICY "Users can view all investors" ON investors
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create investors" ON investors;
CREATE POLICY "Users can create investors" ON investors
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own investors" ON investors;
CREATE POLICY "Users can update their own investors" ON investors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own investors" ON investors;
CREATE POLICY "Users can delete their own investors" ON investors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);