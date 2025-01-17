/*
  # Create clients table and related schemas

  1. New Tables
    - `clients`
      - Basic information (name, type, document, etc)
      - Contact information (email, phone)
      - Address information
      - Driver's license information
      - Personal information (marital status, occupation)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create client type enum
CREATE TYPE client_type AS ENUM (
  'individual',
  'business'
);

-- Create marital status enum
CREATE TYPE marital_status AS ENUM (
  'single',
  'married',
  'divorced',
  'widowed',
  'separated'
);

-- Create clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type client_type NOT NULL,
  status boolean NOT NULL DEFAULT true,
  
  -- Basic information
  name text NOT NULL,
  document text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  
  -- Address
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  
  -- Driver's license (CNH)
  cnh_number text,
  cnh_category text,
  cnh_expiration_date date,
  
  -- Personal information
  marital_status marital_status,
  occupation text,
  
  -- Business specific
  business_name text, -- Nome Fantasia (only for business)
  business_contact_name text, -- Nome do responsável (only for business)
  business_contact_phone text, -- Telefone do responsável (only for business)
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_document UNIQUE(document),
  CONSTRAINT unique_email UNIQUE(email),
  CONSTRAINT unique_cnh_number UNIQUE(cnh_number)
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();