/*
  # Criar sistema de caução

  1. Novas Tabelas
    - `deposits`
      - `id` (uuid, chave primária)
      - `client_id` (uuid, referência para clients)
      - `type` (enum: credit/debit)
      - `amount` (decimal)
      - `description` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, referência para auth.users)

  2. Segurança
    - Habilitar RLS na tabela deposits
    - Adicionar políticas para controle de acesso
*/

-- Create deposit type enum
CREATE TYPE deposit_type AS ENUM ('credit', 'debit');

-- Create deposits table
CREATE TABLE deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type deposit_type NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON deposits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON deposits FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create view for deposit balances
CREATE VIEW deposit_balances AS
SELECT 
  client_id,
  SUM(
    CASE 
      WHEN type = 'credit' THEN amount
      WHEN type = 'debit' THEN -amount
    END
  ) as balance
FROM deposits
GROUP BY client_id;