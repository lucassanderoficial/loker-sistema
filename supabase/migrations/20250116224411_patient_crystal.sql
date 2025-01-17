/*
  # Add Traffic Fines Module

  1. New Tables
    - `traffic_fines`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, references vehicles)
      - `client_id` (uuid, references clients)
      - `fine_date` (date)
      - `amount` (decimal)
      - `description` (text)
      - `payment_status` (enum: pending, paid)
      - `payment_date` (date)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `traffic_fines` table
    - Add policies for authenticated users

  3. Functions
    - Add function to handle fine payment
*/

-- Create payment status enum
CREATE TYPE fine_payment_status AS ENUM (
  'pending',
  'paid'
);

-- Create traffic fines table
CREATE TABLE traffic_fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  fine_date date NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  payment_status fine_payment_status DEFAULT 'pending',
  payment_date date,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Constraints
  CONSTRAINT positive_fine_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_date CHECK (
    payment_date IS NULL OR 
    payment_date >= fine_date
  )
);

-- Enable RLS
ALTER TABLE traffic_fines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "traffic_fines_read"
  ON traffic_fines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "traffic_fines_insert"
  ON traffic_fines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "traffic_fines_update"
  ON traffic_fines FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "traffic_fines_delete"
  ON traffic_fines FOR DELETE
  TO authenticated
  USING (true);

-- Create function to handle fine payment
CREATE OR REPLACE FUNCTION pay_traffic_fine(
  p_fine_id uuid,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_fine record;
BEGIN
  -- Get fine details
  SELECT * INTO v_fine
  FROM traffic_fines
  WHERE id = p_fine_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Multa não encontrada';
  END IF;

  IF v_fine.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Multa já está paga';
  END IF;

  -- Begin transaction
  BEGIN
    -- Update fine status
    UPDATE traffic_fines
    SET 
      payment_status = 'paid',
      payment_date = p_payment_date
    WHERE id = p_fine_id;

    -- Create financial transaction
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      client_id,
      payment_status,
      payment_date,
      created_by
    ) VALUES (
      'income',
      'other',
      v_fine.amount,
      'Pagamento de multa - ' || v_fine.description,
      p_payment_date,
      v_fine.vehicle_id,
      v_fine.client_id,
      'paid',
      p_payment_date,
      v_fine.created_by
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;