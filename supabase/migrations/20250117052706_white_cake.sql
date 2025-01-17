-- Create document templates table
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "document_templates_read"
  ON document_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "document_templates_insert"
  ON document_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "document_templates_update"
  ON document_templates FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "document_templates_delete"
  ON document_templates FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();