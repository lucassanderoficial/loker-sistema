/*
  # Create investors module

  1. New Tables
    - `investors`
      - `id` (uuid, primary key)
      - `type` (enum: 'individual' or 'business')
      - `name` (text)
      - `document` (text) - CPF or CNPJ
      - `email` (text)
      - `phone` (text)
      - `commission_rate` (decimal)
      - `cep` (text)
      - `street` (text)
      - `number` (text)
      - `complement` (text)
      - `neighborhood` (text)
      - `city` (text)
      - `state` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key)
      
  2. Security
    - Enable RLS on `investors` table
    - Add policies for CRUD operations
*/

-- Create type for investor
CREATE TYPE investor_type AS ENUM ('individual', 'business');

-- Create investors table
CREATE TABLE investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type investor_type NOT NULL,
  name text NOT NULL,
  document text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  commission_rate decimal(5,2) NOT NULL,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  UNIQUE(document)
);

-- Enable RLS
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all investors" ON investors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create investors" ON investors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own investors" ON investors
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investors" ON investors
  FOR DELETE TO authenticated USING (auth.uid() = user_id);