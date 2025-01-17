/*
  # Create franchises table and authentication

  1. New Tables
    - `franchises`
      - `id` (uuid, primary key)
      - `name` (text, nome da franquia)
      - `cnpj` (text, unique)
      - `royalties_rate` (decimal, taxa de royalties)
      - `cep` (text)
      - `street` (text)
      - `number` (text)
      - `complement` (text, opcional)
      - `neighborhood` (text)
      - `city` (text)
      - `state` (text)
      - `created_at` (timestamp)
      - `user_id` (uuid, referência ao usuário)

  2. Security
    - Enable RLS on `franchises` table
    - Add policies for authenticated users
*/

-- Create franchises table
CREATE TABLE IF NOT EXISTS franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text UNIQUE NOT NULL,
  royalties_rate decimal(5,2) NOT NULL,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all franchises" ON franchises
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create franchises" ON franchises
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own franchises" ON franchises
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own franchises" ON franchises
  FOR DELETE TO authenticated USING (auth.uid() = user_id);