-- Add client_id column to financial_transactions
ALTER TABLE financial_transactions
  ADD COLUMN client_id uuid REFERENCES clients(id);

-- Add constraint to ensure client_id is set for income transactions
ALTER TABLE financial_transactions
  ADD CONSTRAINT valid_client_id CHECK (
    (type = 'expense' AND client_id IS NULL) OR
    (type = 'income' AND client_id IS NOT NULL)
  );

-- Update views to include client information
CREATE OR REPLACE VIEW monthly_financial_summary AS
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
    v.model,
    c.name as client_name,
    c.document as client_document
  FROM financial_transactions ft
  LEFT JOIN vehicles v ON v.id = ft.vehicle_id
  LEFT JOIN clients c ON c.id = ft.client_id
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
      END,
      'client', CASE
        WHEN client_name IS NOT NULL THEN json_build_object('name', client_name, 'document', client_document)
        ELSE NULL
      END
    )
  ) as transactions
FROM monthly_transactions
GROUP BY month, type, category
ORDER BY month DESC, type, category;