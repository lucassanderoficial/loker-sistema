/*
  # Create vehicles table and related structures

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `plate` (text, unique) - Placa do veículo
      - `brand` (text) - Marca
      - `model` (text) - Modelo
      - `year` (integer) - Ano
      - `color` (text) - Cor
      - `chassis` (text) - Chassi
      - `renavam` (text) - Renavam
      - `daily_rate` (decimal) - Valor da diária
      - `franchise_id` (uuid) - Referência à franquia
      - `investor_id` (uuid) - Referência ao investidor
      - `status` (enum) - Status do veículo
      - Timestamps e metadados

  2. Security
    - Enable RLS on `vehicles` table
    - Add policies for CRUD operations
*/

-- Create vehicle status enum
CREATE TYPE vehicle_status AS ENUM (
  'available',    -- Disponível
  'rented',       -- Alugado
  'maintenance',  -- Oficina
  'insurance',    -- Seguro
  'for_sale',     -- A venda
  'sold'          -- Vendido
);

-- Create vehicles table
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text UNIQUE NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  color text NOT NULL,
  chassis text UNIQUE,
  renavam text UNIQUE,
  daily_rate decimal(10,2) NOT NULL,
  franchise_id uuid REFERENCES franchises(id) NOT NULL,
  investor_id uuid REFERENCES investors(id) NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all vehicles" ON vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create vehicles" ON vehicles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update vehicles" ON vehicles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete vehicles" ON vehicles
  FOR DELETE TO authenticated USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();