/*
  # Financial Module Setup

  1. New Types
    - transaction_type: For income/expense classification
    - transaction_category: For categorizing transactions
    - recurrence_type: For recurring transaction patterns

  2. New Tables
    - financial_transactions: Main table for all financial records
    
  3. Views
    - vehicle_financial_summary: Per-vehicle financial metrics
    - monthly_financial_summary: Monthly financial reports
    
  4. Functions
    - handle_contract_payment: Automatically creates income records from contract payments
    - process_recurring_transactions: Handles recurring transaction creation
*/

-- Create transaction type enum
CREATE TYPE transaction_type AS ENUM (
  'income',
  'expense'
);

-- Create transaction category enum
CREATE TYPE transaction_category AS ENUM (
  'rent',           -- Rental income
  'deposit',        -- Deposit payments
  'maintenance',    -- Vehicle maintenance
  'insurance',      -- Insurance payments
  'tax',           -- Taxes
  'fuel',          -- Fuel expenses
  'commission',     -- Commission payments
  'other'          -- Other expenses/income
);

-- Create recurrence type enum
CREATE TYPE recurrence_type AS ENUM (
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

-- Create financial transactions table
CREATE TABLE financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  
  -- Related entities
  vehicle_id uuid REFERENCES vehicles(id),
  contract_id uuid REFERENCES contracts(id),
  deposit_id uuid REFERENCES deposits(id),
  
  -- Recurrence
  is_recurring boolean DEFAULT false,
  recurrence_type recurrence_type DEFAULT 'none',
  recurrence_end_date date,
  parent_transaction_id uuid REFERENCES financial_transactions(id),
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Constraints
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_recurrence CHECK (
    (is_recurring = false AND recurrence_type = 'none' AND recurrence_end_date IS NULL) OR
    (is_recurring = true AND recurrence_type != 'none')
  )
);

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users"
  ON financial_transactions FOR DELETE
  TO authenticated
  USING (true);

-- Create view for vehicle financial summary
CREATE VIEW vehicle_financial_summary AS
WITH transaction_categories AS (
  SELECT 
    vehicle_id,
    category,
    SUM(amount) as total_amount
  FROM financial_transactions
  GROUP BY vehicle_id, category
)
SELECT 
  v.id as vehicle_id,
  v.plate,
  v.brand,
  v.model,
  v.year,
  v.category,
  v.daily_rate,
  COUNT(DISTINCT c.id) as total_contracts,
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE -ft.amount END), 0) as net_amount,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'category', tc.category,
          'total_amount', tc.total_amount
        )
      )
      FROM transaction_categories tc
      WHERE tc.vehicle_id = v.id
    ),
    '[]'::json
  ) as transactions_by_category
FROM vehicles v
LEFT JOIN contracts c ON c.vehicle_id = v.id
LEFT JOIN financial_transactions ft ON ft.vehicle_id = v.id
GROUP BY v.id, v.plate, v.brand, v.model, v.year, v.category, v.daily_rate;

-- Create view for monthly financial summary
CREATE VIEW monthly_financial_summary AS
WITH monthly_transactions AS (
  SELECT 
    DATE_TRUNC('month', ft.date) as month,
    ft.type,
    ft.category,
    ft.id,
    ft.description,
    ft.amount,
    ft.date,
    v.plate,
    v.brand,
    v.model
  FROM financial_transactions ft
  LEFT JOIN vehicles v ON v.id = ft.vehicle_id
)
SELECT 
  month,
  type,
  category,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  json_agg(
    json_build_object(
      'id', id,
      'description', description,
      'amount', amount,
      'date', date,
      'vehicle', CASE 
        WHEN plate IS NOT NULL THEN json_build_object('plate', plate, 'brand', brand, 'model', model)
        ELSE NULL 
      END
    )
  ) as transactions
FROM monthly_transactions
GROUP BY month, type, category
ORDER BY month DESC, type, category;

-- Create function to handle contract payments
CREATE OR REPLACE FUNCTION handle_contract_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'payment' THEN
    -- Create income transaction
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      contract_id,
      created_by
    )
    SELECT
      'income',
      'rent',
      NEW.amount,
      'Pagamento de contrato - ' || v.plate || ' - ' || c.start_date || ' até ' || c.end_date,
      NEW.payment_date,
      c.vehicle_id,
      c.id,
      NEW.created_by
    FROM contracts c
    JOIN vehicles v ON v.id = c.vehicle_id
    WHERE c.id = NEW.contract_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for contract payments
DROP TRIGGER IF EXISTS handle_contract_payment_trigger ON contract_actions;
CREATE TRIGGER handle_contract_payment_trigger
  AFTER INSERT ON contract_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'payment')
  EXECUTE FUNCTION handle_contract_payment();

-- Create function to process recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS void AS $$
DECLARE
  v_transaction record;
  v_next_date date;
BEGIN
  FOR v_transaction IN
    SELECT *
    FROM financial_transactions
    WHERE is_recurring = true
    AND (recurrence_end_date IS NULL OR recurrence_end_date >= CURRENT_DATE)
    AND parent_transaction_id IS NULL
  LOOP
    -- Calculate next transaction date based on recurrence type
    CASE v_transaction.recurrence_type
      WHEN 'daily' THEN
        v_next_date := CURRENT_DATE + INTERVAL '1 day';
      WHEN 'weekly' THEN
        v_next_date := CURRENT_DATE + INTERVAL '1 week';
      WHEN 'monthly' THEN
        v_next_date := CURRENT_DATE + INTERVAL '1 month';
      WHEN 'yearly' THEN
        v_next_date := CURRENT_DATE + INTERVAL '1 year';
      ELSE
        CONTINUE;
    END CASE;

    -- Create new transaction
    INSERT INTO financial_transactions (
      type,
      category,
      amount,
      description,
      date,
      vehicle_id,
      contract_id,
      deposit_id,
      is_recurring,
      recurrence_type,
      recurrence_end_date,
      parent_transaction_id,
      created_by
    ) VALUES (
      v_transaction.type,
      v_transaction.category,
      v_transaction.amount,
      v_transaction.description || ' (Recorrente)',
      v_next_date,
      v_transaction.vehicle_id,
      v_transaction.contract_id,
      v_transaction.deposit_id,
      true,
      v_transaction.recurrence_type,
      v_transaction.recurrence_end_date,
      v_transaction.id,
      v_transaction.created_by
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;