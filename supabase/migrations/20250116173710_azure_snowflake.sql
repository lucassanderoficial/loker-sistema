/*
  # Contract Actions and Caution Return

  1. New Tables
    - `contract_actions` - Stores contract actions like payments and vehicle replacements
    - `caution_returns` - Manages caution return scheduling and processing

  2. New Enums
    - `contract_action_type` - Types of actions that can be performed on contracts
    - `caution_return_status` - Status of caution return process

  3. Changes
    - Add return_period to contracts table
    - Add functions for contract actions
    - Add triggers for status updates
*/

-- Create contract action type enum
CREATE TYPE contract_action_type AS ENUM (
  'payment',           -- Payment for the contract
  'vehicle_replace',   -- Vehicle replacement
  'contract_cancel'    -- Contract cancellation
);

-- Create caution return status enum
CREATE TYPE caution_return_status AS ENUM (
  'scheduled',    -- Return is scheduled
  'processing',   -- Return is being processed
  'completed',    -- Return has been completed
  'cancelled'     -- Return was cancelled
);

-- Create caution return period enum
CREATE TYPE caution_return_period AS ENUM (
  '30',   -- 30 days
  '60',   -- 60 days
  '90',   -- 90 days
  '120'   -- 120 days
);

-- Add return period to contracts
ALTER TABLE contracts
  ADD COLUMN return_period caution_return_period;

-- Create contract actions table
CREATE TABLE contract_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  action_type contract_action_type NOT NULL,
  
  -- Payment specific fields
  amount decimal(10,2),
  payment_date date,
  
  -- Vehicle replacement specific fields
  old_vehicle_id uuid REFERENCES vehicles(id),
  new_vehicle_id uuid REFERENCES vehicles(id),
  replacement_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Ensure proper data based on action type
  CONSTRAINT valid_payment_data CHECK (
    action_type != 'payment' OR (
      amount IS NOT NULL AND
      payment_date IS NOT NULL AND
      old_vehicle_id IS NULL AND
      new_vehicle_id IS NULL AND
      replacement_reason IS NULL
    )
  ),
  CONSTRAINT valid_replacement_data CHECK (
    action_type != 'vehicle_replace' OR (
      amount IS NULL AND
      payment_date IS NULL AND
      old_vehicle_id IS NOT NULL AND
      new_vehicle_id IS NOT NULL AND
      replacement_reason IS NOT NULL
    )
  )
);

-- Create caution returns table
CREATE TABLE caution_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  initial_amount decimal(10,2) NOT NULL,
  current_amount decimal(10,2) NOT NULL,
  scheduled_date date NOT NULL,
  status caution_return_status DEFAULT 'scheduled' NOT NULL,
  completed_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  CONSTRAINT valid_amounts CHECK (
    initial_amount >= 0 AND
    current_amount >= 0
  ),
  CONSTRAINT valid_dates CHECK (
    completed_date IS NULL OR
    completed_date >= scheduled_date
  )
);

-- Enable RLS
ALTER TABLE contract_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE caution_returns ENABLE ROW LEVEL SECURITY;

-- Create policies for contract actions
CREATE POLICY "Enable read access for authenticated users"
  ON contract_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON contract_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for caution returns
CREATE POLICY "Enable read access for authenticated users"
  ON caution_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON caution_returns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON caution_returns FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to handle contract cancellation
CREATE OR REPLACE FUNCTION handle_contract_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle status to available
  UPDATE vehicles
  SET status = 'available'
  WHERE id = (
    SELECT vehicle_id
    FROM contracts
    WHERE id = NEW.contract_id
  );
  
  -- Update contract status
  UPDATE contracts
  SET status = 'cancelled'
  WHERE id = NEW.contract_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle vehicle replacement
CREATE OR REPLACE FUNCTION handle_vehicle_replacement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'vehicle_replace' THEN
    -- Update old vehicle status to available
    UPDATE vehicles
    SET status = 'available'
    WHERE id = NEW.old_vehicle_id;
    
    -- Update new vehicle status to rented
    UPDATE vehicles
    SET status = 'rented'
    WHERE id = NEW.new_vehicle_id;
    
    -- Update contract with new vehicle
    UPDATE contracts
    SET vehicle_id = NEW.new_vehicle_id
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle payment status
CREATE OR REPLACE FUNCTION handle_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'payment' THEN
    UPDATE contracts
    SET 
      payment_status = 'paid',
      payment_date = NEW.payment_date
    WHERE id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update caution return updated_at
CREATE OR REPLACE FUNCTION update_caution_return_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER handle_contract_cancellation_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'contract_cancel')
  EXECUTE FUNCTION handle_contract_cancellation();

CREATE TRIGGER handle_vehicle_replacement_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'vehicle_replace')
  EXECUTE FUNCTION handle_vehicle_replacement();

CREATE TRIGGER handle_payment_status_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'payment')
  EXECUTE FUNCTION handle_payment_status();

CREATE TRIGGER update_caution_returns_updated_at
  BEFORE UPDATE ON caution_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_caution_return_updated_at();

-- Create function to schedule caution return
CREATE OR REPLACE FUNCTION schedule_caution_return(
  p_contract_id uuid,
  p_return_period caution_return_period
)
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_deposit_amount decimal(10,2);
  v_scheduled_date date;
  v_return_id uuid;
BEGIN
  -- Get client ID and deposit amount
  SELECT 
    c.client_id,
    d.amount
  INTO 
    v_client_id,
    v_deposit_amount
  FROM contracts c
  JOIN deposits d ON d.id = c.deposit_id
  WHERE c.id = p_contract_id;
  
  -- Calculate scheduled date
  v_scheduled_date := current_date + (p_return_period::integer || ' days')::interval;
  
  -- Create caution return record
  INSERT INTO caution_returns (
    contract_id,
    client_id,
    initial_amount,
    current_amount,
    scheduled_date,
    created_by
  ) VALUES (
    p_contract_id,
    v_client_id,
    v_deposit_amount,
    v_deposit_amount,
    v_scheduled_date,
    auth.uid()
  )
  RETURNING id INTO v_return_id;
  
  -- Update contract
  UPDATE contracts
  SET 
    return_period = p_return_period,
    status = 'finished'
  WHERE id = p_contract_id;
  
  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql;