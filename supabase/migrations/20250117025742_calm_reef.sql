/*
  # Create maintenance table

  1. New Tables
    - `maintenance`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `description` (text)
      - `amount` (decimal)
      - `payment_status` (enum: pending, paid, overdue)
      - `payment_method` (text)
      - `payment_date` (date)
      - `paid_by` (enum: company, investor)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `maintenance` table
    - Add policies for authenticated users
*/

-- Create payment status enum if not exists
DO $$ BEGIN
  CREATE TYPE maintenance_payment_status AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create paid by enum if not exists
DO $$ BEGIN
  CREATE TYPE maintenance_paid_by AS ENUM ('company', 'investor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create maintenance table
CREATE TABLE maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_status maintenance_payment_status NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_date date,
  paid_by maintenance_paid_by NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_date CHECK (
    payment_date IS NULL OR 
    payment_date >= CURRENT_DATE
  ),
  CONSTRAINT valid_payment_method CHECK (
    (payment_status = 'paid' AND payment_method IS NOT NULL) OR
    (payment_status != 'paid' AND payment_method IS NULL)
  )
);

-- Enable RLS
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "maintenance_read"
  ON maintenance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "maintenance_insert"
  ON maintenance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "maintenance_update"
  ON maintenance FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "maintenance_delete"
  ON maintenance FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_payment_status ON maintenance(payment_status);
CREATE INDEX idx_maintenance_created_at ON maintenance(created_at);