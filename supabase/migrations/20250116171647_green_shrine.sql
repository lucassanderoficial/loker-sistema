/*
  # Create contracts schema

  1. New Types
    - contract_status: Status do contrato (active, finished, cancelled)
    - payment_status: Status do pagamento (pending, paid, overdue, cancelled)

  2. New Tables
    - contracts: Contratos de locação
    - contract_renewals: Histórico de renovações

  3. Security
    - Enable RLS on both tables
    - Policies for authenticated users
*/

-- Create contract status enum
CREATE TYPE contract_status AS ENUM (
  'active',      -- Contrato ativo
  'finished',    -- Contrato encerrado
  'cancelled'    -- Contrato cancelado
);

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',     -- Pagamento pendente
  'paid',        -- Pago
  'overdue',     -- Atrasado
  'cancelled'    -- Cancelado
);

-- Create contracts table
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) NOT NULL,
  deposit_id uuid REFERENCES deposits(id),
  
  -- Contract details
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renew boolean DEFAULT false,
  daily_rate decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  
  -- Payment information
  payment_status payment_status DEFAULT 'pending',
  payment_date date,
  due_date date NOT NULL,
  
  -- Status
  status contract_status DEFAULT 'active',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_amounts CHECK (daily_rate > 0 AND total_amount > 0)
);

-- Create contract renewals table
CREATE TABLE contract_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  
  -- Renewal period
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Payment information
  amount decimal(10,2) NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  payment_date date,
  due_date date NOT NULL,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_renewal_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_renewal_amount CHECK (amount > 0)
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_renewals ENABLE ROW LEVEL SECURITY;

-- Create policies for contracts
CREATE POLICY "Enable read access for authenticated users"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON contracts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users"
  ON contracts FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for contract renewals
CREATE POLICY "Enable read access for authenticated users"
  ON contract_renewals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON contract_renewals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON contract_renewals FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for contracts
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_updated_at();

-- Create function to get next monday
CREATE OR REPLACE FUNCTION get_next_monday(input_date date)
RETURNS date AS $$
BEGIN
  -- Add days until we reach Monday (ISO DOW 1)
  RETURN input_date + ((8 - EXTRACT(DOW FROM input_date))::integer % 7 + 1)::integer;
END;
$$ LANGUAGE plpgsql;